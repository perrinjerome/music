/*globals require, global, console, window, describe, it, beforeEach */

const nock = require("nock");

global.fetch = require("node-fetch");
global.indexedDB = require("fake-indexeddb");

import { onMessage } from "../src/databaseLoadingWorker";
import { DatabaseLoadingMessages } from "../src/actions";

import { mockAPIWithTwoAlbums } from "./musicdb.fixtures";

//console.log('dbWorker', onMessage);

describe("Database Loading Worker", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test("refreshs database in background and sends progress messages", () => {
    const api = mockAPIWithTwoAlbums("https://api.example.com");
    global.postMessage = jest.fn();
    expect.assertions(2);
    return onMessage({
      data: {
        action: DatabaseLoadingMessages.REFRESH_DATABASE,
        payload: { beets_url: "https://api.example.com" }
      }
    }).then(() => {
      api.done();
      expect(global.postMessage).toBeCalledWith(
        expect.objectContaining({
          action: DatabaseLoadingMessages.REFRESH_DATABASE_PROGRESS_REPORT
        })
      );
      expect(global.postMessage).toBeCalledWith(
        expect.objectContaining({
          action: DatabaseLoadingMessages.REFRESH_DATABASE_COMPLETED
        })
      );
    });
  });

  test("aborts previous loading operation if still running", () => {
    // first we load with this not mocked url, if loading a second time with
    // the working url can succeed, it means we did not load the non mocked.
    const noApi = nock("https://url.not.mocked.com")
      .get("/stats")
      .reply(200, { items: 3, albums: 2 });
    const api = mockAPIWithTwoAlbums("https://api.example.com");

    global.postMessage = jest.fn();
    const firstLoading = onMessage({
      data: {
        action: DatabaseLoadingMessages.REFRESH_DATABASE,
        payload: { beets_url: "https://url.not.mocked.com" }
      }
    });
    const secondLoading = onMessage({
      data: {
        action: DatabaseLoadingMessages.REFRESH_DATABASE,
        payload: { beets_url: "https://api.example.com" }
      }
    });
    return Promise.all([firstLoading, secondLoading]).then(() => {
      api.done();
      noApi.done();
    });
  });
});
