var should = require('should')
var io = require('socket.io-client');

var url = "https://localhost:3000";

var options ={
  transports: ['websocket'],
  'force new connection': true
};


describe('Sockets', function() {
  it('should updatePlayerUserName', function() {
    var client1 = io.connect(url, options);
    var client2 = io.connect(url, options);

    client1.on('connect', function (data) {
      client1.emit('joinRoom', JSON.stringify({
        roomId: 'room-1'
      }));

      client1.on('connect', function (data) {
        client2.emit('joinRoom', JSON.stringify({
          roomId: 'room-2'
        }));

        var output = {
          name: 'Unknown',
          position: [0, 0, 0]
        }

        client1.emit('playerMove', JSON.stringify({
          position: [0, 0, 0]
        }));

        client2.on('playerMove', function (data) {
          should.deepEqual(data.position, output)
        });
      });
    });
  });
})
