/*globals self, caches, fetch, console */
import { MusicDB } from './musicdb.js';
import { DatabaseLoadingMessages } from './actions.js';
import './abortcontroller-polyfill-light.js';

let loadingController;

self.addEventListener('message', function(event) {
  console.log('Loading Worker Handling message event:', event);
  let resumeInfo = null;
  switch (event.data.action) {
    case DatabaseLoadingMessages.RESUME_REFRESH_DATABASE:
      resumeInfo = event.data.payload.resumeInfo;
    /* falls through */
    case DatabaseLoadingMessages.REFRESH_DATABASE:
      if (loadingController !== undefined) {
        loadingController.abort();
      }
      loadingController = new AbortController();

      const startTime = performance.now();
      const musicdb = new MusicDB(event.data.payload.beets_url);
      const progressReporter = {
        reportProgress: progress =>
          self.postMessage({
            action: DatabaseLoadingMessages.REFRESH_DATABASE_PROGRESS_REPORT,
            payload: progress
          })
      };
      return musicdb
        .loadDatabase(
          progressReporter,
          { signal: loadingController.signal },
          resumeInfo
        )
        .then(() =>
          self.postMessage({
            action: DatabaseLoadingMessages.REFRESH_DATABASE_COMPLETED,
            payload: performance.now() - startTime
          })
        )
        .catch(e => {
          console.error(e);
          self.postMessage({
            action: DatabaseLoadingMessages.REFRESH_DATABASE_ERROR,
            payload: e
          });
        });
    default:
      console.warn('Incorrect Message Received in Loading Worker', event);
      break;
  }
});