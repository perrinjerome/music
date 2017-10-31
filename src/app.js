// @flow
/*jshint esversion: 6 */
/*globals Vue, navigator, window, setTimeout, MediaMetadata, console, fetch, URL, document, confirm, alert, MusicDB, NoSleep, Worker, localStorage, performance */
import Vue from 'vue/dist/vue.esm.js';
import NoSleep from 'nosleep.js';
import 'material-design-lite';
// import 'material-design-lite/material.css'; TODO
import dialogPolyfill from 'dialog-polyfill';
import 'dialog-polyfill/dialog-polyfill.css';
import 'abortcontroller-polyfill';

import 'material-design-lite/dist/material.indigo-deep_purple.min.css';

import './style.css';
import { MusicDB } from './musicdb.js';
import { DatabaseLoadingMessages } from './actions.js';
import DataBaseLoadingWorker from 'worker-loader!./databaseLoadingWorker.js';

import registerServiceWorker from 'service-worker-loader?filename=sw.js!./sw.js';

import Hammer from 'hammerjs';

document.addEventListener('DOMContentLoaded', () => {
  const pages = {
    front: 'front',
    play: 'play',
    configure: 'configure'
  };

  Vue.component('audio-player', {
    template: '#audio-player-template',
    mounted: function() {
      this.decoded = {};
      this.pauseCount = 0;
      this.$refs.audio.src = './empty.mp3';
      this.$refs.audio.addEventListener('ended', e => this.$emit('ended'));
      // try to setup media session controls.
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('pause', _ => {
          this.pauseCount += 1;
          setTimeout(_ => {
            this.pauseCount = 0;
          }, 5000);
          log('> User clicked "Pause" icon', this.pauseCount);
          log(this.$refs.audio.paused);
          if (this.pauseCount > 3) {
            log('cheat code, playing another album');
          }
          if (this.$refs.audio.paused) {
            this.$refs.audio.play();
          } else {
            this.$refs.audio.pause();
          }
        });

        navigator.mediaSession.setActionHandler('nexttrack', _ => {
          this.$parent.playNext();
        });

        navigator.mediaSession.setActionHandler('previoustrack', _ => {
          if (this.$refs.audio.currentTime < 3) {
            this.$parent.playPrevious();
          } else {
            this.$refs.audio.currentTime = 0;
          }
        });
      }
    },
    computed: {
      playHack: function() {
        if (this.currentItem) {
          const component = this;
          this.$parent.current_title = this.currentItem.title;
          this.$refs.audio.src = this.currentItem.item_url;
          this.$refs.audio.play().then(() => {
            if ('mediaSession' in navigator) {
              this.$parent.musicdb
                .getAlbumCoverUrl({ id: this.currentItem.album_id })
                .then(cover_url => {
                  log('cover_url', cover_url);
                  navigator.mediaSession.metadata = new MediaMetadata({
                    title: this.currentItem.title,
                    artist: this.currentItem.artist,
                    album: this.currentItem.album,
                    artwork: [
                      {
                        src: cover_url,
                        sizes: '96x96',
                        type: 'image/png'
                      },
                      {
                        src: cover_url,
                        sizes: '128x128',
                        type: 'image/png'
                      },
                      {
                        src: cover_url,
                        sizes: '192x192',
                        type: 'image/png'
                      },
                      {
                        src: cover_url,
                        sizes: '256x256',
                        type: 'image/png'
                      },
                      {
                        src: cover_url,
                        sizes: '384x384',
                        type: 'image/png'
                      },
                      {
                        src: cover_url,
                        sizes: '512x512',
                        type: 'image/png'
                      }
                    ]
                  });
                });
            }
          });
          this.$refs.audio.addEventListener('error', e => {
            /* We cannot play this source, it must be a FLAC.
               Let's try to convert it.
            */
            if (component.decoded[component.currentItem.item_url]) {
              /* we could not convert */
              console.error('already failed');
              return;
            }
            // XXX do not keep all failed, just not to retry failed forever ...
            component.decoded[component.currentItem.item_url] = 1;

            fetch(component.currentItem.item_url)
              .then(response => response.arrayBuffer())
              .then(buffer => {
                const outData = {},
                  fileData = {},
                  item_url = component.currentItem.id;
                outData[item_url + '.wav'] = { MIME: 'audio/wav' };
                fileData[item_url + '.flac'] = new Uint8Array(buffer);
                console.log(component.currentItem, outData, fileData);

                app.worker.postMessage({
                  command: 'encode',
                  args: ['-d', item_url + '.flac'],
                  outData: outData,
                  fileData: fileData
                });
                app.worker.onmessage = e => {
                  var fileName, blob, url;
                  if (e.data.reply == 'done') {
                    for (fileName in e.data.values) {
                      blob = e.data.values[fileName].blob;
                      if (0 && component.url) {
                        URL.revokeObjectURL(component.url);
                      }
                      // Are we still playing same song or was it changed ?
                      if (fileName === component.currentItem.id + '.wav') {
                        component.url = URL.createObjectURL(blob);
                        component.$refs.audio.src = component.url;
                        component.$refs.audio.play();
                      }
                    }
                  } else {
                    //console.log(e);
                  }
                };
              }, console.error);
          });
        }
      }
    },
    props: ['currentItem']
  });

  // app Vue instance
  const app = new Vue({
    data: {
      beets_url: '',
      playlist: [],
      random_albums: [],
      current_item: null,
      musicdb: null,
      current_page: null,
      loading: false,
      current_title: 'Music Player'
    },
    showFrame(frame) {
      switch (frame) {
        case 'PLAYLIST':
          document.querySelector('.playlist').style.display = '';
          document.querySelector('.random-albums').style.display = 'none';
          break;
        case 'ALBUMS':
          document.querySelector('.playlist').style.display = 'none';
          document.querySelector('.random-albums').style.display = '';
          break;
        default:
          console.error('unknown frame', frame);
      }
    },
    mounted: () => {
      // TODO function for this
      // initialize properties
      app.beets_url =
        localStorage.getItem('beets_url') || 'http://localhost:8337/';
      app.worker = new Worker('worker/EmsWorkerProxy.js');

      // utility
      app.private = {};
      app.private.snackbar = document.querySelector('#snackbar');
      app.private.dialogs = {};
      const dialogSelectors = [
        '#dialog-api-login',
        '#dialog-configure',
        '#dialog-confirm-refresh-database'
      ];
      for (var selector in dialogSelectors) {
        let dialog = document.querySelector(dialogSelectors[selector]);
        if (!dialog.showModal) {
          dialogPolyfill.registerDialog(dialog);
        }
        app.private.dialogs[dialogSelectors[selector]] = dialog;
      }

      const hammer = new Hammer(document);
      hammer.on('swipeleft', ev => {
        app.showFrame('ALBUMS');
      });
      hammer.on('swiperight', ev => {
        app.showFrame('PLAYLIST');
      });

      // setup routing system
      const onHashChange = () => {
        const page = window.location.hash.replace(/#\/?/, '');
        //console.log("onHashChange", page);
        if (page.indexOf('album') === 0) {
          //console.log("ok", page.split("/"));
          try {
            app.playAlbum(parseInt(page.split('/')[1], 10));
          } catch (e) {
            console.error(e);
          }
        } else {
          if (pages[page]) {
            //console.log("changing page to", page);
            app.current_page = page;
            window.location.hash = '';
          } else {
            app.current_page = 'front';
          }
          // app.current_page = page
        }
      };
      window.addEventListener('hashchange', onHashChange);
      // setTimeout(onHashChange, 1);

      // Add event handler for first user interaction
      // On chrome mobile we can only start playing in an event handler.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=138132
      document.body.addEventListener('click', event => {
        document.getElementById('audio_player').play();

        if ('wakeLock' in navigator) {
          navigator.wakeLock.request('system').then(
            () => {
              log('wake lock granted');
            },
            () => {
              log('wake lock refused');
            }
          );
        } else {
          // fallback to nosleep
          const noSleep = new NoSleep();
          noSleep.enable();
        }
      });

      // loading Worker
      app.private.dbLoadWorker = new DataBaseLoadingWorker();
      app.private.dbLoadWorker.addEventListener('message', event => {
        app._onDatabaseLoadingWorkerMessageReceived(
          event.data.action,
          event.data.payload
        );
      });
      // are we resuming a load
      if (localStorage.getItem('loadingResumeInfo')) {
        app.private.dbLoadWorker.postMessage({
          action: DatabaseLoadingMessages.RESUME_REFRESH_DATABASE,
          payload: JSON.parse(localStorage.getItem('loadingResumeInfo'))
        });
      }
      // register Service Worker
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          registerServiceWorker({ scope: './' }).then(
            registration => {
              // Registration was successful
              log(
                'ServiceWorker registration successful with scope: ',
                registration.scope
              );

              registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      log('New content is available; please refresh.');
                      const data = {
                        message: 'New version available',
                        actionHandler: () => {
                          window.location.reload();
                        },
                        actionText: 'Refresh',
                        timeout: 1000000
                      };
                      app.private.snackbar.MaterialSnackbar.showSnackbar(data);
                    }
                  }
                };
              };
            },
            err => {
              log('ServiceWorker registration failed: ', err);
            }
          );
        });
      }
    },

    watch: {
      beets_url: beets_url => {
        if (beets_url) {
          // check we can access it and give a chance to login ( XXX move it to DB )
          return fetch(beets_url + '/stats', {
            credentials: 'include',
            mode: 'cors'
          })
            .then(response => {
              app.musicdb = new MusicDB(beets_url);
              app.get4RandomAlbums(); // XXX
            })
            .catch(e => {
              const dialog = app.private.dialogs['#dialog-api-login'];
              dialog.showModal();
              dialog
                .querySelector('button.action-cancel')
                .addEventListener('click', () => {
                  dialog.close();
                });
              dialog
                .querySelector('button.action-ok')
                .addEventListener('click', () => {
                  dialog.close();
                });
            });
        }
      },
      current_item: current_item => {
        document.title = current_item.title + ' ⚡ ' + current_item.artist;
      },
      current_page: current_page => {
        // XXX
        if (current_page == 'front') {
          app.current_page = null;
          return app.get4RandomAlbums();
        }
        if (current_page == 'updateDb') {
          alert('update db start');
          return app.updateDb();
        }
        if (current_page == 'play') {
        }
        if (current_page == 'configure') {
          const dialog = app.private.dialogs['#dialog-configure'];
          let itemsAndAlbums = Promise.resolve([0, 0]);
          if (app.musicdb) {
            itemsAndAlbums = Promise.all([
              app.musicdb.countItems(),
              app.musicdb.countAlbums()
            ]);
          }
          itemsAndAlbums.then(([itemCount, albumCount]) => {
            // XXX this is not how to do Vue ...
            // TODO: this dialog have to be a component
            document.querySelector('#configure_beets_url').value =
              app.beets_url;
            document.querySelector(
              '#configure_itemCount'
            ).innerText = itemCount;
            document.querySelector(
              '#configure_albumCount'
            ).innerText = albumCount;

            dialog.showModal();
            dialog
              .querySelector('button.action-cancel')
              .addEventListener('click', () => {
                dialog.close();
              });
            dialog
              .querySelector('button.action-ok')
              .addEventListener('click', e => {
                app.beets_url = document.querySelector(
                  '#configure_beets_url'
                ).value;
                log('updated beets_url', app.beets_url);
                localStorage.setItem('beets_url', app.beets_url);
                dialog.close();
              });
            dialog
              .querySelector('button.action-refresh-database')
              .addEventListener('click', e => {
                dialog.querySelector('button.action-ok').click();
                app.refreshDatabase();
              });
          });
        }
      }
    },

    methods: {
      get4RandomAlbums: () => {
        const db = app.musicdb;
        if (db) {
          return Promise.all([
            db.getRandomAlbum(),
            db.getRandomAlbum(),
            db.getRandomAlbum(),
            db.getRandomAlbum()
          ]).then(albums => {
            app.random_albums = albums;
          });
        }
      },
      playSong: song => {
        app.current_item = song;
      },
      route_playAlbum: album => {
        window.location.hash = 'album/' + album.id;
      },
      playAlbum: album_id => {
        app.current_page = 'playing.' + album_id;
        app.musicdb.getItemsFromAlbum(album_id).then(items => {
          app.playlist = items;
          app.current_item = items[0];
        });
      },
      playNext: () => {
        for (var i = 0; i < app.playlist.length - 1; i++) {
          if (app.current_item.id == app.playlist[i].id) {
            app.current_item = app.playlist[i + 1];
            return;
          }
        }
      },
      playPrevious: () => {
        for (var i = 0; i < app.playlist.length - 1; i++) {
          if (app.current_item.id == app.playlist[i].id) {
            app.current_item = app.playlist[Math.max(i - 1, 0)];
            return;
          }
        }
      },
      refreshDatabase: () => {
        const dialog = app.private.dialogs['#dialog-confirm-refresh-database'];
        dialog.showModal();
        dialog
          .querySelector('button.action-cancel')
          .addEventListener('click', () => {
            dialog.close();
          });
        dialog
          .querySelector('button.action-ok')
          .addEventListener('click', e => {
            app.random_albums = [];
            app.playlist = [];
            app.loading = true;
            app.sendMessageToDatabaseLoadingWorker(
              DatabaseLoadingMessages.REFRESH_DATABASE,
              { beets_url: app.beets_url }
            );
            dialog.close();
          });
      },
      sendMessageToDatabaseLoadingWorker: (action, payload) => {
        if (true) {
          app.private.dbLoadWorker.postMessage({ action, payload });
        } else {
          console.log('no worker, refreshing in app DB with', app.beets_url);
          const startTime = performance.now();
          const progressReporter = {
            reportProgress: progress =>
              app._onDatabaseLoadingWorkerMessageReceived(
                DatabaseLoadingMessages.REFRESH_DATABASE_PROGRESS_REPORT,
                progress
              )
          };
          const controller = new AbortController();
          const signal = controller.signal;
          return app.musicdb
            .loadDatabase({ progressReporter, signal })
            .then(() =>
              app._onDatabaseLoadingWorkerMessageReceived(
                DatabaseLoadingMessages.REFRESH_DATABASE_COMPLETED,
                performance.now() - startTime
              )
            )
            .catch(e => {
              console.error(e);
              throw new Error('Error loading database', e);
            });
        }
      },
      _onDatabaseLoadingWorkerMessageReceived: (action, payload) => {
        switch (action) {
          case DatabaseLoadingMessages.REFRESH_DATABASE_PROGRESS_REPORT:
            app.loading = true;
            localStorage.setItem('loadingResumeInfo', JSON.stringify(payload));
            document
              .querySelector('#loading__progressbar')
              .MaterialProgress.setProgress(payload.progress);
            break;
          case DatabaseLoadingMessages.REFRESH_DATABASE_COMPLETED:
            const data = {
              message:
                'Finised updating in ' +
                (payload / 1000).toFixed(2) +
                ' seconds',
              timeout: 2000
            };
            app.private.snackbar.MaterialSnackbar.showSnackbar(data);
            localStorage.removeItem('loadingResumeInfo');
            app.loading = false;
            break;
          case DatabaseLoadingMessages.REFRESH_DATABASE_ERROR:
            log('Error refreshing DB', payload);
            break;
          default:
            log('Unknown message received', action, payload);
            throw new Error('Unknown action');
        }
      }
    }
  });

  app.$mount('.player');

  // XXX from chrome samples
  function log() {
    var line = Array.prototype.slice
      .call(arguments)
      .map(function(argument) {
        if (typeof argument !== 'string') argument = JSON.stringify(argument);
        return argument;
      })
      .join(' ');
    document.querySelector('#log').textContent += line + '\n';
    console.log(Array.prototype.slice.call(arguments));
  }
});
