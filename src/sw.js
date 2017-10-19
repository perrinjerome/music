/*globals self, caches, fetch, console */
import {MusicDB} from "./musicdb.js";
import {ServiceWorkerMessages} from './actions.js';

const CACHE_NAME = 'music-app-GIT_HASH';
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

self.addEventListener('activate', (event) => {
  console.log("activated ");
  var cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("SW: purging old cache", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


self.addEventListener('install', (event) => {
  console.log("SW: installing", event);

  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => {
      console.log("SW: adding shell to cache", cache, urlsToCache);
      return cache.addAll(urlsToCache);
    }));
});


self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
    .then((response) => {
      if (response) {
        // console.log("SW: fetch serving from cache", event, response);
        return response;
      }
      if (/\/art$/.test(event.request.url)) {
        // console.log("SW: fetching image", event.request.url);
        return fetch(event.request).then((response) => {
          return caches.open(IMAGES_CACHE_NAME).then((cache) => {
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
  self.clients.matchAll()
    .then(clients => {
    clients.forEach(client => client.postMessage({action, payload}));
  });
}

// TODO: signal previous loading of database and reset when REFRESH_DATABASE is called again
let loadingController;
try {
  loadingController = new AbortController();
} catch (e) {
  console.warn("AbortController not supported", e);
}

self.addEventListener('message', function(event) {
  console.log('SW Handling message event:', event);

  switch (event.data.action) {
    case ServiceWorkerMessages.REFRESH_DATABASE:
      console.log('SW refreshing DB with', event.data.payload.beets_url);
      const startTime = performance.now();
      const musicdb = new MusicDB(event.data.payload.beets_url);
      const progressReporter = {
        reportProgress: (storeName, progress) => broadCastMessage(
            ServiceWorkerMessages.REFRESH_DATABASE_PROGRESS_REPORT,
             {storeName, progress})
      };
      return musicdb.loadDatabase(progressReporter).then(
        () => broadCastMessage(
          ServiceWorkerMessages.REFRESH_DATABASE_COMPLETED,
          performance.now() - startTime)
      ).catch(e => {
        console.error(e); 
        throw new Error("Error loading database", e);
      });
      break;
    default:
      throw new Error("Incorrect message");
  }

});