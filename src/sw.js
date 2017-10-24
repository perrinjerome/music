/*globals self, caches, fetch, console */
import { MusicDB } from './musicdb.js';
import { ServiceWorkerMessages } from './actions.js';
import './abortcontroller-polyfill-light.js';

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
  console.log('activated ');
  var cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (
            cacheWhitelist.indexOf(cacheName) === -1 &&
            cacheWhitelist.indexOf(IMAGES_CACHE_NAME) == -1
          ) {
            console.log('SW: purging old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('install', event => {
  console.log('SW: installing', event);

  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: adding shell to cache', cache, urlsToCache);
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

function broadCastMessage(action, payload) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ action, payload }));
  });
}

let loadingController;

self.addEventListener('message', function(event) {
  console.log('SW Handling message event:', event);

  switch (event.data.action) {
    case ServiceWorkerMessages.REFRESH_DATABASE:
      if (loadingController !== undefined) {
        loadingController.abort();
      }
      loadingController = new AbortController();

      const startTime = performance.now();
      const musicdb = new MusicDB(event.data.payload.beets_url);
      const progressReporter = {
        reportProgress: progress =>
          broadCastMessage(
            ServiceWorkerMessages.REFRESH_DATABASE_PROGRESS_REPORT,
            progress
          )
      };
      return musicdb
        .loadDatabase(progressReporter, { signal: loadingController.signal })
        .then(() =>
          broadCastMessage(
            ServiceWorkerMessages.REFRESH_DATABASE_COMPLETED,
            performance.now() - startTime
          )
        )
        .catch(e => {
          console.error(e);
          broadCastMessage(ServiceWorkerMessages.REFRESH_DATABASE_ERROR, e);
        });
    default:
      console.warn('Incorrect Message Received in SW', event);
      break;
  }
});
