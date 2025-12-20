// === 連線到 Socket.IO server ===
const socket = io('https://who-game.onrender.com');

// ===== 全域狀態 =====
const roomId = new URLSearchParams(location.search).get('room') || 'demo-001';
const meName = sessionStorage.getItem('playerName') || localStorage.getItem('playerName');
let myPlayerId = sessionStorage.getItem('playerId') || localStorage.getItem('playerId');


if (!meName || !myPlayerId) {
  alert('尚未登入，請先登入');
  location.href = 'index.html';
}

const isHost = new URLSearchParams(location.search).get('host') === 'true';

let opponentName = '等待中';
let currentTurn = null;
let selectedTopic = null;
let myCard = null;
let opponentCard = null;
let canGuess = false;
let topicSelector = null;

// ===== DOM =====
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const gridArea = document.querySelector('.grid-area');
const rulesModal = document.getElementById('rulesModal');
const guessBtn = document.getElementById('guessBtn');

// ===== 主題資料庫載入（和 AI 共用） =====
let gridData = {};

Promise.all([
  fetch('data/conan.json').then(r => r.json()),
  fetch('data/conan_redblack.json').then(r => r.json()),
  fetch('data/ghost.json').then(r => r.json()),
  fetch('data/wind_breaker.json').then(r => r.json()),
  fetch('data/free.json').then(r => r.json())
])
.then(([conan, conanRed, ghost, wind, free]) => {
  gridData['名偵探柯南'] = conan;
  gridData['名偵探柯南-紅黑篇'] = conanRed;
  gridData['鬼滅之刃'] = ghost;
  gridData['防風少年'] = wind;
  gridData['FREE!'] = free;
  console.log('角色資料載入完成');
});
// ===== 連線與加入房間 =====
socket.on('connect', () => {
  sessionStorage.setItem('socketId', socket.id);

  if (isHost) {
    socket.emit('create_room', { roomId, playerId: myPlayerId, name: meName });
  } else {
    socket.emit('join_room', { roomId, playerId: myPlayerId, name: meName });
  }
});


// ===== 系統訊息 =====
socket.on('chat_message', ({ from, text, name }) => {
  const role = (from === myPlayerId) ? 'player' : 'opponent';
  addMessage(role, text, name);
});

// ===== 聊天送出 =====
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit('chat_message', { roomId, from: myPlayerId, name: meName, text: msg });
  chatInput.value = '';
});

// ===== 輔助函式 =====
function addMessage(role, text, senderName = '') {
  const li = document.createElement('li');
  li.classList.add('message', role);

  if (senderName) {
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('sender');
    nameSpan.textContent = senderName + ' ';
    li.appendChild(nameSpan);
  }

  const msgSpan = document.createElement('span');
  msgSpan.textContent = text;
  li.appendChild(msgSpan);

  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
// === 開始遊戲按鈕 ===
document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (rulesModal) {
        rulesModal.style.display = 'none';
      }
      if (socket.id === topicSelector) {
  addMessage('system', '請房主先邀請其他玩家再選擇主題');
}

      socket.emit('start_game', { roomId });
    });
  }
});

// ===== 主題格子資料 =====
const topics = [
  { name: '名偵探柯南', img: 'img-KN/柯南_loge.jpg' },
  { name: '名偵探柯南-紅黑篇', img: 'img-KN/柯南_loge.jpg' },
  { name: '鬼滅之刃', img: 'img-GM/鬼滅之刃-logo.png' },
  { name: '防風少年', img: 'img-WB/防風少年-logo.png' },
  { name: 'FREE!', img: 'img-Free/Free_logo.png' }
];

// === 主題選擇 ===
function createTopicCells() {
  gridArea.innerHTML = '';
  topics.forEach(topic => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const img = document.createElement('img');
    img.src = topic.img;
    img.alt = topic.name;
    const text = document.createElement('div');
    text.textContent = topic.name;
    text.className = 'cell-text';
    cell.appendChild(img);
    cell.appendChild(text);

    cell.addEventListener('click', () => {
      if (socket.id !== topicSelector) {
        addMessage('system', '只有第一個進房的人可以選主題');
        return;
      }
      selectedTopic = topic.name;
      socket.emit('select_topic', { roomId, topic: selectedTopic, playerId: myPlayerId });
    });

    gridArea.appendChild(cell);
  });
}

socket.on('topic_selected', ({ topic }) => {
  selectedTopic = topic;
  addMessage('system', `玩家選擇了主題：${topic}`);
  showCardSelection(); // ✅ 所有人都進入卡牌選擇
});
// ===== 卡牌選擇 =====
function showCardSelection() {
  gridArea.innerHTML = '';
  addMessage('system', '請選擇你的卡牌');

  const dataList = gridData[selectedTopic];
  if (!dataList) {
    addMessage('system', '⚠️ 主題資料尚未載入完成，請稍候再試');
    return;
  }

  dataList.forEach(item => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.name = item.name;

    const img = document.createElement('img');
    img.src = item.img;
    img.alt = item.name;
    const text = document.createElement('div');
    text.textContent = item.name;
    text.className = 'cell-text';
    cell.appendChild(img);
    cell.appendChild(text);

    // 左鍵選卡或翻轉
    cell.addEventListener('click', () => {
      if (!myCard) {
        // 第一次選卡 → 標記
        myCard = item.name;
        cell.classList.add('selected-antidote'); // 金色邊框 + 🍀 標記
        socket.emit('choose_card', { roomId, playerId: myPlayerId, card: myCard });
        addMessage('system', `玩家 ${meName} 已選好`);
      } else {
        // 已選卡 → 點擊翻轉
        cell.classList.toggle('flipped');
      }
    });

    // 右鍵翻轉
    cell.addEventListener('contextmenu', e => {
      e.preventDefault();
      cell.classList.toggle('flipped');
    });

    gridArea.appendChild(cell);
  });
}



socket.on('player_chosen', ({ player }) => {
  addMessage('system', `${player} 已選好`);
});

socket.on('game_start', () => {
  addMessage('system', '雙方都選好，遊戲開始！');
  socket.emit('start_rps', { roomId });
});

// ===== 猜拳流程 =====
let rpsFinished = false;

socket.on('rps_result', ({ hands }) => {
  if (rpsFinished) return; // ✅ 已經有勝負就不再處理

  const myHand = hands[myPlayerId];
  const opponentId = Object.keys(hands).find(id => id !== myPlayerId);
  const opponentHand = hands[opponentId];

  addMessage('player', `你出拳：${myHand}`);
  addMessage('opponent', `對手出拳：${opponentHand}`);

  if (myHand === opponentHand) {
    addMessage('system', '平手，重新猜拳...');
    socket.emit('start_rps', { roomId });
    return;
  }

  const playerWins =
    (myHand === '石頭' && opponentHand === '剪刀') ||
    (myHand === '剪刀' && opponentHand === '布') ||
    (myHand === '布' && opponentHand === '石頭');

  currentTurn = playerWins ? 'player' : 'opponent';
  addMessage('system', `${playerWins ? '你' : '對手'} 贏了，先問問題！`);

  rpsFinished = true; // ✅ 標記結束
  socket.emit('rps_done', { roomId });
});



// ===== 房間更新 =====
socket.on('room_update', ({ players, topicSelector: selector }) => {
  topicSelector = selector;

  // 取出自己的 playerId
  const myInfo = players[socket.id];
  if (myInfo) {
    myPlayerId = myInfo.playerId; // ✅ 更新全域 myPlayerId
  }

  const otherId = Object.keys(players).find(id => id !== socket.id);
  const opponentInfo = otherId ? players[otherId] : null;

  opponentName = opponentInfo ? opponentInfo.name : '等待中';

  document.getElementById('roomIdText').textContent = roomId;
  document.getElementById('playerNameText').textContent = myInfo?.name || meName;
  document.getElementById('opponentNameText').textContent = opponentName;

  if (socket.id === topicSelector && !selectedTopic) {
    createTopicCells();
  }
});



// ===== 產生唯一玩家 ID =====
function generateUniquePlayerId() {
  let id;
  do {
    id = 'P' + Math.floor(100000 + Math.random() * 900000);
  } while (localStorage.getItem(`playerId_${id}`));
  localStorage.setItem(`playerId_${id}`, "true");
  return id;
}
// 系統訊息廣播
socket.on('system_message', (text) => {
  addMessage('system', text);

  // 如果有人退出房間 → 顯示斷線彈窗
  if (text.includes('離開了房間')) {
    showDisconnectModal();
  }
});

// 顯示斷線彈窗
function showDisconnectModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <p>⚠️ 對手已斷線，請回到首頁重新開始遊戲。</p>
      <button id="backHomeBtn">回首頁</button>
    </div>
  `;
  document.body.appendChild(modal);

  const backBtn = document.getElementById('backHomeBtn');
  backBtn.addEventListener('click', () => {
    location.href = 'index.html';
  });
}
function renderLeftDecoration() {
  const leftArea = document.querySelector('.left-decoration');
  if (!leftArea || selectedTopic) return; // ✅ 主題選完就不顯示

  leftArea.innerHTML = ''; // 清空

  const sampleImages = [
    'img-KN/柯南_loge.jpg',
    'img-GM/鬼滅之刃-logo.png',
    'img-WB/防風少年-logo.png',
    'img-Free/Free_logo.png'
  ];

  sampleImages.forEach(src => {
    const cell = document.createElement('div');
    cell.className = 'cell';

    const img = document.createElement('img');
    img.src = src;
    img.alt = '裝飾';

    cell.appendChild(img);
    leftArea.appendChild(cell);
  });
}
