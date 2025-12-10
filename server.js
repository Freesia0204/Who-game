const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // ✅ 允許跨域

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // ✅ 允許所有來源
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('有玩家連線:', socket.id);

  socket.on('join_room', ({ roomId, name }) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] = { name };
    io.to(roomId).emit('room_update', { players: rooms[roomId] });
    io.to(roomId).emit('system_message', `${name} 加入了房間`);
  });

  socket.on('chat_message', ({ roomId, from, text }) => {
    io.to(roomId).emit('chat_message', { from, text });
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      if (rooms[roomId][socket.id]) {
        const name = rooms[roomId][socket.id].name;
        delete rooms[roomId][socket.id];
        io.to(roomId).emit('room_update', { players: rooms[roomId] });
        io.to(roomId).emit('system_message', `${name} 離開了房間`);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`伺服器運行中，PORT=${PORT}`);
});
