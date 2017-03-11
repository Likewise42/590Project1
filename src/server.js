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

const newRoom = (name) => {
  rooms[name] = {
    title: name,
    userNum: 0,
    userList: {},
  };
  console.dir(rooms[name]);
};

const listeners = (sock) => {
  const socket = sock;

  socket.on('join', () => {
    socket.roomToJoin = {};
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
      console.log(`creating room${roomNum}`);

      newRoom(`room${roomNum}`);

      console.dir(rooms[`room${roomNum}`]);

      socket.roomToJoin = rooms[`room${roomNum}`].title;
    }

    rooms[socket.roomToJoin].userNum++;
    console.log(`Joining room ${socket.roomToJoin}. Users:${rooms[socket.roomToJoin].userNum} `);

    socket.join(socket.roomToJoin);

    socket.emit('roomNum', socket.roomToJoin);

    socket.broadcast.to(socket.roomToJoin).emit('requestCanvas');
  });

  socket.on('changeRoom', (data) => {
    let makeNew = true;

    const keys = Object.keys(rooms);

    for (let i = 0; i < keys.length; i++) {
      const room = rooms[keys[i]];

      if (room.title === data.newRoom) {
        socket.roomToJoin = room.title;
        makeNew = false;
      }
    }

    if (makeNew) {
      console.log(`creating room ${data.newRoom}`);

      newRoom(data.newRoom);

      console.dir(rooms[data.newRoom]);

      socket.roomToJoin = rooms[data.newRoom].title;
    }

    rooms[socket.roomToJoin].userNum++;
    console.log(`Joining room ${socket.roomToJoin}. Users:${rooms[socket.roomToJoin].userNum} `);

    socket.join(socket.roomToJoin);

    socket.emit('clear');
    socket.emit('roomNum', socket.roomToJoin);

    socket.broadcast.to(socket.roomToJoin).emit('requestCanvas');
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
    socket.leave(socket.roomToJoin);
    rooms[socket.roomToJoin].userNum--;
    console.log(`Leaving room ${socket.roomToJoin}`);
  });
};

io.sockets.on('connection', (socket) => {
  console.log('someone joined');

  listeners(socket);
});

//setInterval(() => {
//  const keys = Object.keys(rooms);
//  for (let i = 0; i < keys.length; i++) {
//    const room = rooms[keys[i]];
//    io.sockets.in(room.title).emit('clear');
//  }
//}, 100000);

console.log('Websocket server started');

