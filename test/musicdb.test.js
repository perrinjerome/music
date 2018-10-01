/*globals require, global, console, window, describe, it, beforeEach */

const nock = require("nock");

global.fetch = require("node-fetch");
global.indexedDB = require("fake-indexeddb");

import { MusicDB, openDatabase, clearObjectStores } from "../src/musicdb";
import { DatabaseLoadingAbort } from "../src/errors";
import "../src/abortcontroller-polyfill-light";

import {
  mockAPIWithTwoAlbums,
  mockAPIWithTwoAlbumsChunkSize1
} from "./musicdb.fixtures";

describe("Music Database", () => {
  describe("Initialisation / loading tests", () => {
    let musicdb;
    beforeEach(done => {
      musicdb = new MusicDB("https://api.example.com");
      return clearObjectStores(musicdb).then(() => done());
    });
    test("constructor argument is the URL of beet API", () => {
      expect(musicdb.beets_url).toEqual("https://api.example.com");
    });

    test("musicdb can be loaded", () => {
      const api = mockAPIWithTwoAlbums("https://api.example.com");
      return musicdb.loadDatabase().then(() => {
        api.done();
        expect.assertions(2);
        return musicdb
          .countAlbums()
          .then(albumCount => {
            return expect(albumCount).toEqual(2);
          })
          .then(() => {
            return musicdb.countItems().then(itemCount => {
              return expect(itemCount).toEqual(3);
            });
          });
      });
    });

    test("reports progress during loading", () => {
      const api = mockAPIWithTwoAlbums("https://api.example.com");
      const progressReporter = {
        reportProgress: jest.fn()
      };
      expect.assertions(1);
      return musicdb.loadDatabase({ progressReporter }).then(() => {
        api.done();
        return expect(
          progressReporter.reportProgress.mock.calls.length
        ).toBeGreaterThanOrEqual(1);
      });
    });

    test("musicdb can be loaded by small chunks", () => {
      const api = mockAPIWithTwoAlbumsChunkSize1("https://api.example.com");
      return musicdb.loadDatabase({ chunkSize: 1 }).then(() => {
        api.done();
        expect.assertions(2);
        return musicdb
          .countAlbums()
          .then(albumCount => {
            return expect(albumCount).toEqual(2);
          })
          .then(() => {
            return musicdb.countItems().then(itemCount => {
              return expect(itemCount).toEqual(3);
            });
          });
      });
    });

    test("can resume loading", () => {
      const api = nock("https://api.example.com")
        .filteringPath(/[\d,]/g, "")
        .get("/album/")
        .reply(200, {
          albums: [{ id: 2, album: "album2" }]
        })
        .get("/item/")
        .reply(200, {
          items: [
            {
              id: 3,
              album_id: 2,
              albumartist: "artist1",
              album: "album2",
              title: "3"
            }
          ]
        });
      // there will be one item left
      const resumeInfo = { currentItem: 2, totalItems: 3 };
      return musicdb
        .loadDatabase({
          resumeInfo
        })
        .then(() => api.done());
    });

    test("can be aborted during loading", () => {
      const api = nock("https://api.example.com")
        .get("/stats")
        .reply(200, { items: 1, albums: 1 });

      const abortController = new AbortController();

      const load = musicdb.loadDatabase({
        signal: abortController.signal
      });
      abortController.abort();

      expect.assertions(2);
      return load.catch(e => {
        expect(api.isDone()).toBeTruthy();
        expect(e).toBeInstanceOf(DatabaseLoadingAbort);
      });
    });
  });

  describe("database tests", () => {
    let musicdb;
    beforeEach(done => {
      musicdb = new MusicDB("https://api.example.com");
      const insert = (storeName, objects) => {
        return openDatabase(musicdb, (db, resolve, reject) => {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);
          transaction.onerror = reject;
          transaction.oncomplete = () => resolve();
          objects.forEach(obj => store.add(obj));
        });
      };

      return clearObjectStores(musicdb)
        .then(() => {
          return insert("albums", [
            { id: "1", album: "album1", albumartist: "artist1" },
            { id: "2", album: "album2", albumartist: "artist2" }
          ]);
        })
        .then(() => {
          // album 1 has 2 items
          return insert("items", [
            {
              id: 1,
              album_id: "1",
              albumartist: "artist1",
              album: "album1",
              title: "title1"
            },
            {
              id: 2,
              album_id: "1",
              albumartist: "artist1",
              album: "album1",
              title: "title2"
            }
          ]);
        })
        .then(() => {
          // album 2 has 12 items
          const items = [];
          for (let i = 1; i < 13; i++) {
            items.push({
              id: i + 2,
              album_id: "2",
              albumartist: "artist2",
              album: "album2",
              title: "title" + i,
              track: i
            });
          }
          return insert("items", items);
        })
        .then(done);
    });

    test("countAlbums", () => {
      expect.assertions(1);
      return expect(musicdb.countAlbums()).resolves.toEqual(2);
    });
    test("countItems", () => {
      expect.assertions(1);
      return expect(musicdb.countItems()).resolves.toEqual(2 + 12);
    });
    test("getItemSrcUrl", () => {
      expect.assertions(1);
      return expect(musicdb.getItemSrcUrl({ id: "1" })).resolves.toEqual(
        "https://api.example.com/item/1/file"
      );
    });
    test("getAlbumCoverUrl", () => {
      expect.assertions(1);
      return expect(musicdb.getAlbumCoverUrl({ id: "1" })).resolves.toEqual(
        "https://api.example.com/album/1/art"
      );
    });
    test("getItemsFromAlbum", () => {
      expect.assertions(3);
      // XXX API of getItemsFromAlbum is different it's not {id: '1'} ...
      return musicdb.getItemsFromAlbum("1").then(items => {
        expect(items.length).toBe(2);
        expect(items).toContainEqual(
          expect.objectContaining({
            album: "album1",
            album_id: "1",
            albumartist: "artist1",
            id: 2,
            title: "title2"
          })
        );
        expect(items).toContainEqual(
          expect.objectContaining({
            album: "album1",
            album_id: "1",
            albumartist: "artist1",
            id: 2,
            title: "title2"
          })
        );
      });
    });
    test("getItemsFromAlbum contain object URL", () => {
      expect.assertions(1);
      return musicdb.getItemsFromAlbum("1").then(items => {
        expect(items).toContainEqual(
          expect.objectContaining({
            item_url: "https://api.example.com/item/2/file"
          })
        );
      });
    });
    test("getItemsFromAlbum are sorted", () => {
      expect.assertions(13);
      return musicdb.getItemsFromAlbum("2").then(items => {
        expect(items.length).toBe(12);
        expect(items[0].title).toBe("title1");
        expect(items[1].title).toBe("title2");
        expect(items[2].title).toBe("title3");
        expect(items[3].title).toBe("title4");
        expect(items[4].title).toBe("title5");
        expect(items[5].title).toBe("title6");
        expect(items[6].title).toBe("title7");
        expect(items[7].title).toBe("title8");
        expect(items[8].title).toBe("title9");
        expect(items[9].title).toBe("title10");
        expect(items[10].title).toBe("title11");
        expect(items[11].title).toBe("title12");
      });
    });
    test("getRandomAlbum", () => {
      return expect(musicdb.getRandomAlbum()).resolves.toEqual(
        expect.objectContaining({
          album: expect.anything(),
          cover_url: expect.anything()
        })
      );
    });
    test("searchAlbums", () => {
      return expect(musicdb.searchAlbums("artist1")).resolves.toEqual([
        expect.objectContaining({
          album: expect.anything(),
          cover_url: expect.anything()
        })
      ]);
    });
    test("searchAlbums partial match", () => {
      // album matches album1 and album2
      return expect(musicdb.searchAlbums("album")).resolves.toEqual([
        expect.objectContaining({
          album: expect.anything(),
          cover_url: expect.anything()
        }),
        expect.objectContaining({
          album: expect.anything(),
          cover_url: expect.anything()
        })
      ]);
    });
  });
});
