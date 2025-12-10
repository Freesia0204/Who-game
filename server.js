// === 連線到 Socket.IO server ===
const socket = io('https://who-game.onrender.com');

// ===== 全域狀態 =====
const roomId = new URLSearchParams(location.search).get('room') || 'demo-001';
const meName = localStorage.getItem('playerName') || '未知玩家';
let opponentName = '等待中';
let mySocketId = null;

// ===== DOM =====
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const gridArea = document.querySelector('.grid-area');
const rulesModal = document.getElementById('rulesModal');

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
