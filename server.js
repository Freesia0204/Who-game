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

  // 創建房間 → 第一人是選題者
  socket.on('create_room', ({ roomId, playerId, name }) => {
    socket.join(roomId);

    rooms[roomId] = { players: {}, choices: {}, topicSelector: socket.id };
    rooms[roomId].players[socket.id] = { playerId, name };

    io.to(roomId).emit('room_update', {
      roomId,
      players: rooms[roomId].players,
      topicSelector: rooms[roomId].topicSelector
    });

    io.to(roomId).emit('system_message', `${name} 創建了房間`);
  });

  // 加入房間
  socket.on('join_room', ({ roomId, playerId, name }) => {
    socket.join(roomId);
    if (!rooms[roomId]) return;

    rooms[roomId].players[socket.id] = { playerId, name };

    io.to(roomId).emit('room_update', {
      roomId,
      players: rooms[roomId].players,
      topicSelector: rooms[roomId].topicSelector
    });

    io.to(roomId).emit('system_message', `${name} 加入了房間`);
  });

  // 選主題 → 只有第一人能選
  socket.on('select_topic', ({ roomId, topic }) => {
    if (!rooms[roomId]) return;

    if (rooms[roomId].topicSelector !== socket.id) {
      io.to(roomId).emit('system_message',
        `玩家 ${rooms[roomId].players[socket.id]?.name} 嘗試選主題，但不是選題者`);
      return;
    }

    io.to(roomId).emit('topic_selected', { topic });
  });

 
 
// 玩家選卡牌 → 雙方都選好 → 開始遊戲
socket.on('choose_card', ({ roomId, card }) => {
  if (!rooms[roomId]) return;
  rooms[roomId].choices[socket.id] = {
    playerId: rooms[roomId].players[socket.id].playerId,
    card
  };

  io.to(roomId).emit('player_chosen', {
    player: rooms[roomId].players[socket.id].name,
    playerId: rooms[roomId].players[socket.id].playerId, // ✅ 加上
    card // ✅ 加上
  });

  const room = rooms[roomId];
  if (Object.keys(room.choices).length === Object.keys(room.players).length) {
    room.rpsDone = false;
    io.to(roomId).emit('game_start');
  }
});


// 系統隨機猜拳
socket.on('start_rps', ({ roomId }) => {
  if (!rooms[roomId]) return;

  // 如果已經有勝負，就不要再猜
  if (rooms[roomId].rpsDone) return;

  const options = ['石頭', '剪刀', '布'];
  const hands = {};
  for (const sid of Object.keys(rooms[roomId].players)) {
    hands[rooms[roomId].players[sid].playerId] =
      options[Math.floor(Math.random() * options.length)];
  }
  io.to(roomId).emit('rps_result', { hands });
});

// 前端通知伺服器猜拳結束
socket.on('rps_done', ({ roomId }) => {
  if (rooms[roomId]) {
    rooms[roomId].rpsDone = true; // ✅ 標記結束
  }
});

socket.on('start_rps', ({ roomId }) => {
  if (!rooms[roomId]) return;
  if (rooms[roomId].rpsDone) return; // ✅ 已結束就不再猜

  const options = ['石頭', '剪刀', '布'];
  const hands = {};
  for (const sid of Object.keys(rooms[roomId].players)) {
    hands[rooms[roomId].players[sid].playerId] =
      options[Math.floor(Math.random() * options.length)];
  }
  io.to(roomId).emit('rps_result', { hands });
});



// 在新遊戲開始時重置
socket.on('game_start', ({ roomId }) => {
  if (rooms[roomId]) {
    rooms[roomId].rpsDone = false; // ✅ 重置
  }
});


// 聊天訊息廣播
socket.on('chat_message', ({ roomId, from, name, text }) => {
  io.to(roomId).emit('chat_message', { from, name, text });
});
  // 玩家斷線
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (!room) continue;

      if (room.players[socket.id]) {
        const name = room.players[socket.id].name;
        delete room.players[socket.id];

        io.to(roomId).emit('room_update', {
          roomId,
          players: rooms[roomId].players,
          topicSelector: room.topicSelector
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

const userTopics = {}; 
// 結構範例：
// userTopics[playerId] = [
//   { name: "我的混合主題", cards: [ { name: "工藤新一", img: "..." }, ... ] }
// ]

app.post('/api/saveCustomTopic', express.json(), (req, res) => {
  const { userId, topic } = req.body;
  if (!userId || !topic) {
    return res.json({ success: false, message: '缺少參數' });
  }
  if (!userTopics[userId]) {
    userTopics[userId] = [];
  }
  userTopics[userId].push(topic);
  res.json({ success: true });
});

app.get('/api/getCustomTopics', (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.json({ customTopics: [] });
  }
  res.json({ customTopics: userTopics[userId] || [] });
});

app.post('/api/deleteCustomTopic', express.json(), (req, res) => {
  const { userId, topicName } = req.body;
  if (!userId || !topicName) {
    return res.json({ success: false, message: '缺少參數' });
  }
  if (userTopics[userId]) {
    userTopics[userId] = userTopics[userId].filter(t => t.name !== topicName);
  }
  res.json({ success: true });
});

app.post('/api/editCustomTopic', express.json(), (req, res) => {
  const { userId, topicName, newTopic } = req.body;
  if (!userId || !topicName || !newTopic) {
    return res.json({ success: false, message: '缺少參數' });
  }
  if (userTopics[userId]) {
    userTopics[userId] = userTopics[userId].map(t => 
      t.name === topicName ? newTopic : t
    );
  }
  res.json({ success: true });
});

