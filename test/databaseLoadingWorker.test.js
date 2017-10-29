/*globals require, global, console, window, describe, it, beforeEach */

var nock = require('nock');
global.Worker = require('webworker-threads').Worker;

global.fetch = require('node-fetch');
global.indexedDB = require('fake-indexeddb');

import { databaseLoadingWorker } from '../src/databaseLoadingWorker';
import { DatabaseLoadingMessages } from '../src/actions';

console.log(databaseLoadingWorker);
describe('Database Loading Worker', () => {
  test('refreshs database in background', () => {
    // TODO
    //    const worker = new Worker('../src/databaseLoadingWorker');
    worker.onmessage = jest.fn();
    worker.postMessage({ action: DataBaseLoadingWorker.REFRESH_DATABASE });
    return expect(worker.onmessage).toBeCalledWith(2);
  });
  test('aborts previous loading operation if still running', () => {
    // TODO
    expect(1).toEqual(1);
  });
});
