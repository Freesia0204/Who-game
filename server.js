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
app.use(express.static(__dirname));
app.use('/data', express.static(path.join(__dirname, 'data')));

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
  socket.on('select_topic', ({ roomId, topic, cards }) => {
    if (!rooms[roomId]) return;

    if (rooms[roomId].topicSelector !== socket.id) {
      io.to(roomId).emit('system_message',
        `玩家 ${rooms[roomId].players[socket.id]?.name} 嘗試選主題，但不是選題者`);
      return;
    }

    io.to(roomId).emit('topic_selected', { topic, cards });
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
      playerId: rooms[roomId].players[socket.id].playerId,
      card
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
      rooms[roomId].rpsDone = true;
    }
  });

  // 遊戲開始時重置
  socket.on('game_start', ({ roomId }) => {
    if (rooms[roomId]) {
      rooms[roomId].rpsDone = false;
    }
  });

  // 聊天訊息廣播
  socket.on('chat_message', ({ roomId, from, name, text }) => {
    io.to(roomId).emit('chat_message', { from, name, text });
  });

  // 遊戲結束事件
  socket.on('game_ended', ({ roomId, winner, loser, reason, myCard, opponentCard }) => {
    if (!rooms[roomId]) return;
    
    // 廣播給房間內的所有人
    io.to(roomId).emit('game_ended_broadcast', {
      roomId,
      winner,
      loser,
      reason,
      myCard,
      opponentCard,
      from: socket.id
    });
  });

  // 玩家投降事件
  socket.on('player_surrender', ({ roomId, winner, loser }) => {
    if (!rooms[roomId]) return;
    
    const winnerName = rooms[roomId].players[winner]?.name || '玩家';
    const loserName = rooms[roomId].players[loser]?.name || '玩家';
    
    io.to(roomId).emit('player_surrender_broadcast', {
      winner,
      loser,
      winnerName,
      loserName,
      message: `${loserName} 放棄了遊戲，${winnerName} 獲勝！`
    });
  });

  // 玩家猜測
  socket.on('player_guess', ({ roomId, playerId, guessedName, isCorrect }) => {
    if (!rooms[roomId]) return;
    
    io.to(roomId).emit('player_guessed', {
      playerId,
      guessedName,
      isCorrect
    });
  });

  // 玩家斷線
  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (!room) continue;

      if (room.players[socket.id]) {
        const name = room.players[socket.id].name;
        
        // 通知房間內其他人遊戲結束
        const remainingPlayers = Object.keys(room.players).filter(id => id !== socket.id);
        if (remainingPlayers.length > 0) {
          io.to(roomId).emit('game_ended_broadcast', {
            resultText: `${name} 斷線了，遊戲結束`,
            from: socket.id
          });
        }
        
        delete room.players[socket.id];
        delete room.choices[socket.id];

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

app.post('/api/uploadTopic', upload.any(), async (req, res) => {
  const parsedBody = qs.parse(req.body);
  const userId = String(parsedBody.userId || '').trim();
  const topicName = (parsedBody.topicName || '').trim();

  if (!userId || !topicName) {
    return res.json({ success: false, message: '缺少 userId 或 topicName' });
  }

  const exists = await Topic.findOne({ userId, name: topicName });
  const oldCards = exists ? exists.cards : [];

  const cards = [];
  for (let i = 0; i < 30; i++) {
    const name = parsedBody.cards?.[i]?.name || '';
    const file = req.files?.find(f => f.fieldname === `cards[${i}][file]`);

    if (name !== '' || file) {
      cards.push({
        name,
        img: file ? '/uploads/' + file.filename : (oldCards[i]?.img || '')
      });
    }
  }

  if (exists) {
    await Topic.updateOne({ userId, name: topicName }, { $set: { cards } });
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

const PlayerSchema = new mongoose.Schema({
  playerId: { type: String, index: true },
  name: String,
  avatar: String
}, { timestamps: true });

const Player = mongoose.model('Player', PlayerSchema);

app.post('/api/uploadAvatar', upload.single('avatar'), async (req, res) => {
  const { playerId } = req.body;
  if (!playerId || !req.file) {
    return res.json({ success: false, message: '缺少 playerId 或檔案' });
  }

  const avatarPath = '/uploads/' + req.file.filename;

  await Player.updateOne(
    { playerId },
    { $set: { avatar: avatarPath } },
    { upsert: true }
  );

  res.json({ success: true, avatar: avatarPath });
});

app.get('/api/getAvatar', async (req, res) => {
  const { playerId } = req.query;
  if (!playerId) return res.json({ success: false });

  const player = await Player.findOne({ playerId }).lean();
  res.json({ success: true, avatar: player?.avatar || '' });
});
// ===== 新增遊戲結束事件處理 =====
socket.on('game_ended', ({ roomId, resultText, myCard, opponentCard }) => {
  if (!rooms[roomId]) return;
  
  // 廣播給房間內的所有人
  io.to(roomId).emit('game_ended_broadcast', {
    resultText,
    myCard,
    opponentCard,
    from: socket.id
  });
});

socket.on('player_surrender', ({ roomId, winner, loser }) => {
  if (!rooms[roomId]) return;
  
  // 找到玩家名稱
  const winnerName = rooms[roomId].players[winner]?.name || '玩家';
  const loserName = rooms[roomId].players[loser]?.name || '玩家';
  
  // 廣播投降訊息
  io.to(roomId).emit('player_surrender_broadcast', {
    winner,
    loser,
    winnerName,
    loserName,
    message: `${loserName} 放棄了遊戲，${winnerName} 獲勝！`
  });
});

// ===== 在 disconnect 事件中也處理遊戲結束 =====
socket.on('disconnect', () => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (!room) continue;

    if (room.players[socket.id]) {
      const name = room.players[socket.id].name;
      
      // 通知房間內其他人遊戲結束
      const remainingPlayers = Object.keys(room.players).filter(id => id !== socket.id);
      if (remainingPlayers.length > 0) {
        io.to(roomId).emit('game_ended_broadcast', {
          resultText: `${name} 斷線了，遊戲結束`,
          from: socket.id
        });
      }
      
      delete room.players[socket.id];
      // ... 其他清理程式碼
    }
  }
});