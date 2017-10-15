/*jshint esversion: 6 */
/*globals Vue, navigator, window, setTimeout, MediaMetadata, console, fetch, URL, document, confirm, alert, MusicDB, NoSleep, Worker, localStorage, performance */
import {_} from "lodash";
import Vue from 'vue/dist/vue.esm.js';
import NoSleep from "nosleep.js";
import 'material-design-lite';
// import 'material-design-lite/material.css'; TODO
import dialogPolyfill from "dialog-polyfill";
import 'material-design-lite/dist/material.indigo-deep_purple.min.css';

import './style.css';
import {MusicDB} from "./musicdb.js";
import registerServiceWorker from "service-worker-loader?filename=sw.js!./sw.js";

import Hammer from 'hammerjs';



document.addEventListener("DOMContentLoaded", () => {
  //"use strict";

  const pages = {
    front: "front",
    play: "play",
    configure: "configure"
  };

  Vue.component('audio-player', {
    template: '#audio-player-template',
    mounted: function () {
      this.decoded = {};
      this.pauseCount = 0;
      this.$refs.audio.src = "./empty.mp3";
      this.$refs.audio.addEventListener('ended', e => this.$emit('ended'));
      // try to setup media session controls.
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('pause', _ => {
          this.pauseCount += 1;
          setTimeout(_ => {this.pauseCount = 0;}, 5000);
          log('> User clicked "Pause" icon', this.pauseCount);
          log(this.$refs.audio.paused);
          if (this.pauseCount > 3) {
            log("cheat code, playing another album");
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
      playHack: () => {
        if (this.currentItem) {
          const component = this;
          this.$parent.current_title = this.currentItem.title;
          this.$refs.audio.src = this.currentItem.item_url;
          this.$refs.audio.play().then(
            () => {
              if ('mediaSession' in navigator) {
                this.$parent.musicdb.getAlbumCoverUrl({id: this.currentItem.album_id}).then(
                  cover_url => {
                    log("cover_url", cover_url);
                    navigator.mediaSession.metadata = new MediaMetadata({
                      title: this.currentItem.title,
                      artist: this.currentItem.artist,
                      album: this.currentItem.album,
                      artwork: [
                        { src: cover_url,
                         sizes: '96x96',
                         type: 'image/png' },
                        { src: cover_url,
                         sizes: '128x128',
                         type: 'image/png' },
                        { src: cover_url,
                         sizes: '192x192',
                         type: 'image/png' },
                        { src: cover_url,
                         sizes: '256x256',
                         type: 'image/png' },
                        { src: cover_url,
                         sizes: '384x384',
                         type: 'image/png' },
                        { src: cover_url,
                         sizes: '512x512',
                         type: 'image/png' }, ]
                    });
                  });
              }
            }
          );
          this.$refs.audio.addEventListener ('error', (e) => {
            /* We cannot play this source, it must be a FLAC.
               Let's try to convert it.
            */
            if (component.decoded[component.currentItem.item_url]) {
              /* we could not convert */
              console.error("already failed");
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
              outData[item_url + ".wav"] = {"MIME":"audio/wav"};
              fileData[item_url + ".flac"] = new Uint8Array(buffer);
              console.log(component.currentItem, outData, fileData);

              app.worker.postMessage( {
                command: 'encode',
                args: ["-d", item_url + ".flac"],
                outData: outData ,
                fileData: fileData } );
              app.worker.onmessage = e => {
                var fileName, blob, url;
                if (e.data.reply == "done") {
                  for ( fileName in e.data.values ) {
                    blob = e.data.values[fileName].blob;
                    if (0 && component.url) {
                      URL.revokeObjectURL(component.url);
                    }
                    // Are we still playing same song or was it changed ?
                    if (fileName === component.currentItem.id + ".wav") {
                      component.url = URL.createObjectURL( blob );
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
    props: ["currentItem"]
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
      current_title: "Music Player",
    },
    watch: {
      beets_url: (beets_url) => {
        if (beets_url) {
          // check we can access it and give a chance to login ( XXX move it to DB )
          return fetch(beets_url + '/stats', { credentials: 'include', mode: 'cors' })
            .then((response) => { 
            log("ok setting", this, beets_url);
            app.musicdb = new MusicDB(beets_url);
            app.get4RandomAlbums(); // XXX
          })
            .catch((e) => {
            const dialog = document.querySelector('#dialog-api-login');
            if (! dialog.showModal) {
              dialogPolyfill.registerDialog(dialog);
            }
            dialog.showModal();
            dialog.querySelector('button.action-cancel').addEventListener(
              'click', () => { dialog.close(); });
            dialog.querySelector('button.action-ok').addEventListener(
              'click', () => { dialog.close(); });
          });
        }
      },
      current_item: (current_item) => {
        document.title = current_item.title + " ⚡ " +current_item.artist;
      },
      current_page: (current_page) => {
        console.log("current page", current_page, this);
        // XXX
        if (current_page == 'front') {
          app.current_page = null;
          return app.get4RandomAlbums();
        }
        if (current_page == 'updateDb') {
          alert("update db start");
          return app.updateDb();
        }
        if (current_page == 'play') {

        }
        if (current_page == 'configure') {
          const dialog = document.querySelector('#dialog-configure');
          if (! dialog.showModal) {
            dialogPolyfill.registerDialog(dialog);
          }
          document.querySelector("#configure_beets_url").value = app.beets_url;
          dialog.showModal();
          dialog.querySelector('button.action-cancel').addEventListener(
            'click', () => { dialog.close(); });
          dialog.querySelector('button.action-ok').addEventListener(
            'click', (e) => {
              app.beets_url = document.querySelector("#configure_beets_url").value;
              log("updated beets_url", app.beets_url);
              localStorage.setItem('beets_url', app.beets_url);
              dialog.close();
            });
          dialog.querySelector('button.action-refresh-database').addEventListener(
            'click', (e) => {
              dialog.querySelector('button.action-ok').click();
              app.refreshDatabase();
            });
        }
      } 
    },

    methods: {
      init: () => {
      },
      get4RandomAlbums: () => {
        const db = app.musicdb;
        if (db) {
          Promise.all(
            [db.getRandomAlbum(), db.getRandomAlbum(), db.getRandomAlbum(), db.getRandomAlbum()]
          ).then((albums) => {
            app.random_albums = albums;
          });
        }
      },
      playSong: (song) => {
        app.current_item = song;
      },
      route_playAlbum: (album) => {
        window.location.hash = "album/" + album.id;
      },
      playAlbum: (album_id) => {
        app.current_page = "playing." + album_id;
        app.musicdb.getItemsFromAlbum(album_id).then((items) => {
          app.playlist = items;
          app.current_item = items[0];
        });
      },
      playNext: () => {
        for (var i=0; i<app.playlist.length - 1; i++){
          if (app.current_item.id == app.playlist[i].id) {
            app.current_item = app.playlist[i+1];
            return;
          }
        }
      },
      playPrevious: () => {
        for (var i=0; i<app.playlist.length - 1; i++){
          if (app.current_item.id == app.playlist[i].id) {
            app.current_item = app.playlist[Math.max(i-1, 0)];
            return;
          }
        }
      },
      refreshDatabase: () => {
        // TODO: init
        const dialog = document.querySelector('#dialog-confirm-refresh-database');
        if (! dialog.showModal) {
          dialogPolyfill.registerDialog(dialog);
        }
        dialog.showModal();
        dialog.querySelector('button.action-cancel').addEventListener(
          'click', () => { dialog.close(); });
        dialog.querySelector('button.action-ok').addEventListener(
          'click', (e) => {
            const progressReporter = {
              start: function () { this._startTime = performance.now(); },
              totalTime: function () { return performance.now() - this._startTime; },
              reportProgress: (storeName, progress) => {
                document.querySelector(
                  '#progress_bar_' + storeName
                ).MaterialProgress.setProgress(progress);
              }
            };
            app.random_albums = [];
            app.playlist = [];
            app.loading = true;
            progressReporter.start();
            app.musicdb.loadDatabase(
              progressReporter
            ).then(_ => {
              const totalTime = progressReporter.totalTime();
              app.loading = false;
              log('finish updating in ', totalTime);
              const data = {
                message: 'Finised updating in ' + (totalTime / 1000).toFixed(2) + " seconds",
                timeout: 2000,
                //   actionHandler: () => {},
                //    actionText: 'Undo'
              };
              snackbar.MaterialSnackbar.showSnackbar(data);

            }).catch(e => {
              console.error("Failed loading database !", e);
              log("loading failed " + e);
            });

            dialog.close();
          });
      }
    },
  });

  // mount
  app.$mount(".player");

  app.init();
  
  // On chrome mobile we can only start playing in an event handler.
  // https://bugs.chromium.org/p/chromium/issues/detail?id=138132
  document.body.addEventListener('click', (event) => {
    document.getElementById("audio_player").play();

    if ('wakeLock' in navigator) {
      navigator.wakeLock.request("system").then(
        () => {
          // success
          log('cool wakelock');
        },
        () => {
          // error
          log("wake lock refused");
        }
      );
    } else {
      const noSleep = new NoSleep();
      noSleep.enable();
    }
  });

  app.beets_url = localStorage.getItem('beets_url') || 'http://localhost:8337/';
  app.worker = new Worker('worker/EmsWorkerProxy.js');

  // XXX
  const snackbar = document.querySelector('#demo-snackbar-example');

  // handle routing
  const onHashChange = () => {
    var page = window.location.hash.replace(/#\/?/, '');
    console.log("onHashChange", page);
    if (page.indexOf('album') === 0) {
      console.log("ok", page.split("/")); 
      try {
        app.playAlbum(parseInt(page.split("/")[1], 10));
      } catch (e) {
        console.error(e);
      }

    } else {
      if (pages[page]) {
        console.log("changing page to", page);
        app.current_page = page;
        window.location.hash = '';
      } else {
        app.current_page = 'front';
      }
      // app.current_page = page
    }
  };
  
  window.addEventListener('hashchange', onHashChange);
  setTimeout(onHashChange, 1);

  function log() {
    var line = Array.prototype.slice.call(arguments).map(function(argument) {
      return typeof argument === 'string' ? argument : JSON.stringify(argument);
    }).join(' ');

    document.querySelector('#log').textContent += line + '\n';
    console.log(Array.prototype.slice.call(arguments));
  }

  const hammer = new Hammer(document.querySelector(".player"));
  hammer.on('panleft', (ev) => {
    document.querySelector(".playlist").style.display = "none";
    document.querySelector(".random-albums").style.display = "";
  });
  hammer.on('panright', (ev) => {
    document.querySelector(".playlist").style.display = "";
    document.querySelector(".random-albums").style.display = "none";
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      registerServiceWorker({ scope: './' })
        .then((registration) => {
        // Registration was successful
        log('ServiceWorker registration successful with scope: ', registration.scope);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                log('New content is available; please refresh.');
                var data = {
                  message: 'New version available',
                  actionHandler: () => { window.location.reload(); },
                  actionText: 'Refresh'
                };
                snackbar.MaterialSnackbar.showSnackbar(data);
              }
            }
          };
        };
      }, (err) => {
        // registration failed :(
        log('ServiceWorker registration failed: ', err);
      });
    });
  }
});
