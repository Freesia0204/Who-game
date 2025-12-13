const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {};

io.on('connection', (socket) => {
  console.log('有玩家連線:', socket.id);

  // 創建房間
  socket.on('create_room', ({ roomId, playerId, name }) => {
    socket.join(roomId);

    rooms[roomId] = { host: socket.id, players: {}, choices: {} };
    rooms[roomId].players[socket.id] = { playerId, name };

    io.to(roomId).emit('room_update', {
      roomId,
      players: rooms[roomId].players,
      host: rooms[roomId].host,
      hostName: rooms[roomId].players[rooms[roomId].host]?.name || null
    });

    io.to(roomId).emit('system_message', `${name} 創建了房間`);
  });
}); // ✅ 這裡要收尾 io.on('connection')


// 加入房間
socket.on('join_room', ({ roomId, playerId, name }) => {
  socket.join(roomId);
  if (!rooms[roomId]) return;

  rooms[roomId].players[socket.id] = { playerId, name };

  io.to(roomId).emit('room_update', {
  roomId,
  players: rooms[roomId].players,
  host: rooms[roomId].host,
  hostName: rooms[roomId].players[rooms[roomId].host]?.name || null
});



  io.to(roomId).emit('system_message', `${name} 加入了房間`);
});

// 房主選主題
socket.on('select_topic', ({ roomId, topic }) => {
  if (!rooms[roomId]) return;

  if (rooms[roomId].host !== socket.id) {
    io.to(roomId).emit('system_message',
      `玩家 ${rooms[roomId].players[socket.id]?.name} 嘗試選主題，但不是房主`);
    return;
  }

  io.to(roomId).emit('topic_selected', { topic });
});

// 玩家選卡牌
socket.on('choose_card', ({ roomId, card }) => {
  if (!rooms[roomId]) return;
  rooms[roomId].choices[socket.id] = { playerId: rooms[roomId].players[socket.id].playerId, card };

  io.to(roomId).emit('player_chosen', {
    player: rooms[roomId].players[socket.id].name
  });

  const room = rooms[roomId];
  if (room && Object.keys(room.players).length === 0) {
    delete rooms[roomId];
  }
}); // ✅ 正確結尾


// 系統隨機猜拳
socket.on('start_rps', ({ roomId }) => {
  if (!rooms[roomId]) return;
  const options = ['石頭', '剪刀', '布'];
  const hands = {};
  for (const sid of Object.keys(rooms[roomId].players)) {
    hands[rooms[roomId].players[sid].playerId] = options[Math.floor(Math.random() * options.length)];

  }
  io.to(roomId).emit('rps_result', { hands });
});

// 玩家斷線
socket.on('disconnect', () => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (!room) continue;

    if (room.players[socket.id]) {
      const name = room.players[socket.id].name;
      delete room.players[socket.id];

      if (room.host === socket.id) {
        const remainingPlayers = Object.keys(room.players);
        room.host = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
      }

      io.to(roomId).emit('room_update', {
        roomId,
        players: rooms[roomId].players,
        host: rooms[roomId].host,
        hostName: rooms[roomId].players[rooms[roomId].host]?.name || null
      });

      io.to(roomId).emit('system_message', `${name} 離開了房間`);
    }
  }
}); // ✅ 正確結尾


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`伺服器運行中，PORT=${PORT}`);
});

