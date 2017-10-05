/*globals self, caches, fetch, console */
(function () {
  "use strict";
  var CACHE_NAME = 'music-app-v4';
  var urlsToCache = [
    './empty.mp3',
    './',
    //'./js/app.js',
    //'./js/musicdb.js',
    './worker/EmsArgs.js',
    './worker/EmsWorkerProxy.js',
    './worker/flac.data.js',
    './worker/flac.js',
    './worker/FlacEncoder.js'
  ];


  self.addEventListener('activate', (event) => {
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
          console.log("SW: fetch serving from cache", event, response);
          return response;
        }
        if (/\/art$/.test(event.request.url)) {
          console.log("SW: fetching image", event.request.url);
          return fetch(event.request).then((response) => {
            return caches.open(CACHE_NAME).then((cache) => {
              console.log("SW: caching image", event.request.url);
              cache.put(event.request, response.clone());
              return response;
            });
          });
        }
        console.log("SW: fetch cache miss, forwarding", event);
        return fetch(event.request);
      })
    );
  });

}());
