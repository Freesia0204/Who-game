// === 連線到 Socket.IO server ===
const socket = io('https://who-game.onrender.com');

// ===== 全域狀態 =====
const roomId = new URLSearchParams(location.search).get('room') || 'demo-001';
const meName = localStorage.getItem('playerName') || '未知玩家';
let opponentName = '等待中';
let mySocketId = null;
let currentTurn = null;
let selectedTopic = null;
let myCard = null;
let opponentCard = null;
let canGuess = false;

// ===== DOM =====
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const gridArea = document.querySelector('.grid-area');
const rulesModal = document.getElementById('rulesModal');
const guessBtn = document.getElementById('guessBtn');

// ===== 連線與加入房間 =====
socket.on('connect', () => {
  mySocketId = socket.id;
  const isHost = new URLSearchParams(location.search).get('host') === 'true';

  if (isHost) {
    socket.emit('create_room', { roomId, name: meName });
  } else {
    socket.emit('join_room', { roomId, name: meName });
  }

  updateRoomInfo();
});

// 房間玩家更新
socket.on('room_update', ({ players }) => {
  const ids = Object.keys(players);
  const otherId = ids.find(id => id !== mySocketId);
  opponentName = otherId ? players[otherId].name : '等待中';
  updateRoomInfo();
});

// 系統訊息
socket.on('chat_message', ({ from, text }) => {
  const senderName = (from === mySocketId) ? meName : opponentName;
  addMessage(from === mySocketId ? 'player' : 'opponent', text, senderName);
});





// ===== 聊天送出 =====
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;
  socket.emit('chat_message', { roomId, from: mySocketId, text: msg });
  chatInput.value = '';
});

// ===== 輔助函式 =====
function addMessage(role, text, senderName = '') {
  const li = document.createElement('li');
  li.classList.add('message', role);

  // 加上「名稱」標籤
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


function updateRoomInfo() {
  document.getElementById('roomIdText').textContent = roomId;
  document.getElementById('playerNameText').textContent = meName;
  document.getElementById('opponentNameText').textContent = opponentName;
}

// ===== 開始遊戲按鈕 =====
window.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', startGame);
  }
});

function startGame() {
  // 關閉規則彈窗
  if (rulesModal) rulesModal.style.display = 'none';

  // 建立主題格子
  createTopicCells();

  // 系統訊息提示
  addMessage('system', '遊戲開始，請選擇主題。');
}

// ===== 主題格子資料 =====
const topics = [
  { name: '名偵探柯南', img: 'img-KN/柯南_loge.jpg' },
  { name: '名偵探柯南-紅黑篇', img: 'img-KN/柯南_loge.jpg' },
  { name: '鬼滅之刃', img: 'img-GM/鬼滅之刃-logo.png' },
  { name: '防風少年', img: 'img-WB/防風少年-logo.png' },
  { name: 'FREE!', img: 'img/topic_free.jpg' }
];

// ===== 主題選擇 =====
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
      if (mySocketId !== roomHostId) {
        addMessage('system', '只有房主可以選主題');
        return;
      }
      selectedTopic = topic.name;
      socket.emit('select_topic', { roomId, topic: selectedTopic });
    });

    gridArea.appendChild(cell);
  });
}

socket.on('topic_selected', ({ topic }) => {
  selectedTopic = topic;
  addMessage('system', `房主選擇了主題：${topic}`);
  showAntidoteSelection();
});

// ===== 解藥選擇 =====
function showAntidoteSelection() {
  gridArea.innerHTML = '';
  addMessage('system', '請選擇你的卡牌');

  const dataList = gridData[selectedTopic];
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

    cell.addEventListener('click', () => {
      if (!antidoteCell) {
        antidoteCell = item.name;
        cell.classList.add('selected-antidote');
        socket.emit('choose_antidote', { roomId, antidote: antidoteCell });
        addMessage('system', `玩家 ${meName} 已選好`);
      }
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
socket.on('rps_result', ({ hands }) => {
  const myHand = hands[mySocketId];
  const opponentId = Object.keys(hands).find(id => id !== mySocketId);
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

  turn = playerWins ? 'player' : 'opponent';
  addMessage('system', `${playerWins ? '你' : '對手'} 贏了，先問問題！`);
});

// ===== 輔助函式 =====
function addMessage(role, text) {
  const li = document.createElement('li');
  li.classList.add('message', role);
  const meta = document.createElement('div');
  meta.classList.add('meta');
  meta.textContent =
    role === 'system' ? '系統' :
    role === 'player' ? meName :
    opponentName;
  const content = document.createElement('div');
  content.textContent = text;
  li.appendChild(meta);
  li.appendChild(content);
  messagesEl.appendChild(li);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}



let roomHostId = null; // 全域變數，儲存房主 ID

socket.on('room_update', ({ players, host }) => {
  roomHostId = host; // 儲存房主 ID
  const ids = Object.keys(players);
  const otherId = ids.find(id => id !== mySocketId);
  opponentName = otherId ? players[otherId].name : '等待中';
  updateRoomInfo();
});


const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', startGame);
}

function startGame() {
  if (rulesModal) rulesModal.style.display = 'none';
  createTopicCells();
  addMessage('system', '遊戲開始，請選擇主題。');
}





