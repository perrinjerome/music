/*globals self, caches, console */
(function () {
  "use strict";
  var CACHE_NAME = 'music-app-v1';
  var urlsToCache = [
    '../empty.mp3',
    '../index.html',
    '../js/app.js',
    '../js/musicdb.js',
    '../worker/EmsArgs.js',
    '../worker/EmsWorkerProxy.js',
    '../worker/flac.data.js',
    '../worker/flac.js',
    '../worker/FlacEncoder.js'
  ];

  self.addEventListener('install', function (event) {
    // Perform install steps
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then(function (cache) {
          console.log('Opened cache');
          return cache.addAll(urlsToCache);
        })
    );
  });
}());