/*jshint esversion: 6 */
/*globals window, fetch, console, _ */
//(function () {
//"use strict";

function MusicDB(url) {
  // this.beets_url = "http://" + host + ":" + port;
  this.beets_url = url;

  this.db_version = 49;
  this.db_name = "beets";
}

// helper method to open a database and make a promise.
// callback is called with db, resolve, reject
var openDatabase = function(musicdb, callback) {
  return new Promise(function(resolve, reject) {   
    var request = window.indexedDB.open(musicdb.db_name, musicdb.db_version);

    request.onerror = reject;

    request.onupgradeneeded = function (event) {
      var objectStore,
          db = event.target.result;

      if (db.objectStoreNames.contains("items")) {
        db.deleteObjectStore("items");
      }
      if (db.objectStoreNames.contains("albums")) {
        db.deleteObjectStore("albums");
      }
      if (db.objectStoreNames.contains("artists")) {
        db.deleteObjectStore("artists");
      }
      if (!db.objectStoreNames.contains("items")) {
        objectStore = db.createObjectStore(
          "items", { keyPath: "__id", autoIncrement: true });
        objectStore.createIndex("id", "id", { unique: false });  // XXX ??? see 1704 
        objectStore.createIndex("album", "album", { unique: false });
        objectStore.createIndex("album_id", "album_id", { unique: false });
        objectStore.createIndex("albumartist", "albumartist", { unique: false });
      }
      if (!db.objectStoreNames.contains("albums")) {
        objectStore = db.createObjectStore(
          "albums", { keyPath: "__id", autoIncrement: true });
        objectStore.createIndex("id", "id", { unique: false });  // XXX ??? see 1704 
        objectStore.createIndex("album", "album", { unique: false });
        objectStore.createIndex("albumartist", "albumartist", { unique: false });
      }
    };

    request.onsuccess = function (event) {
      callback(event.target.result, resolve, reject);
    };
  });
};


MusicDB.prototype.getItemsFromAlbum = function(albumId) {
  var musicdb = this;
  return openDatabase(this, function(db, resolve, reject) {
    var albumStore = db.transaction(
      "items",
      "readonly"
    ).objectStore("items");
    var req = albumStore.index("album_id").openCursor(albumId),
        itemList = [];
    req.onerror = reject;
    req.onsuccess = function(e) {
      try {
        var cursor = e.target.result;
        if (cursor) {
          musicdb.getItemSrcUrl(cursor.value).then(function(url) {
            cursor.value.item_url = url;
            itemList.push(cursor.value);
          });
          return cursor.continue();
        }
        resolve(_.sortBy(itemList, ["track"]).reverse());
      } catch (error) {
        reject(error);
      }
    };
  });
};

// return URL for cover image data
MusicDB.prototype.getAlbumCoverUrl = function(album) {
  var musicdb = this;
  return new Promise(function(resolve, reject){ 
    return resolve(musicdb.beets_url + "/album/" + album.id + "/art");
  });
};

// return URL for audio source data
MusicDB.prototype.getItemSrcUrl = function(item) {
  var musicdb = this;
  return new Promise(function(resolve, reject){
    resolve(musicdb.beets_url + "/item/" + item.id + "/file");
  });
};

MusicDB.prototype.loadDatabase = function(progressReporter) {
  return this.newloadDatabase(progressReporter);
};

MusicDB.prototype.newloadDatabase = function(progressReporter) {
  console.log("new loadDb");
  var musicdb = this;
  // utility for fetch
  function getJson(response) {
    return response.json();
  }
  // insert data in storeName, chunk by chunk
  function populateStore(storeName, data) {
    var nbInsertions = data.length;
    return openDatabase(musicdb, function(db, resolve, reject) {
      function insertNext(i, store) {
        if (i === -1) {
          return resolve(nbInsertions);
        }
        var req = store.add(data[i]);
        req.onsuccess = function (evt) {
          try {
            if ( i > 0 && (i % 200) === 0) {
              // start a new transaction.
              console.log("Insertion in " + storeName + " successful", i );
              insertNext(i-1, db.transaction(
                storeName,
                "readwrite"
              ).objectStore(storeName));
            } else {
              insertNext(i-1, store);
            }
          } catch (e) {
            reject(e);
          }
        };
        req.onerror = function(e) {
          reject( new Error("Error inserting " + JSON.stringify(data[i]) +
                            "\nerror: " + e.target.error));
        };
      }
      // start inserting
      insertNext(
        data.length - 1,
        db.transaction(
          storeName,
          "readwrite"
        ).objectStore(storeName));
    });
  }

  function fechUntil(url, storeName, nbItems, start, end, total_items) {
    // fetch until we get nbItems
    var i;
    var query = "";
    for (i = start+1; i < end; i++) {
      query = query + i + ","; 
    }
    query = query + i;
    // console.log(storeName, (total_items - nbItems) / total_items * 100);

    if (progressReporter) {
      progressReporter.reportProgress(
        storeName,
        Math.floor((total_items - nbItems) / total_items * 100, 100));
    }

    if (end > 100000) {
      throw new Error('Infinite loop prevented');
    }
    //console.log(url + query,  storeName, nbItems, start, end);
    if (nbItems > 0) {
      // console.log("not finished continuing");
      return fetch(url + query,
                   { credentials: 'include' })
        .then(getJson)
        .then(function(result){
        // console.log('received', result);
        return populateStore(storeName, result[storeName]); 
        // we use same store Name as beet key result.
      }).then(
        function (inserted) {
          // console.log(storeName, "inserted", inserted);
          // everything succeeded, fetch the next items
          return fechUntil(
            url,
            storeName,
            nbItems - inserted, //(end - start),
            end,
            end + (end - start),
            total_items);},
        function (e) {
          // TODO: only tolerate 404
          console.error('oops', e);
          // advance
          return fechUntil(
            url,
            storeName,
            nbItems,
            end,
            end + (end - start),
            total_items);
        });
    }
    console.log("finished loading", storeName);
  }

  return openDatabase(this, function(db, resolve, reject) {
    var tx = db.transaction(['items', /* 'artists', */  'albums'], 'readwrite');
    tx.onerror = reject;
    tx.oncomplete = resolve;
    function clearObjectStore(storeName) {
      return new Promise(function(resolve_, reject_) {
        var clearTransaction = tx.objectStore(storeName).clear();
        clearTransaction.onerror = reject_;
        clearTransaction.onsuccess = resolve_;
      });
    }

    return Promise.all([
      clearObjectStore('items'),
      // clearObjectStore('artists'),
      clearObjectStore('albums'),
    ]).then(resolve);
  }).then(function () {
    return fetch(
      musicdb.beets_url + "/stats",
      { credentials: 'include' }
    ).then(getJson);
  }).then( 
    function(stat) {
      return Promise.all([
        fechUntil(
          musicdb.beets_url + "/album/",
          "albums",
          stat.albums,
          0,
          50,
          stat.albums),
        fechUntil(
          musicdb.beets_url + "/item/",
          "items",
          stat.items,
          0,
          100,
          stat.items)
      ]);
    });
};

// populate the database TODO: progress callback ?
MusicDB.prototype.oldloadDatabase = function() {
  console.log("loadDb");
  var musicdb = this;
  // utility for fetch
  function getJson(response) {
    return response.json();
  }
  // insert data in storeName, junk by junk
  function populateStore(storeName, data) {
    var insertions = data.length;
    return openDatabase(musicdb, function(db, resolve, reject) {
      function insertNext(i, store) {
        if (i === 0) {
          return resolve(insertions);
        }
        var req = store.add(data[i]);
        req.onsuccess = function (evt) {
          try {
            if ((i % 300) === 0) {
              // start a new transaction.
              console.log("Insertion in " + storeName + " successful", i );
              insertNext(i-1, db.transaction(
                storeName,
                "readwrite"
              ).objectStore(storeName));
            } else {
              insertNext(i-1, store);
            }
          } catch (e) {
            reject(e);
          }
        };
        req.onerror = function(e) {
          reject( new Error("Error inserting " + JSON.stringify(data[i]) +
                            "\nerror: " + e.target.error));
        };
      }
      // start inserting
      insertNext(
        data.length - 1,
        db.transaction(
          storeName,
          "readwrite"
        ).objectStore(storeName));
    });
  }

  return openDatabase(this, function(db, resolve, reject) {
    var tx = db.transaction(['items', /* 'artists', */  'albums'], 'readwrite');
    tx.onerror = reject;
    tx.oncomplete = resolve;
    function clearObjectStore(storeName) {
      return new Promise(function(resolve_, reject_) {
        var clearTransaction = tx.objectStore(storeName).clear();
        clearTransaction.onerror = reject_;
        clearTransaction.onsuccess = resolve_;
      });
    }
    return Promise.all([
      clearObjectStore('items'),
      // clearObjectStore('artists'),
      clearObjectStore('albums'),
    ]).then(resolve) ;
  }).then(
    function() {
      return Promise.all([
        fetch(musicdb.beets_url + "/album/")
        .then(getJson)
        .then(function(result){
          return populateStore("albums", result.albums);
        }),

        fetch(musicdb.beets_url + "/item/")
        .then(getJson)
        .then(function(result){
          return populateStore("items", result.items);
        })
      ]);
    });
};

function _countFromStore(storeName) {
  return function() {
    return openDatabase(this, function(db, resolve, reject){
      var store = db.transaction(
        storeName,
        "readonly"
      ).objectStore(storeName);
      var req = store.count();
      req.onsuccess = function() {
        resolve(this.result);
      };
      req.onerror = function(e) {
        reject(e);
      };
    });
  };
}
MusicDB.prototype.countAlbums = _countFromStore("albums");
MusicDB.prototype.countItems = _countFromStore("items");

// return a random album from the music db
MusicDB.prototype.getRandomAlbum = function() {
  var musicdb = this;
  function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  return this.countAlbums().then(function(albumCount) {
    return openDatabase(musicdb, function(db, resolve, reject) {
      var albumStore = db.transaction(
        "albums",
        "readonly"
      ).objectStore("albums");
      var req = albumStore.openCursor();
      var alreadyAdvanced = false;

      req.onsuccess = function(e) {
        try {
          var cursor = e.target.result;
          if (! alreadyAdvanced ) {
            var advance = getRandomInt(0, albumCount-1);
            alreadyAdvanced = true;
            if (advance > 0) {
              return cursor.advance(advance);
            }
          }
          if (cursor) {
            return musicdb.getAlbumCoverUrl(cursor.value).then(function(cover_url) {
              cursor.value.cover_url = cover_url;
              return resolve(cursor.value);
            });
          }
          reject("Error counting albums");
        } catch (error) {
          reject(error);
        }
      };
      req.onerror = reject;
    });
  });
};

//module.exports = MusicDB;
export {MusicDB};

//})();