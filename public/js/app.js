  "use strict";

var pages = {
  front: "front",
  update_db: "update_db",
  play: "play"
}

Vue.component('audio-player', {
  template: '#audio-player-template',
  mounted: function(x){
    var component = this;
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
  // app initial state
  data: {
    beets_url: '',
    playlist: [],
    random_albums: [],
    current_item: null,  
    musicdb: null,
    current_page: null
  },
  watch: {
    beets_url: function(beets_url) {
      if (beets_url) {
        console.log("be", beets_url);
        this.musicdb = new MusicDB(beets_url);
      }
    },
    current_page: function(current_page){
      // XXX
      console.log("page", current_page);
      if (current_page == 'front') {
        return this.get4RandomAlbums();
      }
      if (current_page == 'update_db') {
        
        this.musicdb.loadDatabase().then(alert).catch(function(e){
          console.error("Failed loading database !", e);
          alert("loading failed " + e);
        });
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
        vue.playlist = items
      });
    },
    playNext: function() {
      var i;
      // XXX
      console.log("ah", this.current_item, this.playlist);
      for (i=0; i<this.playlist.length - 1; i++){
        console.log(this.current_item.id, this.current_item.title,
                    this.playlist[i].id, this.playlist[i].title);
        if (this.current_item.id == this.playlist[i].id) {
          this.current_item = this.playlist[i+1];
          console.log('ok');
          return;
        }
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
app.$mount('.player');

