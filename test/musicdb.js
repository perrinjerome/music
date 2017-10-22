/*globals require, global, console, window, describe, it, beforeEach */

import {expect, assert, fail} from "chai";
var nock = require("nock");

global.fetch = require('node-fetch');
global.indexedDB = require("fake-indexeddb");

import {MusicDB} from '../src/musicdb';
import '../src/abortcontroller-polyfill-light.js';

describe("Music Database", () => {
  describe("Initialisation / loading tests", () => {
    it("constructor argument is the URL of beet API", () => {
      var musicdb = new MusicDB('https://api.example.com');
      assert.isObject(musicdb);
    });

    it("can be loaded", () => {
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

    it("reports progress during loading", () => {
      var musicdb = new MusicDB('http://api.example.com');
      var api = nock('http://api.example.com')
      .filteringPath(/[\d,]/g, '')
      .get('/stats')
      .reply(200, {'items': 1, 'albums': 1})
      .get('/album/')
      .reply(200, {'albums': [
        {id: 1, album: "album1"}
      ]})
      .get('/item/')
      .reply(200, {'items': [
        {id: 1, album_id: 1, artist: "artist1", album: "album1", title: "1"}
      ]});
      let progressReport = [];
      const progressReporter = {}; // TODO mock library
      progressReporter.reportProgress = () => progressReport.push(arguments);
      return musicdb.loadDatabase(progressReporter).then(() => {
        api.done();
        expect(progressReport).to.have.lengthOf.at.least(1);
      });
    });

    it("can be aborted during loading", () => {
      var musicdb = new MusicDB('http://api.example.com');
      var api = nock('http://api.example.com')
          .get('/stats')
          .reply(200, {'items': 1, 'albums': 1});

      const progressReporter = {reportProgress: () => {}};  // TODO mock library
      const abortController = new AbortController();

      const load = musicdb.loadDatabase(progressReporter, abortController.signal);
      abortController.abort();

      return load.then(() => {
        api.done();
      });
    });

  });

  describe("database tests", () => {
    var musicdb;
    beforeEach(function(done) {
      musicdb = new MusicDB("./");
    });


  });
});
