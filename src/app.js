/*jshint esversion: 6 */
/*globals Vue, navigator, window, setTimeout, MediaMetadata, console, fetch, URL, document, confirm, alert, MusicDB, NoSleep, Worker, localStorage */
import Vue from "vue/dist/vue.common.js";
import NoSleep from "nosleep.js";
import "material-design-lite";

// import 'material-design-lite/material.css'; TODO
import dialogPolyfill from "dialog-polyfill";
import "dialog-polyfill/dialog-polyfill.css";
import "abortcontroller-polyfill";

import "material-design-lite/dist/material.indigo-deep_purple.min.css";
import "./style.css";

import { MusicDB } from "./musicdb.js";
import { DatabaseLoadingMessages } from "./actions.js";
import DatabaseLoadingWorker from "worker-loader!./databaseLoadingWorker.js";
import "./components/audio.js";

import registerServiceWorker from "service-worker-loader?filename=sw.js!./sw.js";

// import Hammer from 'hammerjs';

document.addEventListener("DOMContentLoaded", () => {
  const pages = {
    front: "front",
    play: "play",
    configure: "configure"
  };

  // app Vue instance
  const theApp = new Vue({
    data: {
      beets_url: "",
      playlist: [],
      random_albums: [],
      current_item: null,
      musicdb: null,
      current_page: null,
      loading: false,
      current_title: "Music Player"
    },

    mounted: function() {
      const app = this;
      // initialize properties
      app.beets_url =
        localStorage.getItem("beets_url") || "http://localhost:8337/";

      // utility
      app.private = {};
      app.private.snackbar = document.querySelector("#snackbar");
      app.private.dialogs = {};
      const dialogSelectors = [
        "#dialog-api-login",
        "#dialog-configure",
        "#dialog-confirm-refresh-database"
      ];
      dialogSelectors.forEach(selector => {
        let dialog = document.querySelector(selector);
        if (!dialog.showModal) {
          dialogPolyfill.registerDialog(dialog);
        }
        app.private.dialogs[selector] = dialog;
      });

      /*
      const hammer = new Hammer(document);
      hammer.on('panleft', ev => {
        app.showFrame('ALBUMS');
      });
      hammer.on('panright', ev => {
        app.showFrame('PLAYLIST');
      });
      */

      // setup routing system
      const onHashChange = () => {
        const page = window.location.hash.replace(/#\/?/, "");
        if (page.indexOf("album") === 0) {
          try {
            app.playAlbum(parseInt(page.split("/")[1], 10));
          } catch (e) {
            console.error(e);
          }
        } else {
          if (pages[page]) {
            app.current_page = page;
            window.location.hash = "";
          } else {
            app.current_page = "front";
          }
        }
      };

      window.addEventListener("hashchange", onHashChange);
      // Add event handler for first user interaction
      // On chrome mobile we can only start playing in an event handler.
      // https://bugs.chromium.org/p/chromium/issues/detail?id=138132
      const firstTouchInitializer = event => {
        document.getElementById("audio_player").play();
        document.getElementById("audio_player").pause();
        if ("wakeLock" in navigator) {
          navigator.wakeLock.request("system").then(
            () => {
              log("wake lock granted");
            },
            () => {
              log("wake lock refused");
            }
          );
        } else {
          // fallback to nosleep
          const noSleep = new NoSleep();
          noSleep.enable();
        }
        document.body.removeEventListener("click", firstTouchInitializer);
      };
      document.body.addEventListener(
        "click",
        firstTouchInitializer /*{passive: true}*/
      );

      // loading Worker
      app.private.dbLoadWorker = new DatabaseLoadingWorker();
      app.private.dbLoadWorker.addEventListener("message", event => {
        app._onDatabaseLoadingWorkerMessageReceived(
          event.data.action,
          event.data.payload
        );
      });
      // are we resuming a load ?
      if (localStorage.getItem("loadingResumeInfo")) {
        app.private.dbLoadWorker.postMessage({
          action: DatabaseLoadingMessages.RESUME_REFRESH_DATABASE,
          payload: JSON.parse(localStorage.getItem("loadingResumeInfo"))
        });
      }
      // register Service Worker
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          registerServiceWorker({ scope: "./" }).then(
            registration => {
              // Registration was successful
              log(
                "ServiceWorker registration successful with scope: ",
                registration.scope
              );

              registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === "installed") {
                    if (navigator.serviceWorker.controller) {
                      log("New content is available; please refresh.");
                      const data = {
                        message: "New version available",
                        actionHandler: () => {
                          window.location.reload();
                        },
                        actionText: "Refresh",
                        timeout: 1000000
                      };
                      app.private.snackbar.MaterialSnackbar.showSnackbar(data);
                    }
                  }
                };
              };
            },
            err => {
              log("ServiceWorker registration failed: ", err);
            }
          );
        });
      }
      // reveal
      document.body.style.display = "block";
    },

    watch: {
      beets_url: function(beets_url) {
        const app = this;
        if (beets_url) {
          // check we can access it and give a chance to login ( XXX move it to DB )
          // make a first no-cors request to check if server is up
          return fetch(beets_url + "/stats", {
            mode: "no-cors"
          })
            .then(response => {
              // if we have response, make another request with credentials to
              // check we can really access the API or if we need to login.
              fetch(beets_url + "/stats", {
                mode: "cors",
                credentials: "include"
              })
                .then(r => {
                  app.musicdb = new MusicDB(beets_url);
                  app.get4RandomAlbums(); // XXX
                })
                .catch(e => {
                  const dialog = app.private.dialogs["#dialog-api-login"];
                  // Wait for user to login in another tab and come back.
                  dialog.querySelector("a").addEventListener("click", e => {
                    const visibilityHandler = e => {
                      if (!document.hidden) {
                        // user is back ... can we access API now ?
                        fetch(beets_url + "/stats", {
                          mode: "nocors",
                          credentials: "include"
                        })
                          .then(r => {
                            // if yes, then close dialog and show albums
                            dialog.close();
                            document.removeEventListener(
                              "visibilitychange",
                              visibilityHandler
                            );
                            app.musicdb = new MusicDB(beets_url);
                            app.get4RandomAlbums(); // XXX
                          })
                          .catch(() => {
                            /*ignore*/
                          });
                      }
                    };
                    document.addEventListener(
                      "visibilitychange",
                      visibilityHandler
                    );
                  });

                  dialog.showModal();
                  dialog
                    .querySelector("button.action-cancel")
                    .addEventListener("click", () => {
                      dialog.close();
                    });
                  dialog
                    .querySelector("button.action-ok")
                    .addEventListener("click", () => {
                      dialog.close();
                    });
                });
            })
            .catch(e => {
              /* server did not reply, popup configuration dialog */
              app.current_page = "configure";
            });
        }
      },
      current_item: current_item => {
        document.title = current_item.title + " ⚡ " + current_item.artist;
      },
      current_page: function(current_page) {
        const app = this;
        // XXX
        if (current_page == "front") {
          app.current_page = null;
          return app.get4RandomAlbums();
        }
        if (current_page == "updateDb") {
          alert("update db start");
          return app.updateDb();
        }
        if (current_page == "play") {
        }
        if (current_page == "configure") {
          const dialog = app.private.dialogs["#dialog-configure"];
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
            document.querySelector("#configure_beets_url").value =
              app.beets_url;
            document.querySelector(
              "#configure_itemCount"
            ).innerText = itemCount.toString();
            document.querySelector(
              "#configure_albumCount"
            ).innerText = albumCount.toString();

            dialog.showModal();
            dialog
              .querySelector("button.action-cancel")
              .addEventListener("click", () => {
                dialog.close();
              });
            dialog
              .querySelector("button.action-ok")
              .addEventListener("click", e => {
                app.beets_url = document.querySelector(
                  "#configure_beets_url"
                ).value;
                log("updated beets_url", app.beets_url);
                localStorage.setItem("beets_url", app.beets_url);
                dialog.close();
              });
            dialog
              .querySelector("button.action-refresh-database")
              .addEventListener("click", e => {
                dialog.querySelector("button.action-ok").click();
                app.refreshDatabase();
              });
          });
        }
      }
    },

    methods: {
      back5Seconds: function() {
        document.getElementById("audio_player").currentTime -= 5;
      },
      forward5Seconds: function() {
        document.getElementById("audio_player").currentTime += 5;
      },
      showFrame: function(frame) {
        switch (frame) {
          case "PLAYLIST":
            document.querySelector(".playlist").style.display = "";
            document.querySelector(".random-albums").style.display = "none";
            break;
          case "ALBUMS":
            document.querySelector(".playlist").style.display = "none";
            document.querySelector(".random-albums").style.display = "";
            break;
          default:
            console.error("unknown frame", frame);
        }
      },
      onGlobalSearch: function(event) {
        const app = this;
        const searchString = event.target.value;
        if (app.musicdb) {
          app.musicdb.searchAlbums(searchString).then(albums => {
            app.random_albums = albums; // XXX not "random_albums"
          });
          // hide keyboard on mobile
          document.activeElement.blur();
        }
      },
      playRandomAlbum: function() {
        const app = this;
        app.musicdb.getRandomAlbum().then(album => {
          app.random_albums = [album];
          theApp.playAlbum(album.id);
        });
      },
      get4RandomAlbums: function() {
        const app = this;
        if (app.musicdb) {
          return Promise.all([
            app.musicdb.getRandomAlbum(),
            app.musicdb.getRandomAlbum(),
            app.musicdb.getRandomAlbum(),
            app.musicdb.getRandomAlbum()
          ]).then(albums => {
            app.random_albums = albums;
          });
        }
      },
      playSong: function(song) {
        this.current_item = song;
      },
      route_playAlbum: album => {
        window.location.hash = "album/" + album.id;
      },
      playAlbum: function(album_id) {
        const app = this;
        app.current_page = "playing." + album_id;
        app.musicdb.getItemsFromAlbum(album_id).then(items => {
          app.playlist = items;
          app.current_item = items[0];
        });
      },
      playNext: function() {
        const app = this;
        for (let i = 0; i < app.playlist.length - 1; i++) {
          if (app.current_item.id == app.playlist[i].id) {
            app.current_item = app.playlist[i + 1];
            return;
          }
        }
      },
      playPrevious: function() {
        const app = this;
        for (let i = 0; i < app.playlist.length - 1; i++) {
          if (app.current_item.id == app.playlist[i].id) {
            app.current_item = app.playlist[Math.max(i - 1, 0)];
            return;
          }
        }
      },
      refreshDatabase: function() {
        const app = this;
        const dialog = app.private.dialogs["#dialog-confirm-refresh-database"];
        dialog.showModal();
        dialog
          .querySelector("button.action-cancel")
          .addEventListener("click", () => {
            dialog.close();
          });
        dialog
          .querySelector("button.action-ok")
          .addEventListener("click", e => {
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
      sendMessageToDatabaseLoadingWorker: function(action, payload) {
        const app = this;
        if (true) {
          app.private.dbLoadWorker.postMessage({ action, payload });
        } else {
          console.log("no worker, refreshing in app DB with", app.beets_url);
          const startTime = new Date().getTime();
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
                new Date().getTime() - startTime
              )
            )
            .catch(e => {
              throw new Error("Error loading database " + e);
            });
        }
      },
      _onDatabaseLoadingWorkerMessageReceived: function(action, payload) {
        const app = this;
        switch (action) {
          case DatabaseLoadingMessages.REFRESH_DATABASE_PROGRESS_REPORT:
            app.loading = true;
            localStorage.setItem("loadingResumeInfo", JSON.stringify(payload));
            document
              .querySelector("#loading__progressbar")
              .MaterialProgress.setProgress(payload.progress);
            break;
          case DatabaseLoadingMessages.REFRESH_DATABASE_COMPLETED:
            const data = {
              message:
                "Finised updating in " +
                (payload / 1000).toFixed(2) +
                " seconds",
              timeout: 2000000
            };
            app.private.snackbar.MaterialSnackbar.showSnackbar(data);
            localStorage.removeItem("loadingResumeInfo");
            app.loading = false;
            break;
          case DatabaseLoadingMessages.REFRESH_DATABASE_ERROR:
            log("Error refreshing DB", payload);
            break;
          default:
            log("Unknown message received", action, payload);
            throw new Error("Unknown action");
        }
      }
    }
  });

  theApp.$mount(".player");

  // XXX from chrome samples
  function log() {
    const line = Array.prototype.slice
      .call(arguments)
      .map(function(argument) {
        if (typeof argument !== "string") argument = JSON.stringify(argument);
        return argument;
      })
      .join(" ");
    document.querySelector("#log").textContent += line + "\n";
    console.log(Array.prototype.slice.call(arguments));
  }
});
