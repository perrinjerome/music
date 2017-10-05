/*globals require, global, console, window, describe, it, beforeEach */

import {expect, assert, fail} from "chai";
var nock = require("nock");

global.fetch = require('node-fetch');
global.window.indexedDB = require("fake-indexeddb");

import {MusicDB} from "../src/musicdb";

describe("Music Database", () => {
  describe("Basic test", () => {
    it("constructor argument is the URL of beet API", () => {
      var musicdb = new MusicDB('https://api.example.com');
      assert.isObject(musicdb);
    });

    it("Music db can be loaded", () => {
      var musicdb = new MusicDB('http://api.example.com');
      var api = nock('http://api.example.com')
      .filteringPath(/[\d,]/g, '')
      .get('/stats')
      .reply(200, {'items': 3, 'albums': 2})
      .get('/album/')
      .reply(200, {'albums': [
        {id: 1, album: "album1"},
        {id: 2, album: "album2"}
      ]})
      .get('/item/')
      .reply(200, {'items': [
        {id: 1, album_id: 1, artist: "artist1", album: "album1", title: "1"},
        {id: 2, album_id: 1, artist: "artist1", album: "album1", title: "2"},
        {id: 3, album_id: 1, artist: "artist1", album: "album2", title: "3"}
      ]});
      return musicdb.loadDatabase().then(
        () => {
          api.done();
          return musicdb
            .countAlbums().then((albumCount) => {
            return expect(albumCount).to.equals(2);
          }).then(() => {
            return musicdb.countItems().then((itemCount) => {
              return expect(itemCount).to.equals(3);
            });
          });
        });
    });
  });
});
