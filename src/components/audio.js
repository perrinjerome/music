// @flow

import Vue from 'vue/dist/vue.common.js';
Vue.component('audio-player', {
  template: '#audio-player-template',
  mounted: function() {
    this.decoded = {};
    this.pauseCount = 0;
    this.flacConversionWorker = new Worker('worker/EmsWorkerProxy.js');
    this.$refs.audio.src = './empty.mp3';
    this.$refs.audio.addEventListener('ended', e => this.$emit('ended'));
    // try to setup media session controls.
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('pause', _ => {
        this.pauseCount += 1;
        setTimeout(_ => {
          this.pauseCount = 0;
        }, 5000);
        if (this.pauseCount > 3) {
          console.log('cheat code, playing another album');
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

              this.flacConversionWorker.postMessage({
                command: 'encode',
                args: ['-d', item_url + '.flac'],
                outData: outData,
                fileData: fileData
              });
              this.flacConversionWorker.onmessage = e => {
                var fileName, blob, url;
                if (e.data.reply == 'done') {
                  for (fileName in e.data.values) {
                    blob = e.data.values[fileName].blob;
                    if (component.url) {
                      URL.revokeObjectURL(component.url);
                    }
                    // Are we still playing same song or was it changed ?
                    if (fileName === component.currentItem.id + '.wav') {
                      component.url = URL.createObjectURL(blob);
                      component.$refs.audio.src = component.url;
                      component.$refs.audio.play();
                    }
                  }
                }
              };
            }, console.error);
        });
      }
    }
  },
  props: ['currentItem']
});
