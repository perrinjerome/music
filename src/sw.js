/*globals self, caches, fetch, console */
import { MusicDB } from './musicdb.js';
import { DatabaseLoadingMessages } from './actions.js';
import {
  APP_CACHE_NAME,
  IMAGES_CACHE_NAME,
  FLAC_WORKER_CACHE_NAME,
  urlsToCache
} from './swConstants.js';

self.addEventListener('activate', event => {
  var cacheWhitelist = [APP_CACHE_NAME, IMAGES_CACHE_NAME, FLAC_WORKER_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('install', event => {
  const cachesPromises = [];
  urlsToCache.forEach([cacheName, urls] => {
    return event.waitUntil(
      caches.open(cacheName).then(cache => {
        return cache.addAll(urls);
      })
    )
  });
  return Promise.all(
    urlsToCache
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        // console.log("SW: fetch serving from cache", event, response);
        return response;
      }
      if (/\/art$/.test(event.request.url)) {
        // console.log("SW: fetching image", event.request.url);
        return fetch(event.request).then(response => {
          return caches.open(IMAGES_CACHE_NAME).then(cache => {
            // console.log("SW: caching image", event.request.url);
            cache.put(event.request, response.clone());
            return response;
          });
        });
      }
      // console.log("SW: fetch cache miss, forwarding", event);
      return fetch(event.request);
    })
  );
});
