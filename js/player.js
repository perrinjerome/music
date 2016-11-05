/*globals $:false */
/*globals console:false */
$(function () {
    "use strict";
    
    var request = window.indexedDB.open("beets", 16),
        beets_url = "http://192.168.10.2:8337";
    
    request.onerror = function (event) {
        console.error("oh merde", event);
    };
    
    request.onupgradeneeded = function (event) {
        var objectStore, db = event.target.result;
        console.log("upgrade needed");
        
        db.deleteObjectStore("items");
        db.deleteObjectStore("albums");
        
        if (!db.objectStoreNames.contains("items")) {
            objectStore = db.createObjectStore("items",
                                               { keyPath: "__id", autoIncrement:true });
            objectStore.createIndex("id", "id", { unique: true });
            objectStore.createIndex("album", "album", { unique: false });
            objectStore.createIndex("albumartist", "albumartist", { unique: false });
        }
        if (!db.objectStoreNames.contains("albums")) {
            objectStore = db.createObjectStore("albums",
                                              { keyPath: "__id", autoIncrement:true });
            objectStore.createIndex("id", "id", { unique: true });
            objectStore.createIndex("album", "album", { unique: false });
            objectStore.createIndex("albumartist", "albumartist", { unique: false });
        }
    };
    
    function loadDb(db, beets_url) {
        function loadObjectStore(url, storeName, json_key_name) {
            var i = 0;
            console.log("getting " + url + " (this is slow)");
            $.getJSON(url).then(function (data) {
                function insertNext(i, store) {
                    if (i === 0) {
                        console.log("fini");
                        return;
                    }
                    try {
                        store.add(data[json_key_name][i]).onsuccess = function (evt) {
                            if ((i % 300) == 0) {
                                // start a new transaction.
                                console.log("Insertion in DB successful", i );
                                insertNext(i-1, db.transaction(
                                            storeName,
                                            "readwrite"
                                        ).objectStore(storeName));
                            } else {
                                insertNext(i-1, store);
                            }
                        }
                    } catch (e) {
                        console.error(
                            "Error inserting " +url + " in " + storeName, e, data.items[i], i, data);
                    }
                }
                insertNext(
                    data[json_key_name].length - 1,
                    db.transaction(
                        storeName,
                        "readwrite"
                    ).objectStore(storeName));
            
            }, function (e) {console.error(e);});
        }
        
        function loadObjectStoreIfEmpty(url, storeName, json_key_name) {
            db.transaction(
                storeName,
                "readonly"
            ).objectStore(storeName).count().onsuccess = function() {
                console.log("load os if ", storeName, this.result);
                if (this.result === 0) {
                    console.log(storeName, "is empty, filling up");
                    loadObjectStore(url, storeName, json_key_name);
                }
            }
        }
        
        loadObjectStoreIfEmpty(beets_url + "/item/", "items", "items");
        loadObjectStoreIfEmpty(beets_url + "/album/", "albums", "albums");
    }
    
    request.onsuccess = function (event) {
        var db = event.target.result, albumStore, req;
        loadDb(db, beets_url);
        console.log("ah");
        albumStore = db.transaction(
                "albums",
                "readonly"
            ).objectStore("albums");
        
        req = albumStore.count();
        req.onsuccess = function() {
            console.log(this.result, "albums");
        }
       req.onerror = console.error;
       albumStore.index("album").onsuccess = function(event) {
        var cursor = event.target.result;
        console.log(cursor);
        if(cursor) {
            console.log(cursor.value);
            cursor.continue();
        } else {
            console.log('Tous les enregistrements ont été affichés.');    
        }
       }
    /*
        objectStore2.openCursor().onsuccess = function (event) {
            var cursor = event.target.result;
            if (cursor) {
                console.log("Name for SSN " + cursor.key + " is " + cursor.value.name);
                cursor['continue']();
            } else {
                console.log("No more entries!");
            }
        };
        */
    };
    
  
    
    
    return;
    $.getJSON('http://192.168.10.2:8337/album').then(
    function (albums){
        
        //console.log(len(album));  
        console.log(albums);

        var album1 = albums.albums[Math.ceil(Math.random() * albums.albums.length)];
        $("#zone").text(JSON.stringify(album1, 2, " "));
        //var album2 = Math.ceil(Math.random() * stats['albums']);
        //var album3 = Math.ceil(Math.random() * stats['albums']);
        //var album4 = Math.ceil(Math.random() * stats['albums']);
        console.log(album1);
        $.getJSON('http://192.168.10.2:8337/album/' + album1.id).then(
             function(info) {
                $("#zone").text(JSON.stringify(info, 1, " "));
            album = $("<div>").append(
              $("<img>")
                .attr("src", 'http://192.168.10.2:8337/album/' + album1.id + '/art')
                .attr('alt', '' + info['album']));
            $("#zone").parent().append(album);
            
        });
        
        $.getJSON('http://192.168.10.2:8337/item/query/album_id:' + album1.id).then(
            function(items) {
                console.log(items);
                for (i=0; i<=items.length; i++){
                    console.log(JSON.stringify(items[i], 1, 1));
                }
            },
            function(e) {
              alert(e);
            }
        );
    }
    , function(e) {
      alert(e);
    }
   );
});