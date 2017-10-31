const nock = require('nock');

const mockAPIWithTwoAlbums = baseUrl => {
  return nock(baseUrl)
    .filteringPath(/[\d,]/g, '')
    .get('/stats')
    .reply(200, { items: 3, albums: 2 })
    .get('/album/')
    .reply(200, {
      albums: [{ id: 1, album: 'album1' }, { id: 2, album: 'album2' }]
    })
    .get('/item/')
    .reply(200, {
      items: [
        {
          id: 1,
          album_id: 1,
          artist: 'artist1',
          album: 'album1',
          title: '1'
        },
        {
          id: 2,
          album_id: 1,
          artist: 'artist1',
          album: 'album1',
          title: '2'
        },
        {
          id: 3,
          album_id: 2,
          artist: 'artist1',
          album: 'album2',
          title: '3'
        }
      ]
    });
};

export { mockAPIWithTwoAlbums };
