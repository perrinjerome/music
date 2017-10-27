/*globals require, global, console, window, describe, it, beforeEach */

var nock = require('nock');

global.fetch = require('node-fetch');
global.indexedDB = require('fake-indexeddb');

import { databaseLoadingWorker } from '../src/databaseLoadingWorker';
import { DatabaseLoadingMessages } from '../src/actions';

describe('Service Worker', () => {
  describe('Database control', () => {
    test('refreshs database in background', () => {
      // TODO
      /*databaseLoadingWorker.postMessage({
        action: DatabaseLoadingMessages.REFRESH_DATABASE
      });
      */
      expect(1).toEqual(1);
    });
    test('aborts previous loading operation if still running', () => {
      // TODO
      expect(1).toEqual(1);
    });
  });
});
