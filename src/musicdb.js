/*jshint esversion: 6 */
/*globals indexedDB, fetch, console, _ */

// helper function to open a database and make a promise.
// callback is called with db, resolve, reject
function openDatabase(musicdb, callback) {
  return new Promise(function(resolve, reject) {
    var request = indexedDB.open(musicdb.db_name, musicdb.db_version);
    request.onerror = reject;

    request.onupgradeneeded = event => {
      const db = event.target.result;

      if (db.objectStoreNames.contains('items')) {
        db.deleteObjectStore('items');
      }
      if (db.objectStoreNames.contains('albums')) {
        db.deleteObjectStore('albums');
      }
      if (db.objectStoreNames.contains('artists')) {
        db.deleteObjectStore('artists');
      }
      if (!db.objectStoreNames.contains('items')) {
        let objectStore = db.createObjectStore('items', {
          keyPath: '__id',
          autoIncrement: true
        });
        objectStore.createIndex('id', 'id', { unique: false }); // XXX ??? see 1704
        objectStore.createIndex('album', 'album', { unique: false });
        objectStore.createIndex('album_id', 'album_id', { unique: false });
        objectStore.createIndex('albumartist', 'albumartist', {
          unique: false
        });
      }
      if (!db.objectStoreNames.contains('albums')) {
        let objectStore = db.createObjectStore('albums', {
          keyPath: '__id',
          autoIncrement: true
        });
        objectStore.createIndex('id', 'id', { unique: false }); // XXX ??? see 1704
        objectStore.createIndex('album', 'album', { unique: false });
        objectStore.createIndex('albumartist', 'albumartist', {
          unique: false
        });
      }
    };

    request.onsuccess = event => callback(event.target.result, resolve, reject);
  });
}

// clear the database stores
function clearObjectStores(musicdb) {
  return openDatabase(musicdb, function(db, resolve, reject) {
    var tx = db.transaction(['items', /* 'artists', */ 'albums'], 'readwrite');
    tx.onerror = reject;
    tx.oncomplete = resolve;
    tx.objectStore('items').clear();
    tx.objectStore('albums').clear();
  });
}

class MusicDB {
  constructor(url) {
    this.beets_url = url;

    this.db_version = 49;
    this.db_name = 'beets';

    /* dynamically defined methods */
    const _countFromStore = storeName => {
      return () => {
        return openDatabase(this, (db, resolve, reject) => {
          const transaction = db.transaction(storeName, 'readonly');
          transaction.onerror = reject;
          const store = transaction.objectStore(storeName);
          const req = store.count();
          req.onsuccess = function() {
            resolve(this.result);
          };
          req.onerror = reject;
        });
      };
    };
    this.countAlbums = _countFromStore('albums');
    this.countItems = _countFromStore('items');
  }

  // returns all items from album
  getItemsFromAlbum(albumId) {
    var musicdb = this;
    return openDatabase(this, (db, resolve, reject) => {
      var albumStore = db.transaction('items', 'readonly').objectStore('items');
      var req = albumStore.index('album_id').openCursor(albumId),
        itemList = [];
      req.onerror = reject;
      req.onsuccess = function(e) {
        try {
          var cursor = e.target.result;
          if (cursor) {
            musicdb.getItemSrcUrl(cursor.value).then(url => {
              cursor.value.item_url = url;
              itemList.push(cursor.value);
            });
            return cursor.continue();
          }
          resolve(_.sortBy(itemList, ['track']).reverse());
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  // return URL for cover image data
  getAlbumCoverUrl(album) {
    return new Promise((resolve, reject) => {
      return resolve(this.beets_url + '/album/' + album.id + '/art');
    });
  }

  // return URL for audio source data
  getItemSrcUrl(item) {
    return new Promise((resolve, reject) => {
      resolve(this.beets_url + '/item/' + item.id + '/file');
    });
  }

  // refresh database from beets
  loadDatabase(progressReporter, signal) {
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
    // ( XXX but the "chunk by chunk" is not used anymore, now we insert small batches)
    function populateStore(storeName, data) {
      var nbInsertions = data.length;
      return openDatabase(musicdb, function(db, resolve, reject) {
        function insertNext(i, store) {
          if (i === -1) {
            return resolve(nbInsertions);
          }
          var req = store.add(data[i]);
          req.onsuccess = function(evt) {
            try {
              if (i > 0 && i % 200 === 0) {
                // start a new transaction.
                console.log('Insertion in ' + storeName + ' successful', i);
                insertNext(
                  i - 1,
                  db.transaction(storeName, 'readwrite').objectStore(storeName)
                );
              } else {
                insertNext(i - 1, store);
              }
            } catch (e) {
              reject(e);
            }
          };
          req.onerror = function(e) {
            reject(
              new Error(
                'Error inserting ' +
                  JSON.stringify(data[i]) +
                  '\nerror: ' +
                  e.target.error
              )
            );
          };
        }
        // start inserting
        insertNext(
          data.length - 1,
          db.transaction(storeName, 'readwrite').objectStore(storeName)
        );
      });
    }

    function fetchItems(url, nbItems, start, end, total_items) {
      // fetch from items until we get nbItems.
      let i;
      let query = '';
      for (i = start + 1; i < end; i++) {
        query = query + i + ',';
      }
      query = query + i;

      if (progressReporter) {
        progressReporter.reportProgress(
          Math.floor((total_items - nbItems) / total_items * 100, 100)
        );
      }

      if (signal && signal.aborted) {
        console.log('OK, aborted');
        return;
      }
      if (end > 100000) {
        throw new Error('Infinite loop prevented');
      }
      if (albumSet.size && (albumSet.size > 30 || nbItems === 0)) {
        // fetch albums and populate album store.

        // XXX bug: we can query and insert same album if we reset albumSet
        // in the middle of two items loading.
        let albumQuery = '';
        albumSet.forEach(album_id => {
          albumQuery = albumQuery + album_id + ',';
        });
        albumQuery.substring(0, albumQuery.length - 1);
        return fetch(url + '/album/' + albumQuery, {
          credentials: 'include',
          signal
        })
          .then(getJson)
          .then(albumResult => {
            albumSet.clear(); // reset. XXX is this race cond. safe ?
            return populateStore('albums', albumResult.albums);
          })
          .then(() => fetchItems(url, nbItems, start, end, total_items));
      }

      if (nbItems > 0) {
        return fetch(url + '/item/' + query, { credentials: 'include', signal })
          .then(getJson)
          .then(function(result) {
            result.items.forEach(item => albumSet.add(item.album_id));
            return populateStore('items', result.items);
          })
          .then(
            function(inserted) {
              // everything succeeded, fetch the next items
              return fetchItems(
                url,
                nbItems - inserted,
                end,
                end + (end - start),
                total_items
              );
            },
            function(e) {
              if (e.status !== 404) {
                throw e;
              }
              // advance
              return fetchItems(
                url,
                nbItems,
                end,
                end + (end - start),
                total_items
              );
            }
          );
      }
    }

    return clearObjectStores(musicdb)
      .then(() => {
        return fetch(musicdb.beets_url + '/stats', {
          credentials: 'include'
        }).then(getJson);
      })
      .then(stat =>
        fetchItems(musicdb.beets_url, stat.items, 0, 100, stat.items)
      );
  }

  // return a random album from the music db
  getRandomAlbum() {
    const musicdb = this;
    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return this.countAlbums().then(albumCount => {
      return openDatabase(musicdb, function(db, resolve, reject) {
        var albumStore = db
          .transaction('albums', 'readonly')
          .objectStore('albums');
        var req = albumStore.openCursor();
        var alreadyAdvanced = false;

        req.onsuccess = e => {
          try {
            var cursor = e.target.result;
            if (!alreadyAdvanced) {
              var advance = getRandomInt(0, albumCount - 1);
              alreadyAdvanced = true;
              if (advance > 0) {
                return cursor.advance(advance);
              }
            }
            if (cursor) {
              return musicdb
                .getAlbumCoverUrl(cursor.value)
                .then(function(cover_url) {
                  cursor.value.cover_url = cover_url;
                  return resolve(cursor.value);
                });
            }
            reject('Error counting albums');
          } catch (error) {
            reject(error);
          }
        };
        req.onerror = reject;
      });
    });
  }
}

export { MusicDB, openDatabase, clearObjectStores };
