/*globals self, caches, fetch, console */
import { MusicDB } from './musicdb.js';
import { DatabaseLoadingMessages } from './actions.js';

const CACHE_NAME = 'music-app-' + VERSION;
const IMAGES_CACHE_NAME = 'music-app-images';
const urlsToCache = [
  './empty.mp3',
  './',
  './worker/EmsArgs.js',
  './worker/EmsWorkerProxy.js',
  './worker/flac.data.js',
  './worker/flac.js',
  './worker/FlacEncoder.js'
];

self.addEventListener('activate', event => {
  var cacheWhitelist = [CACHE_NAME, IMAGES_CACHE_NAME];
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
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
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
