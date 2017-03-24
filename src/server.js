// Used base of Canvas Syncing II Assignemnt
const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// read index into memory
const index = fs.readFileSync(`${__dirname}/../client/index.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);

const io = socketio(app);

let roomNum = 0;
const rooms = {};

const newRoom = (sock, name) => {
  const socket = sock;
  console.log(`creating room ${name}`);
  rooms[name] = {
    title: name,
    userNum: 0,
    userList: {},
  };
  console.dir(rooms[name]);

  socket.roomToJoin = rooms[name].title;
};

const listeners = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    socket.roomToJoin = {};
    socket.name = data.name;
    let makeNew = true;

    const keys = Object.keys(rooms);

    for (let i = 0; i < keys.length; i++) {
      const room = rooms[keys[i]];

      if (room.userNum < 4) {
        socket.roomToJoin = room.title;
        makeNew = false;
      }
    }

    if (makeNew) {
      roomNum++;
      newRoom(socket, `room${roomNum}`);
    }

    rooms[socket.roomToJoin].userNum++;
    console.log(`Joining room ${socket.roomToJoin}. Users:${rooms[socket.roomToJoin].userNum} `);

    socket.join(socket.roomToJoin);

    socket.emit('roomNum', {
      roomNum: socket.roomToJoin,
      name: socket.name,
    });

    socket.broadcast.to(socket.roomToJoin).emit('requestCanvas', { name: socket.name });
  });

  socket.on('changeRoom', (data) => {
    let makeNew = true;
    let joinSuccess = true;

    rooms[socket.roomToJoin].userNum--;

    const keys = Object.keys(rooms);

    for (let i = 0; i < keys.length; i++) {
      const room = rooms[keys[i]];

      if (room.title === data.newRoom) {
        if (room.userNum < 4) {
          socket.roomToJoin = room.title;
          makeNew = false;
        } else {
          socket.emit('newRoomFull');
          joinSuccess = false;
        }
      }
    }

    if (makeNew) {
      roomNum++;
      newRoom(socket, data.newRoom);
    }

    if (joinSuccess) {
      rooms[socket.roomToJoin].userNum++;
      console.log(`Joining room ${socket.roomToJoin}. Users:${rooms[socket.roomToJoin].userNum} `);

      socket.join(socket.roomToJoin);

      socket.emit('clear');
      socket.emit('roomNum',{
        roomNum: socket.roomToJoin,
        name: socket.name,
      });

      socket.broadcast.to(socket.roomToJoin).emit('requestCanvas', { name: socket.name });
    }
  });

  socket.on('draw', (data) => {
    socket.broadcast.to(socket.roomToJoin).emit('recieveDraw', data);
  });

  socket.on('sendCanvas', (data) => {
    socket.broadcast.to(socket.roomToJoin).emit('recieveCanvas', data);
  });

  socket.on('clearRoom', () => {
    console.log('recieved clear');
    io.sockets.in(socket.roomToJoin).emit('clear');
  });

  socket.on('disconnect', () => {
    if (socket.roomToJoin) {
      socket.broadcast.to(socket.roomToJoin).emit('uDisconnect', socket.name);

      socket.leave(socket.roomToJoin);
      rooms[socket.roomToJoin].userNum--;
      console.log(`Leaving room ${socket.roomToJoin}`);
    }
  });
};

io.sockets.on('connection', (socket) => {
  console.log('someone joined');

  listeners(socket);
});

// setInterval(() => {
//  const keys = Object.keys(rooms);
//  for (let i = 0; i < keys.length; i++) {
//    const room = rooms[keys[i]];
//    io.sockets.in(room.title).emit('clear');
//  }
// }, 100000);

console.log('Websocket server started');

