/*globals require, global, console, window, describe, it, beforeEach */

var nock = require('nock');

global.fetch = require('node-fetch');
global.indexedDB = require('fake-indexeddb');

import { sw } from '../src/sw';
import { DatabaseLoadingMessages } from '../src/actions';

describe('Service Worker', () => {
  /* nothing yet ... */
  test('TODO', () => {
    expect(1).toBe(1);
  });
});
