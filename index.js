var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port = process.env.PORT || 3000;

server.listen(port);

var playerSpawnPoints = [{
  position: [-3, 0, 30],
  rotation: 180
}, {
  position: [13, 0, -5],
  rotation: 0
}, {
  position: [12, 0, 40],
  rotation: 0
}];
var clients = [];
var i = 0;

app.get('/', function (req, res) {
  res.send("Server is Alive");
});

io.on('connection', function (socket) {
  // Client Connected
  var currentPlayer = {
    name: 'Unknown'
  }

// Notifies other clients that you connected
  socket.on('playerConnected', function () {
    console.log('Player Connected Fired')
    // Iterate through list of clients to let new player know the position of the other clients
    for (var i = 0; i < clients.length; i++) {
      var playerConnected = {
        name: clients[i].name,
        position: clients[i].position,
        rotation: clients[i].rotation,
        health: clients[i].health
      };

      socket.emit('playerConnected', playerConnected);
      console.log('Sent info about: ', JSON.stringify(playerConnected));
    }
  });

// When a player joins the game
  socket.on('play', function (data) {
    console.log('Play Fired and adding: ', JSON.stringify(data));
    var spawnPoint = playerSpawnPoints[i];
    i++;
    currentPlayer = {
      name: data.name,
      position: spawnPoint.position,
      rotation: spawnPoint.rotation,
      health: 100
    };
    clients.push(currentPlayer);

    console.log('Emmitting Play with: ', JSON.stringify(currentPlayer));
    socket.emit('play', currentPlayer);

    // Later joiners (not sure if applicable)
    socket.broadcast.emit('playerConnected', currentPlayer);
  });

  socket.on('playerMove', function (data) {
    currentPlayer.position = data.position;
    console.log('updated PlayerMove', JSON.stringify(currentPlayer));
    socket.broadcast.emit('playerMove', currentPlayer);
  });

  socket.on('playerRotate', function (data) {
    currentPlayer.rotation = data.rotation;
    console.log('updated PlayerRotate', JSON.stringify(currentPlayer));
    socket.broadcast.emit('playerRotate', currentPlayer);
  });


  socket.on('playerShoot', function () {
    var data = {
      name: currentPlayer.name
    }

    console.log('PlayerShoot triggered by: ', JSON.stringify(currentPlayer));

    socket.emit('playerShoot', data);
    socket.broadcast.emit('playerShoot', data);
  });

  socket.on('playerHealth', function (data) {
    // Only the person who fired the bullet will update the other client's health
    if (data.from === currentPlayer.name) {
      var updatedInfo = 0;

      clients = clients.map(function (client) {
        if (client.name === data.name) {
          client.health -= data.healthChange;
          updatedInfo = {
            name: client.name,
            health: client.health
          };
        }
        return client;
      });

      console.log('Emitting Health', JSON.stringify(updatedInfo));

      socket.emit('health', updatedInfo);
      socket.broadcast.emit('health', updatedInfo);
    }
  });

  socket.on('disconnect', function () {
    console.log('disconnected player: ', JSON.stringify(currentPlayer));

    socket.broadcast.emit('playerDisconnect', currentPlayer);
    clients = clients.filter(function (client) {
      client.name !== currentPlayer.name
    });
  });
});

console.log('---server is running on port ' + port + ' ...');
