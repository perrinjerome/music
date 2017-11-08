const nock = require('nock');

const mockAPIWithTwoAlbums = baseUrl => {
  return nock(baseUrl)
    .filteringPath(/[\d,]/g, '')
    .get('/stats')
    .reply(200, { items: 3, albums: 2 })
    .get('/album/')
    .reply(200, {
      albums: [
        { id: 1, album: 'album1', albumartist: 'artist1' },
        { id: 2, album: 'album2', albumartist: 'artist2' }
      ]
    })
    .get('/item/')
    .reply(200, {
      items: [
        {
          id: 1,
          album_id: 1,
          albumartist: 'artist1',
          album: 'album1',
          title: '1'
        },
        {
          id: 2,
          album_id: 1,
          albumartist: 'artist1',
          album: 'album1',
          title: '2'
        },
        {
          id: 3,
          album_id: 2,
          albumartist: 'artist1',
          album: 'album2',
          title: '3'
        }
      ]
    });
};

const mockAPIWithTwoAlbumsChunkSize1 = baseUrl => {
  return nock(baseUrl)
    .get('/stats')
    .reply(200, { items: 3, albums: 2 })
    .get('/item/1')
    .reply(200, {
      items: [
        {
          id: 1,
          album_id: 1,
          albumartist: 'artist1',
          album: 'album1',
          title: '1'
        }
      ]
    })
    .get('/album/1')
    .reply(200, {
      albums: [{ id: 1, album: 'album1', albumartist: 'artist1' }]
    })
    .get('/item/2')
    .reply(200, {
      items: [
        {
          id: 2,
          album_id: 1,
          albumartist: 'artist1',
          album: 'album1',
          title: '2'
        }
      ]
    }) /* no get again of album/1 it's already known */
    .get('/item/3')
    .reply(200, {
      items: [
        {
          id: 3,
          album_id: 2,
          albumartist: 'artist2',
          album: 'album2',
          title: '3'
        }
      ]
    })
    .get('/album/2')
    .reply(200, {
      albums: [{ id: 2, album: 'album2', albumartist: 'artist2' }]
    });
};

export { mockAPIWithTwoAlbums, mockAPIWithTwoAlbumsChunkSize1 };
