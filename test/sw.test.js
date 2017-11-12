/*globals require, global, console, window, describe, it, beforeEach */
const makeServiceWorkerEnv = require('service-worker-mock');
const nock = require('nock');
global.fetch = require('node-fetch');
const URL = require('dom-urls');

import {
  APP_CACHE_NAME,
  IMAGES_CACHE_NAME,
  FLAC_WORKER_CACHE_NAME,
  urlsToCache
} from '../src/swConstants.js';
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
    return self.caches.open(IMAGES_CACHE_NAME).then(() => {
      return self
        .trigger('activate')
        .then(() =>
          expect(self.snapshot().caches[IMAGES_CACHE_NAME]).toBeTruthy()
        );
    });
  });
  test('install prefills cache', () => {
    require('../src/sw.js');
    // we cannot use node fetch + nock, because SW use relative URLs.
    const fetcher = jest.fn(() => Promise.resolve());
    global.fetch = fetcher;
    expect.assertions(4);
    return self.trigger('install').then(() => {
      expect(fetcher).toBeCalledWith('./worker/EmsArgs.js');
      expect(fetcher).toBeCalledWith('./');
      expect(self.snapshot().caches[APP_CACHE_NAME]).toBeTruthy();
      expect(self.snapshot().caches[FLAC_WORKER_CACHE_NAME]).toBeTruthy();
    });
  });

  test('fetch saves album art', () => {
    require('../src/sw.js');
    const Response = () => ({ ok: true, clone: jest.fn(() => 'response') });
    global.fetch = jest.fn(() => Promise.resolve(Response()));
    expect.assertions(2);
    return self
      .trigger('fetch', new Request('./album/123/art'))
      .then(response => {
        return self.caches
          .open(IMAGES_CACHE_NAME)
          .then(cache => cache.match(new Request('./album/123/art')))
          .then(match => expect(match).toBe('response'))
          .then(() => {
            // next request uses cache and does not cause another fetch
            return self
              .trigger('fetch', new Request('./album/123/art'))
              .then(() => expect(fetch).toHaveBeenCalledTimes(1));
          });
      });
  });

  test('fetch does not save album art on error', () => {
    require('../src/sw.js');
    const Response = () => ({ ok: false, clone: jest.fn(() => 'response') });
    global.fetch = jest.fn(() => Promise.resolve(Response()));
    expect.assertions(2);
    return self
      .trigger('fetch', new Request('./album/123/art'))
      .then(response => {
        return self.caches
          .open(IMAGES_CACHE_NAME)
          .then(cache => cache.match(new Request('./album/123/art')))
          .then(match => expect(match).toBeNull())
          .then(() => {
            // next request cause another fetch
            return self
              .trigger('fetch', new Request('./album/123/art'))
              .then(() => expect(fetch).toHaveBeenCalledTimes(2));
          });
      });
  });
});
