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
    drawingUser: 0,
  };
  console.dir(rooms[name]);

  socket.roomToJoin = rooms[name].title;
};

const joinRoom = (sock) => {
  const socket = sock;
  rooms[socket.roomToJoin].userNum++;
  rooms[socket.roomToJoin].userList[socket.name] = {};
  rooms[socket.roomToJoin].userList[socket.name].name = socket.name;
  console.log(`User ${rooms[socket.roomToJoin].userList[socket.name].name} is joining room ${socket.roomToJoin}. Users:${rooms[socket.roomToJoin].userNum} `);
};

const listeners = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    socket.roomToJoin = {};
    socket.name = data.name;
    let makeNew = true;
    let nameValid = true;

    const keys = Object.keys(rooms);

    for (let i = 0; i < keys.length; i++) {
      const room = rooms[keys[i]];

      const userNameKeys = Object.keys(room.userList);
      for (let j = 0; j < userNameKeys.length; j++) {
        const userName = room.userList[userNameKeys[j]];

        if (userName.name === socket.name) {
          nameValid = false;
        }
      }

      if (nameValid && room.userNum < 4) {
        socket.roomToJoin = room.title;
        makeNew = false;
      }
    }

    if (nameValid) {
      if (makeNew) {
        roomNum++;
        newRoom(socket, `room${roomNum}`);
      }

      socket.emit('nameValid');

      joinRoom(socket);

      socket.join(socket.roomToJoin);

      socket.emit('roomNum', {
        roomNum: socket.roomToJoin,
        name: socket.name,
      });

      socket.broadcast.to(socket.roomToJoin).emit('requestCanvas', { name: socket.name });

      const toJoin = rooms[socket.roomToJoin];
      const drawingKeys = Object.keys(toJoin.userList);
      const currentDrawingUser = toJoin.userList[drawingKeys[toJoin.drawingUser]];

      io.sockets.in(toJoin.title).emit('nextDrawingUser', {
        name: currentDrawingUser.name,
      });
    } else {
      socket.emit('nameInvalid');
    }
  });

  socket.on('changeRoom', (data) => {
    let makeNew = true;
    let joinSuccess = true;

    socket.leave(socket.roomToJoin);

    rooms[socket.roomToJoin].userNum--;

    const keys = Object.keys(rooms);

    socket.broadcast.to(socket.roomToJoin).emit('uDisconnect', socket.name);
    delete (rooms[socket.roomToJoin].userList[socket.name]);

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
      joinRoom(socket);


      socket.join(socket.roomToJoin);

      socket.emit('clear');
      socket.emit('roomNum', {
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

      delete (rooms[socket.roomToJoin].userList[socket.name]);

      console.log(`Leaving room ${socket.roomToJoin}`);
    }
  });
};

io.sockets.on('connection', (socket) => {
  console.log('someone joined');

  listeners(socket);
});

setInterval(() => {
  console.log('---');
  const keys = Object.keys(rooms);
  for (let i = 0; i < keys.length; i++) {
    const room = rooms[keys[i]];

    console.log(`Room ${room.title}`);

    room.drawingUser++;

    console.log(`${room.drawingUser} ${room.userNum}`);

    if (room.drawingUser >= room.userNum) {
      room.drawingUser = 0;
    }

    console.dir(room.userList);

    const drawingKeys = Object.keys(room.userList);

    if (drawingKeys.length > 0) {
      const currentDrawingUser = room.userList[drawingKeys[room.drawingUser]];

      console.log(currentDrawingUser.name);
      io.sockets.in(room.title).emit('nextDrawingUser', {
        name: currentDrawingUser.name,
      });
    } else {
      console.log('No Users In Room');
    }
  }

  console.log('---');
}, 15000);

// setInterval(() => {
//  const keys = Object.keys(rooms);
//  for (let i = 0; i < keys.length; i++) {
//    const room = rooms[keys[i]];
//    io.sockets.in(room.title).emit('clear');
//  }
// }, 100000);

console.log('Websocket server started');

