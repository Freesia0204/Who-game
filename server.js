const qs = require('qs');

const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://kitty0905154046_db_user:DLn0bS3R4Cu9iaWT@cluster0.ttgg2s3.mongodb.net/who_game?retryWrites=true&w=majority')
  .then(() => console.log('✅ 已連線到 MongoDB Atlas'))
  .catch(err => console.error('❌ 連線失敗:', err.message));

const TopicSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  name: String,
  cards: [{ name: String, img: String }]
}, { timestamps: true });

const Topic = mongoose.model('Topic', TopicSchema);




const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

app.use(express.json());

const path = require('path');
app.use(express.static(__dirname)); // ✅ 公開 HTML、JS、CSS
app.use('/data', express.static(path.join(__dirname, 'data'))); // ✅ 公開 JSON 資料

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



const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/api/uploadTopic', upload.array('cards', 30), async (req, res) => {
  const parsedBody = qs.parse(req.body);
  const userId = String(parsedBody.userId || '').trim();
  const topicName = (parsedBody.topicName || '').trim();

  if (!userId || !topicName) {
    return res.json({ success: false, message: '缺少 userId 或 topicName' });
  }

  const cards = [];
for (let i = 0; i < 30; i++) {
  const name = parsedBody.cards?.[i]?.name;
  const file = req.files?.[i]; // 直接用 index 對齊
  if (name) {
    cards.push({
      name,
      img: file ? '/uploads/' + file.filename : (parsedBody.cards?.[i]?.img || '')
    });
  }
}


  const exists = await Topic.findOne({ userId, name: topicName });

  if (exists) {
    await Topic.updateOne(
      { userId, name: topicName },
      { $set: { cards } }
    );
    console.log('✅ 主題已更新:', topicName);
    return res.json({ success: true, updated: true });
  } else {
    const topic = await Topic.create({ userId, name: topicName, cards });
    console.log('✅ 新主題已建立:', topicName);
    return res.json({ success: true, created: true, topic });
  }
});

  

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



app.get('/api/getCustomTopics', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ customTopics: [] });

  const topics = await Topic.find({ userId }).lean();
  res.json({ customTopics: topics });
});


app.post('/api/editCustomTopic', async (req, res) => {
  const { userId, topicName, newTopic } = req.body;
  if (!userId || !topicName || !newTopic) {
    return res.json({ success: false, message: '缺少參數' });
  }

  await Topic.updateOne(
    { userId, name: topicName },
    { $set: { name: newTopic.name, cards: newTopic.cards || [] } }
  );

  const topics = await Topic.find({ userId }).lean();
  res.json({ success: true, customTopics: topics });
});


app.post('/api/deleteCustomTopic', async (req, res) => {
  const { userId, topicName } = req.body;
  if (!userId || !topicName) {
    return res.json({ success: false, message: '缺少參數' });
  }

  await Topic.deleteOne({ userId, name: topicName });
  const topics = await Topic.find({ userId }).lean();
  res.json({ success: true, customTopics: topics });
});

