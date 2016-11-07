/*globals $:false */
/*globals console:false */
"use strict";

function MusicDB(url) {
  // this.beets_url = "http://" + host + ":" + port;
  this.beets_url = url;

  this.db_version = 48;
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
        db.deleteObjectStore("items");
      }
      if (db.objectStoreNames.contains("artists")) {
        db.deleteObjectStore("artists");
      }
      if (!db.objectStoreNames.contains("items")) {
        objectStore = db.createObjectStore(
          "items", { keyPath: "__id", autoIncrement: true });
        objectStore.createIndex("id", "id", { unique: true });
        objectStore.createIndex("album", "album", { unique: false });
        objectStore.createIndex("album_id", "album_id", { unique: false });
        objectStore.createIndex("albumartist", "albumartist", { unique: false });
      }
      if (!db.objectStoreNames.contains("albums")) {
        objectStore = db.createObjectStore(
          "albums", { keyPath: "__id", autoIncrement: true });
        objectStore.createIndex("id", "id", { unique: true });
        objectStore.createIndex("album", "album", { unique: false });
        objectStore.createIndex("albumartist", "albumartist", { unique: false });
      }
      
      // TODO: how to fail during onupgradneeded in a way that it's retried next time ?
      // ... do not do this on onupgradeneeded  !!!
      musicdb.loadDatabase().then(alert).catch(function(e){
        console.error("Failed loading database !", e);
        alert("loading failed " + e);
        event.target.transaction.abort();
        reject(e);
      });
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
      } catch (e) {
        reject(e);
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
  
  
// populate the database TODO: call back
MusicDB.prototype.loadDatabase = function() {
  console.log("loadDb");
  var musicdb = this;
  // utility for fetch
  function getJson(response) {
    return response.json();
  };
  // insert data in storeName, junk by junk
  function populateStore(storeName, data) { 
    return openDatabase(musicdb, function(db, resolve, reject) {
      function insertNext(i, store) {
        if (i === 0) {
          return resolve(null);
        }
        var req = store.add(data[i]);
        req.onsuccess = function (evt) {
          try {
            if ((i % 300) == 0) {
              // start a new transaction.
              console.log("Insertion in DB successful", i );
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
          reject( new Error("Error inserting " + JSON.stringify(data[i])
                            + "\nerror: " + e.target.error));
        }
      }
    // start inserting
    insertNext(
      data.length - 1,
      db.transaction(
        storeName,
        "readwrite"
      ).objectStore(storeName));
    });
  };
  
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
};
  
MusicDB.prototype.countAlbums = function() {
  return openDatabase(this, function(db, resolve, reject){
    var albumStore = db.transaction(
      "albums",
      "readonly"
    ).objectStore("albums");
    var req = albumStore.count();
    req.onsuccess = function() {
      resolve(this.result);
    }
    req.onerror = function(e) {
      reject(e);
    }
  });
};

// return one random album from the music db
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
        } catch (e) {
          reject(e);
        }
      }
      req.onerror = reject;
    });
  });
}
//module && module.exports = MusicDB;
