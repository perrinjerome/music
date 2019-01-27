const APP_CACHE_NAME = "music-app-" + VERSION;
const IMAGES_CACHE_NAME = "music-app-images-v1";
const FLAC_WORKER_CACHE_NAME = "flac-worker-v1";
const urlsToCache = {};
urlsToCache[APP_CACHE_NAME] = ["./empty.mp3", "./"];
urlsToCache[FLAC_WORKER_CACHE_NAME] = [
  "./worker/EmsArgs.js",
  "./worker/EmsWorkerProxy.js",
  "./worker/flac.data.js",
  "./worker/flac.js",
  "./worker/FlacEncoder.js"
];
export {
  APP_CACHE_NAME,
  IMAGES_CACHE_NAME,
  FLAC_WORKER_CACHE_NAME,
  urlsToCache
};
