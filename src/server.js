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
let rooms = {
	room1: {
		title: 'room1',
		userNum: 0,
	},
};

const join = (sock) => {
	const socket = sock;
	let roomToJoin;
	
	
	
	socket.on('join', () => {
    socket.join(roomToJoin);

    socket.broadcast.to('room1').emit('requestCanvas');
  });
	
};

const listeners = (sock) => {
  const socket = sock;
	
	join(socket);

  socket.on('draw', (data) => {
    socket.broadcast.to('room1').emit('recieveDraw', data);
  });

  socket.on('sendCanvas', (data) => {
    socket.broadcast.to('room1').emit('recieveCanvas', data);
  });
};

io.sockets.on('connection', (socket) => {
  console.log('someone joined');

  listeners(socket);
});

setInterval(() => {
  io.sockets.in('room1').emit('clear');
}, 100000);

console.log('Websocket server started');

