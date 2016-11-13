"use strict";

var pages = {
  front: "front",
  play: "play"
}

Vue.component('audio-player', {
  template: '#audio-player-template',
  mounted: function(x){
    var component = this;
    this.$refs.audio.src = "./empty.mp3";
    this.$refs.audio.addEventListener('ended', function(){ component.$emit('ended') });
  },
  computed: {
    playHack: function() {
      if (this.currentItem) {
        // XXX
        // return this.currentItem.item_url;
        this.$refs.audio.src = this.currentItem.item_url;
        this.$refs.audio.play(); 
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
      // XXX
      console.log("page", current_page);
      if (current_page == 'front') {
        return this.get4RandomAlbums();
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
    playAlbum: function(album) {
      var vue = this;
      this.musicdb.getItemsFromAlbum(album.id).then(function(items) {
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

// handle routing
function onHashChange () {
  var page = window.location.hash.replace(/#\/?/, '')
  if (pages[page]) {
    app.current_page = page
  } else {
    window.location.hash = ''
    app.current_page = 'front'
  }
}
window.addEventListener('hashchange', onHashChange)
onHashChange()


// mount
app.$mount(".player");

// On chrome mobile we can only start playing in an event handler.
// https://bugs.chromium.org/p/chromium/issues/detail?id=138132
document.body.addEventListener('click', function(event){
  document.getElementById("audio_player").play();
});

app.beets_url = 'https://coralgarden.my.to/beet/api' // XXX TODO save this
