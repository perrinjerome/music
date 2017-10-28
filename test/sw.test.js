/*globals require, global, console, window, describe, it, beforeEach */
const makeServiceWorkerEnv = require('service-worker-mock');
const nock = require('nock');
global.fetch = require('node-fetch');
const URL = require('dom-urls');

import { sw } from '../src/sw';
import { DatabaseLoadingMessages } from '../src/actions';

describe('Service Worker', () => {
  beforeEach(() => {
    Object.assign(global, makeServiceWorkerEnv());
    jest.resetModules();
  });

  test('activate clear old cache', () => {
    require('../src/sw.js');
    return self.caches.open('OLD_CACHE').then(() => {
      return self
        .trigger('activate')
        .then(() => expect(self.snapshot().caches.OLD_CACHE).toBeUndefined());
    });
  });
  test('activate keep old image cache', () => {
    require('../src/sw.js');
    return self.caches.open('music-app-images').then(() => {
      return self
        .trigger('activate')
        .then(() =>
          expect(self.snapshot().caches['music-app-images']).toBeTruthy()
        );
    });
  });
  test('install prefills cache', () => {
    require('../src/sw.js');
    // we cannot use node fetch + nock, because SW use relative URLs.
    const fetcher = jest.fn(() => Promise.resolve());
    global.fetch = fetcher;
    expect.assertions(3);
    return self.trigger('install').then(() => {
      expect(fetcher).toBeCalledWith('./worker/EmsArgs.js');
      expect(fetcher).toBeCalledWith('./');
      expect(self.snapshot().caches['music-app-' + VERSION]).toBeTruthy();
    });
  });

  test('fetch saves album art', () => {
    require('../src/sw.js');
    const Response = () => ({ clone: jest.fn(() => 'response') });
    global.fetch = jest.fn(() => Promise.resolve(Response()));
    expect.assertions(1);
    return self
      .trigger('fetch', new Request('./album/123/art'))
      .then(response => {
        return self.caches
          .open('music-app-images')
          .then(cache => cache.match(new Request('./album/123/art')))
          .then(match => expect(match).toBe('response'));
      });
  });
});
