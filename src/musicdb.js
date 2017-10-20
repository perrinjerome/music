/*jshint esversion: 6 */
/*globals indexedDB, fetch, console, _ */
//"use strict";

function MusicDB(url) {
  this.beets_url = url;

  this.db_version = 49;
  this.db_name = "beets";
}

// helper method to open a database and make a promise.
// callback is called with db, resolve, reject
var openDatabase = function(musicdb, callback) {
  return new Promise(function(resolve, reject) {   
    var request = indexedDB.open(musicdb.db_name, musicdb.db_version);

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

// returns all items from album
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


// refresh database from beets
MusicDB.prototype.loadDatabase = function(progressReporter) {
  const musicdb = this;
  const albumSet = new Set([]);

  // utility for fetch
  function getJson(response) {
    if (!response.ok) {
      throw response;
    }
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

  function fetchItems(url, nbItems, start, end, total_items) {
    // fetch from items until we get nbItems.
    let i;
    let query = "";
    for (i = start+1; i < end; i++) {
      query = query + i + ","; 
    }
    query = query + i;

    if (progressReporter) {
      progressReporter.reportProgress(
        Math.floor((total_items - nbItems) / total_items * 100, 100));
    }

    if (end > 100000) {
      throw new Error('Infinite loop prevented');
    }
    if (albumSet.size && (albumSet.size > 30 || nbItems === 0)) {
      // fetch albums and populate album store.

      // XXX bug: we can query and insert same album if we reset albumSet
      // in the middle of two items loading.
      let albumQuery = "";
      albumSet.forEach(album_id => {albumQuery = albumQuery + album_id + ",";});
      albumQuery.substring(0, albumQuery.length - 1);
      return fetch(url + "/album/" + albumQuery, { credentials: 'include' })
        .then(getJson)
        .then((albumResult) => {
          console.log("received albums", albumResult);
          albumSet.clear(); // reset. XXX is this race cond. safe ?
          return populateStore('albums', albumResult.albums);
        }).then(() => fetchItems(url, nbItems, start, end, total_items));
    }

    if (nbItems > 0) {
      return fetch(url + "/item/" + query, { credentials: 'include' })
        .then(getJson)
        .then(function(result){
        result.items.forEach(item => albumSet.add(item.album_id));
        return populateStore('items', result.items);
      }).then(
        function (inserted) {
          // everything succeeded, fetch the next items
          return fetchItems(
            url,
            nbItems - inserted,
            end,
            end + (end - start),
            total_items);},
        function (e) {
          if (e.status !== 404) {
            throw e;
          }
          // advance
          return fetchItems(
            url,
            nbItems,
            end,
            end + (end - start),
            total_items);
        });
    }
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
  }).then(() => {
    return fetch(
      musicdb.beets_url + "/stats",
      { credentials: 'include' }
    ).then(getJson);
  }).then( 
    stat => fetchItems(
      musicdb.beets_url,
      stat.items,
      0,
      100,
      stat.items)
  );
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

export {MusicDB, openDatabase};
