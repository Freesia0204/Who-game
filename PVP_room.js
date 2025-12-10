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
  socket.emit('join_room', { roomId, name: meName });
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
socket.on('system_message', (text) => addMessage('system', text));

// 聊天訊息
socket.on('chat_message', ({ from, text }) => {
  addMessage(from === mySocketId ? 'player' : 'opponent', text);
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
function addMessage(role, text) {
  const li = document.createElement('li');
  li.classList.add('message', role);
  li.textContent = text;
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

// ===== 建立主題格子 =====
function createTopicCells() {
  gridArea.innerHTML = '';
  topics.forEach(topic => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const img = document.createElement('img');
    img.src = topic.img;
    img.alt = topic.name;
    const text = document.createElement('div');
    text.className = 'cell-text';
    text.textContent = topic.name;
    cell.appendChild(img);
    cell.appendChild(text);

    cell.addEventListener('click', () => {
      selectedTopic = topic.name;
      socket.emit('select_topic', { roomId, topic: topic.name });
    });

    gridArea.appendChild(cell);
  });
}
