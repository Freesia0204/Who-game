const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// ✅ 使用雲端提供的 PORT，預設 3001
const PORT = process.env.PORT || 3001;

const io = new Server(server, { cors: { origin: '*' } });

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId, name }) => {
    socket.join(roomId);
    rooms[roomId] = rooms[roomId] || { players: {} };
    rooms[roomId].players[socket.id] = { name };

    io.to(roomId).emit('room_update', { players: rooms[roomId].players });
    io.to(roomId).emit('system_message', `${name} 加入房間 ${roomId}`);
  });

  socket.on('chat_message', ({ roomId, from, text }) => {
    io.to(roomId).emit('chat_message', { from, text });
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        io.to(roomId).emit('room_update', { players: rooms[roomId].players });
      }
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
