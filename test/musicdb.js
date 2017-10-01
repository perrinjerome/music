import {expect} from "chai";
//import * as nock from "nock";
var nock = require("nock");
import {MusicDB} from "../public/js/musicdb";

console.log(window);

describe("Music Database", () => {
  describe("Basic test", () => {
    var api;
    beforeEach( () => {
      api = nock('https://api.example.com')
        .get('/items')
        .reply(200, {'items': 100, 'albums': 8});
    });

    it("constructor argument is the URL of beet API", () => {
      var musicdb = new MusicDB('https://api.example.com');
      assert.isObject(musicdb);
    });
    it("Music db can be refreshed", () => {
      var musicdb = new MusicDB('https://api.example.com');
      musicdb.loadDatabase().then(() => assert(api.isDone()));
    });
  });

});
