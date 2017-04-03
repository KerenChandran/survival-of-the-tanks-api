var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var port = process.env.PORT || 3000;
var ROOM_SIZE = 4;

server.listen(port);

var playerSpawnPoints = [{
  position: [-30, 0, -23],
  rotation: 0,
  playerColor: '#3E6CC5'
}, {
  position: [40, 0, -27],
  rotation: 270,
  playerColor: '#DD2525'
}, {
  position: [36, 0, 39],
  rotation: 180,
  playerColor: '#7ECE40'
}, {
  position: [-36, 0, 37],
  rotation: 90,
  playerColor: '#AF00C3FF'
}];

var activeClients = [];

var rooms = [{
  id: 'room-1',
  clients: [],
  name: 'Cool Room',
  spawnPointIndex: 0
}, {
  id: 'room-2',
  clients: [],
  name: 'Boring Room',
  spawnPointIndex: 0
}];

app.get('/', function (req, res) {
  res.send("Server is Alive");
});

io.on('connection', function (socket) {
  // Client Connected
  var currentPlayer = {
    name: 'Unknown'
  }

  socket.on('updatePlayerName', function (data) {
    console.log('Updating Player Name', data.name);
    currentPlayer.name = data.name;
  });

// Notifies other activeClients that you connected

  socket.on('joinRoom', function (data) {
    currentPlayer.roomId = data.roomId;
    socket.join(data.roomId);
  });

  socket.on('playerConnected', function (data) {
    var room = findRoom(data.roomId);
    console.log('data.roomId', data.roomId);

    var clients = room.clients;
    console.log('Player Connected Fired')

    // Iterate through list of activeClients to let new player know the position of the other activeClients
    for (var i = 0; i < clients.length; i++) {
      var playerConnected = {
        name: clients[i].name,
        position: clients[i].position,
        rotation: clients[i].rotation,
        health: clients[i].health,
        playerColor: clients[i].playerColor
      };

      socket.emit('playerConnected', playerConnected);
      console.log('Sent info about: ', JSON.stringify(playerConnected));
    }
  });

// When a player joins the game
  socket.on('play', function (data) {
    console.log('Play Fired and adding: ', JSON.stringify(data));

    var room = findRoom(data.roomId);

    var spawnPoint = playerSpawnPoints[room.spawnPointIndex];
    room.spawnPointIndex++;

    if (room.spawnPointIndex > 3) {
      return;
    }

    currentPlayer = {
      name: data.name,
      position: spawnPoint.position,
      rotation: spawnPoint.rotation,
      health: 100,
      playerColor: spawnPoint.playerColor,
      roomId: data.roomId
    };

    room.clients.push(currentPlayer);

    console.log('Emmitting Play with: ', JSON.stringify(currentPlayer));
    socket.emit('play', currentPlayer);

    // Later joiners (not sure if applicable)
    socket.broadcast.to(data.roomId).emit('playerConnected', currentPlayer);
  });

  socket.on('playerMove', function (data) {
    currentPlayer.position = data.position;
    console.log('updated PlayerMove', JSON.stringify(currentPlayer));
    socket.broadcast.to(currentPlayer.roomId).emit('playerMove', currentPlayer);
  });

  socket.on('playerRotate', function (data) {
    currentPlayer.rotation = data.rotation;
    console.log('updated PlayerRotate', JSON.stringify(currentPlayer));
    socket.broadcast.to(currentPlayer.roomId).emit('playerRotate', currentPlayer);
  });


  socket.on('playerShoot', function (data) {
    console.log("data: ", data);
    console.log("JSON.stringify(data): ", JSON.stringify(data));

    var data = {
      name: currentPlayer.name,
      launchForce: data.launchForce
    }
    console.log("currentPlayer: ", currentPlayer);

    console.log('PlayerShoot triggered by: ', JSON.stringify(currentPlayer));

    socket.emit('playerShoot', data);
    socket.broadcast.to(currentPlayer.roomId).emit('playerShoot', data);
  });

  socket.on('playerHealth', function (data) {
    // Only the person who fired the bullet will update the other client's health
    if (data.from === currentPlayer.name) {
      var updatedInfo = 0;

      var room = findRoom(currentPlayer.roomId);

      room.clients = room.clients.map(function (client) {
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
      socket.broadcast.to(currentPlayer.roomId).emit('health', updatedInfo);
    }
  });

  socket.on('disconnect', function () {
    console.log('disconnected player: ', JSON.stringify(currentPlayer));
    if (!currentPlayer.roomId) {
      return;
    }
    var room = findRoom(currentPlayer.roomId);

    socket.broadcast.to(currentPlayer.roomId).emit('playerDisconnect', currentPlayer);
    room.clients = room.clients.filter(function (client) {
      client.name !== currentPlayer.name
    });
  });
});

function findRoom(id) {
  var room = rooms.find(function(room) {
    return room.id == id
  });
  return room;
}

console.log('---server is running on port ' + port + ' ...');
