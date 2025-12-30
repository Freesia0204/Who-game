const fs = require('fs');
const DATA_FILE = './userTopics.json';

// 載入資料
function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE));
  }
  return {};
}

// 儲存資料
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(userTopics, null, 2));
}

// 初始化資料
let userTopics = loadData();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
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
    // 找到要刪的主題
    const topic = userTopics[userId].find(t => t.name === topicName);

    if (topic) {
      // 刪掉主題裡的圖片檔案
      topic.cards.forEach(card => {
        if (card.img && card.img.startsWith('/uploads/')) {
          const filePath = path.join(__dirname, card.img);
          fs.unlink(filePath, err => {
            if (err) console.error('刪除圖片失敗:', err);
            else console.log('已刪除圖片:', filePath);
          });
        }
      });
    }

    // 更新 JSON 資料
    userTopics[userId] = userTopics[userId].filter(t => t.name !== topicName);
    saveData();
  }

res.json({ success: true, customTopics: userTopics[userId] || [] });

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
  saveData(); // ✅ 新增這行
  res.json({ success: true, customTopics: userTopics[userId] || [] });



});

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // 存到 uploads 資料夾




app.post('/api/uploadTopic', upload.array('cards', 30), (req, res) => {
  const userId = String(req.body.userId);
  const topicName = req.body.topicName;

  if (!userId || !topicName) {
    return res.json({ success: false, message: '缺少參數' });
  }

  // 檢查是否已有同名主題
  const exists = userTopics[userId]?.some(t => t.name === topicName);
  if (exists) {
    return res.json({ success: false, message: '主題名稱已存在' });
  }

  const cards = [];

  // 先處理有圖片的卡牌
  req.files.forEach((file, index) => {
    const name = req.body[`cards[${index}][name]`];
    cards.push({
      name: name || '',
      img: `/uploads/${file.filename}`
    });
  });

  // 再補上只有文字的卡牌
 // 再補上只有文字的卡牌
for (let i = 0; i < 30; i++) {
  const name = req.body[`cards[${i}][name]`];
  if (name && !cards.find(c => c.name === name)) {
    cards.push({ name, img: '' });
  }
}



  const topic = { name: topicName, cards };

  if (!userTopics[userId]) userTopics[userId] = [];
  userTopics[userId].push(topic);
  saveData();

  console.log('儲存主題:', topic);
  res.json({ success: true, topic });

});
