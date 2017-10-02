/*globals self, caches, fetch */
(function () {
  "use strict";
  var CACHE_NAME = 'music-app-v2';
  var urlsToCache = [
    './empty.mp3',
    './',
    './js/app.js',
    './js/musicdb.js',
    './worker/EmsArgs.js',
    './worker/EmsWorkerProxy.js',
    './worker/flac.data.js',
    './worker/flac.js',
    './worker/FlacEncoder.js'
  ];

  self.addEventListener('install', function (event) {
    // Perform install steps
    event.waitUntil(
      caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(urlsToCache);
      }));
  });

  self.addEventListener('fetch', function(event) {
    event.respondWith(
      caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
    );
  });

}());
