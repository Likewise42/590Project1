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

let roomNum = 1;
const rooms = {
  room1: {
    title: 'room1',
    userNum: 0,
  },
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
	
  	  rooms[`room${roomNum}`] = {
  	    title: `room${roomNum}`,
  	    userNum: 0,
  	  };
	
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
	
  	  if (room.title == data.newRoom) {
  	    socket.roomToJoin = room.title;
  	    makeNew = false;
  	  }
  	}
		
		if (makeNew) {
  	  console.log(`creating room ${data.newRoom}`);
	
  	  rooms[data.newRoom] = {
  	    title: data.newRoom,
  	    userNum: 0,
  	  };
	
  	  console.dir(rooms[data.newRoom]);
	
  	  socket.roomToJoin = rooms[data.newRoom].title;
  	}
		
		rooms[socket.roomToJoin].userNum++;
    console.log(`Joining room ${socket.roomToJoin}. Users:${rooms[socket.roomToJoin].userNum} `);

    socket.join(socket.roomToJoin);

    socket.emit('roomNum', socket.roomToJoin);

    socket.broadcast.to(socket.roomToJoin).emit('requestCanvas');
		
	});

  socket.on('draw', (data) => {
    socket.broadcast.to(socket.roomToJoin).emit('recieveDraw', data);
  });

  socket.on('sendCanvas', (data) => {
    socket.broadcast.to(socket.roomToJoin).emit('recieveCanvas', data);
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

setInterval(() => {
  const keys = Object.keys(rooms);
  for (let i = 0; i < keys.length; i++) {
    const room = rooms[keys[i]];
    io.sockets.in(room.title).emit('clear');
  }
}, 100000);

console.log('Websocket server started');

