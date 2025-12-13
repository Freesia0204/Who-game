const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname)); // 提供前端檔案

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {};

io.on('connection', (socket) => {
  console.log('有玩家連線:', socket.id);

  // 創建房間 → 房主
  socket.on('create_room', ({ roomId, name }) => {
    socket.join(roomId);

    // 建立房間並指定房主
    rooms[roomId] = { host: socket.id, players: {}, choices: {} };
    rooms[roomId].players[socket.id] = { name };

    io.to(roomId).emit('room_update', {
      players: rooms[roomId].players,
      host: rooms[roomId].host
    });

    io.to(roomId).emit('system_message', `${name} 創建了房間`);
  });

  // 加入房間 → 不改變房主
  socket.on('join_room', ({ roomId, name }) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      // 如果房間不存在，必須先用 create_room 建立
      return;
    }

    rooms[roomId].players[socket.id] = { name };

    io.to(roomId).emit('room_update', {
      players: rooms[roomId].players,
      host: rooms[roomId].host // 保持原本房主不變
    });

    io.to(roomId).emit('system_message', `${name} 加入了房間`);
  });

  // 聊天訊息
  socket.on('chat_message', ({ roomId, from, text }) => {
    io.to(roomId).emit('chat_message', { from, text });
  });

  // 房主選主題
  socket.on('select_topic', ({ roomId, topic }) => {
    io.to(roomId).emit('topic_selected', { topic });
  });

  // 玩家選解藥
  socket.on('choose_antidote', ({ roomId, antidote }) => {
    if (!rooms[roomId]) return;
    rooms[roomId].choices[socket.id] = antidote;

    io.to(roomId).emit('player_chosen', {
      player: rooms[roomId].players[socket.id].name
    });

    // 檢查是否雙方都選好
    if (Object.keys(rooms[roomId].choices).length === 2) {
      io.to(roomId).emit('game_start');
    }
  });

  // 系統隨機猜拳
  socket.on('start_rps', ({ roomId }) => {
    if (!rooms[roomId]) return;
    const options = ['石頭', '剪刀', '布'];
    const hands = {};
    for (const playerId of Object.keys(rooms[roomId].players)) {
      hands[playerId] = options[Math.floor(Math.random() * options.length)];
    }
    io.to(roomId).emit('rps_result', { hands });
  });

  // 玩家斷線
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        const name = rooms[roomId].players[socket.id].name;
        delete rooms[roomId].players[socket.id];

        // 如果房主斷線 → 指定新的房主
        if (rooms[roomId].host === socket.id) {
          const remainingPlayers = Object.keys(rooms[roomId].players);
          rooms[roomId].host = remainingPlayers.length > 0 ? remainingPlayers[0] : null;
        }

        io.to(roomId).emit('room_update', {
          players: rooms[roomId].players,
          host: rooms[roomId].host
        });

        io.to(roomId).emit('system_message', `${name} 離開了房間`);
      }
    }
  });

});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`伺服器運行中，PORT=${PORT}`);
});

