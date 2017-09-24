"use strict";

var pages = {
  front: "front",
  play: "play"
}

Vue.component('audio-player', {
  template: '#audio-player-template',
  mounted: function(x){
    this.decoded = {}; 
    this.$refs.audio.src = "./empty.mp3";
    this.$refs.audio.addEventListener('ended', e => this.$emit('ended'));
  },
  computed: {
    playHack: function() {
      if (this.currentItem) {
        var component = this;
        this.$refs.audio.src = this.currentItem.item_url;
        this.$refs.audio.play();
        this.$refs.audio.addEventListener ('error', function(e) {
          if (component.decoded[component.currentItem.item_url]) {
            console.error("already failed");
            return;
          }
           // XXX do not keep all failed, just not to retry failed forever ...
          component.decoded[component.currentItem.item_url] = 1;
          
          fetch(component.currentItem.item_url)
            .then(response => response.arrayBuffer())
            .then(function(buffer) {
              var outData = {},
                  fileData = {},
                  item_url = component.currentItem.id;
              outData[item_url + ".wav"] = {"MIME":"audio/wav"}
              fileData[item_url + ".flac"] = new Uint8Array(buffer);
              console.log(component.currentItem, outData, fileData);
            
              app.worker.postMessage( {
                command: 'encode',
                args: ["-d", item_url + ".flac"],
                outData: outData ,
                fileData: fileData } );
              app.worker.onmessage = function(e) {
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
var app = new Vue({
  data: {
    beets_url: '',
    playlist: [],
    random_albums: [],
    current_item: null,  
    musicdb: null,
    current_page: null,
    current_title: "ahha",
    debugzone: ""
  },
  watch: {
    beets_url: function(beets_url) {
      if (beets_url) {
        this.musicdb = new MusicDB(beets_url);
      }
    },
    current_item: function(current_item) {
      document.title = current_item.title + " ⚡ " +current_item.artist;
    },
    current_page: function(current_page) {
      console.log("current page", current_page);
      // XXX
      if (current_page == 'front') {
        this.current_page = null;
        return this.get4RandomAlbums();
      }
      if (current_page == 'updateDb') {
        alert("update db start");
        return this.updateDb();
      }
      if (current_page == 'play') {
         
      }
    } 
  },

  methods: {
    get4RandomAlbums: function () {
      var vue = this, db = this.musicdb;
      if (db) {
        Promise.all(
          [db.getRandomAlbum(), db.getRandomAlbum(), db.getRandomAlbum(), db.getRandomAlbum()]
        ).then(function(albums){
          vue.random_albums = albums;
        });
      }
    },
    playSong: function(song) {
      this.current_item = song;
    },
    route_playAlbum: function(album) {
      location.hash = "album/" + album.id;
    },
    playAlbum: function(album_id) {
      var vue = this;
      this.current_page = "playing." + album_id;
      this.musicdb.getItemsFromAlbum(album_id).then(function(items) {
        vue.playlist = items;
        vue.current_item = items[0];
      });
    },
    playNext: function() {
      for (var i=0; i<this.playlist.length - 1; i++){
        if (this.current_item.id == this.playlist[i].id) {
          this.current_item = this.playlist[i+1];
          return;
        }
      }
    },
    updateDb: function() {
      if (confirm("update db")){ 
        this.musicdb.loadDatabase()
        .then(function() {alert('fini')})
        .catch(function(e){
          console.error("Failed loading database !", e);
          alert("loading failed " + e);
        });
      }
    }
  },

})


// mount
app.$mount(".player");

// On chrome mobile we can only start playing in an event handler.
// https://bugs.chromium.org/p/chromium/issues/detail?id=138132
document.body.addEventListener('click', function(event){
  document.getElementById("audio_player").play();
  
  if ('wakeLock' in navigator) {
    navigator.wakeLock.request("system").then(
      function successFunction() {
        // success
        log('cool wakelock');
      },
      function errorFunction() {
        // error
        log("wake lock refused");
      }
    );
  } else {
    var noSleep = new NoSleep();
    noSleep.enable();
  }
});

// app.beets_url = 'https://coralgarden.my.to/beet/api' // XXX TODO save this
app.beets_url = 'https://coralgarden.hacked.jp/beet/api' // XXX TODO save this

app.worker = new Worker('worker/EmsWorkerProxy.js');

// handle routing
function onHashChange () {
  var page = window.location.hash.replace(/#\/?/, '')
  console.log("onHashChange", page);
  if (page.indexOf('album') == 0) {
    console.log("ok", page.split("/")); 
    try {
      app.playAlbum(parseInt(page.split("/")[1], 10));
    } catch (e) {
      console.error(e);
    }
    
  } else {
    if (pages[page]) {
      console.log("page", page);
      app.current_page = page
      window.location.hash = ''
    } else {
      app.current_page = 'front';
    }
    // app.current_page = page
  }
}
window.addEventListener('hashchange', onHashChange)
setTimeout(onHashChange, 1);

function log() {
      var line = Array.prototype.slice.call(arguments).map(function(argument) {
        return typeof argument === 'string' ? argument : JSON.stringify(argument);
      }).join(' ');

      document.querySelector('#log').textContent += line + '\n';
      console.log(Array.prototype.slice.call(arguments));
    }

