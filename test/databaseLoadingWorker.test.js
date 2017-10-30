/*globals require, global, console, window, describe, it, beforeEach */

var nock = require('nock');
//global.Worker = require('webworker-threads').Worker;

global.fetch = require('node-fetch');
global.indexedDB = require('fake-indexeddb');

import { onMessage } from '../src/databaseLoadingWorker';
import { DatabaseLoadingMessages } from '../src/actions';

//console.log('dbWorker', onMessage);

describe('Database Loading Worker', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('refreshs database in background', () => {
    global.postMessage = jest.fn();
    global.performance = { now: () => 0 };
    onMessage({
      data: {
        action: DatabaseLoadingMessages.REFRESH_DATABASE,
        payload: { beets_url: './' }
      }
    });
    expect.assertions(1);
    setTimeout(() => expect(global.postMessage).toBeCalled(), 1000);
  });
  test('aborts previous loading operation if still running', () => {
    // TODO
    expect(1).toEqual(1);
  });
});
