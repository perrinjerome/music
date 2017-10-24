/*globals require, global, console, window, describe, it, beforeEach */

import { expect, assert, fail } from 'chai';
var nock = require('nock');

global.fetch = require('node-fetch');
global.indexedDB = require('fake-indexeddb');

import { sw } from '../src/sw';
import { ServiceWorkerMessages } from '../src/actions';

describe('Service Worker', () => {
  describe('Database control', () => {
    it('refreshs database in background', () => {
      // TODO
      expect(1).to.equal(1);
    });
    it('aborts previous loading operation if still running', () => {
      // TODO
      expect(1).to.equal(1);
    });
  });
});
