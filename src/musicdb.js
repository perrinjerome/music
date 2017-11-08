// @flow
/*jshint esversion: 6 */
/*globals indexedDB, fetch, console, _ */

import { sortBy, zip } from 'lodash';
import { DatabaseLoadingAbort } from './errors';

// helper function to open a database and make a promise.
// callback is called with db, resolve, reject
function openDatabase(musicdb, callback) {
  return new Promise((resolve, reject) => {
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
  return openDatabase(musicdb, (db, resolve, reject) => {
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
      const albumStore = db
        .transaction('items', 'readonly')
        .objectStore('items');
      const req = albumStore.index('album_id').openCursor(albumId);
      const itemList = [];

      req.onerror = reject;
      req.onsuccess = e => {
        try {
          var cursor = e.target.result;
          if (cursor) {
            itemList.push(cursor.value);
            return cursor.continue();
          }
          const getItemSrcUrlPromises = [];
          itemList.forEach(item => {
            getItemSrcUrlPromises.push(musicdb.getItemSrcUrl(item));
          });
          return Promise.all(getItemSrcUrlPromises).then(itemSrcUrls => {
            zip(itemList, itemSrcUrls).forEach(([item, srcUrl]) => {
              item.item_url = srcUrl;
            });
            resolve(
              sortBy(itemList, [
                item => item.disc,
                item => item.album, // XXX for "Take London". TODO: clean my beet database and remove this line
                item => Number(item.track)
              ])
            );
          }, reject);
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
  loadDatabase(options = {}) {
    const musicdb = this;
    let { progressReporter, signal, resumeInfo, chunkSize = 200 } = options;

    // utility for fetch
    function getJson(response) {
      if (!response.ok) {
        throw response;
      }
      return response.json();
    }

    // insert data in storeName and resolve to the number of inserted items.
    function insertInStore(storeName, data) {
      var nbInsertions = data.length;
      return openDatabase(musicdb, (db, resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        data.forEach(item => store.add(item));
        transaction.oncomplete = () => resolve(nbInsertions);
        transaction.onerror = reject;
      });
    }

    /* fetch items from API, between `start` and `end` and keep fetching
    until we have found `totalItems`. `nbItems` holds the number of items
    we have already found so far.

    Beets does not allow to get paginated results, the approach used here is to
    call /items/1,2,3,... with a sequence of incremental ids, handling 404 errors
    returned by the API and keep progressing until we have have found all items.
    */
    function fetchItems(url, nbItems, start, end, totalItems) {
      if (signal && signal.aborted) {
        throw new DatabaseLoadingAbort();
      }

      if (progressReporter) {
        progressReporter.reportProgress({
          resumeInfo: {
            totalItems: totalItems,
            currentItem: end
          },
          beets_url: url,
          progress: Math.floor((totalItems - nbItems) / totalItems * 100, 100)
        });
      }

      if (end > 100000) {
        throw new Error('Infinite loop prevented');
      }
      if (nbItems > 0) {
        let itemsQuery = '';
        for (let i = start + 1; i <= end; i++) {
          itemsQuery = itemsQuery + i + ',';
        }
        itemsQuery = itemsQuery.substring(0, itemsQuery.length - 1);
        return fetch(url + '/item/' + itemsQuery, {
          credentials: 'include',
          signal
        })
          .then(getJson)
          .then(function(result) {
            /* first, insert albums */

            const albumSet = new Set([]);
            result.items.forEach(item => albumSet.add(item.album_id));

            /* filter out albums that we already have loaded  */
            const checkAlbumExistPromises = [];
            albumSet.forEach(albumId => {
              checkAlbumExistPromises.push(
                musicdb._hasAlbum(albumId).then(hasAlbum => {
                  return hasAlbum ? null : albumId;
                })
              );
            });
            return Promise.all(checkAlbumExistPromises).then(missingAlbums => {
              /* an empty promise for the case where  we don't need to load albums */
              let insertAlbums = Promise.resolve();

              let albumQuery = '';
              missingAlbums.forEach(albumId => {
                if (albumId) albumQuery = albumQuery + albumId + ',';
              });
              albumQuery = albumQuery.substring(0, albumQuery.length - 1);
              if (albumQuery) {
                insertAlbums = fetch(url + '/album/' + albumQuery, {
                  credentials: 'include',
                  signal
                })
                  .then(getJson)
                  .then(albumResult =>
                    insertInStore('albums', albumResult.albums)
                  );
              }

              return insertAlbums.then(() =>
                insertInStore('items', result.items)
              );
            });
          })
          .then(
            function(inserted) {
              // everything succeeded, fetch the next items
              return fetchItems(
                url,
                nbItems - inserted,
                end,
                end + (end - start),
                totalItems
              );
            },
            function(e) {
              if (e.status !== 404) {
                throw e;
              }
              // There was no items in this range, advance the "cursor"
              return fetchItems(
                url,
                nbItems,
                end,
                end + (end - start),
                totalItems
              );
            }
          );
      }
    }

    if (resumeInfo) {
      return fetchItems(
        musicdb.beets_url,
        resumeInfo.totalItems - resumeInfo.currentItem,
        resumeInfo.currentItem,
        resumeInfo.currentItem + chunkSize, // XXX or save chunkSize in resume info ?
        resumeInfo.totalItems
      );
    }
    return clearObjectStores(musicdb)
      .then(() => {
        return fetch(musicdb.beets_url + '/stats', {
          credentials: 'include'
        }).then(getJson);
      })
      .then(stat =>
        fetchItems(musicdb.beets_url, stat.items, 0, chunkSize, stat.items)
      );
  }

  // search albums matching a search string
  searchAlbums(searchString) {
    const musicdb = this;
    const maxResuls = 100;
    const searchStringLower = searchString.toLowerCase();

    return openDatabase(musicdb, function(db, resolve, reject) {
      const albumStore = db
        .transaction('albums', 'readonly')
        .objectStore('albums');
      const req = albumStore.index('id').getAll();
      let i = 0;
      const results = [];
      const albumCoverPromises = [];
      req.onsuccess = () => {
        const allAlbums = req.result;
        const isMatching = (record, query) =>
          (record.albumartist &&
            record.albumartist.toLowerCase().indexOf(query) > -1) ||
          (record.album && record.album.toLowerCase().indexOf(query) > -1);
        try {
          for (i = 0; i < allAlbums.length; i++) {
            if (isMatching(allAlbums[i], searchStringLower)) {
              results.push(allAlbums[i]);
            }
            if (results.length > maxResuls) {
              break;
            }
          }
          results.forEach(album => {
            albumCoverPromises.push(
              musicdb.getAlbumCoverUrl(album).then(coverUrl => {
                album.cover_url = coverUrl;
                return album;
              })
            );
          });
          return Promise.all(albumCoverPromises).then(resultWithCovers => {
            return resolve(resultWithCovers);
          });
        } catch (error) {
          reject(error);
        }
      };
      req.onerror = reject;
    });
  }

  // return a random album from the music db
  // TODO: cleanup
  getRandomAlbum() {
    const musicdb = this;
    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return this.countAlbums().then(albumCount => {
      return openDatabase(musicdb, (db, resolve, reject) => {
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
              return musicdb.getAlbumCoverUrl(cursor.value).then(cover_url => {
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

  /* do we already have an album with this id ?
  Used during loading */
  _hasAlbum(albumId) {
    return openDatabase(this, (db, resolve, reject) => {
      const transaction = db.transaction('albums', 'readonly');
      const request = transaction
        .objectStore('albums')
        .index('id')
        .get(albumId);
      request.onsuccess = () => resolve(request.result !== undefined);
      transaction.onerror = reject;
    });
  }
}

export { MusicDB, openDatabase, clearObjectStores };
