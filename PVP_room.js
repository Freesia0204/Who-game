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
const roomInfoEl = document.getElementById('roomInfo');
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

// 主題選擇
socket.on('topic_selected', ({ topic }) => {
  selectedTopic = topic;
  addMessage('system', `主題已選：${topic}`);
  showCardSelection();
});

// 卡牌選擇
socket.on('card_selected', ({ playerId, cardName }) => {
  if (playerId === mySocketId) myCard = cardName;
  else opponentCard = cardName;
  addMessage('system', `${playerId === mySocketId ? '你' : '對手'} 選了卡牌`);
});

// 猜拳
socket.on('rps_start', () => {
  addMessage('system', '猜拳開始，請出拳');
  const options = ['石頭', '剪刀', '布'];
  const hand = options[Math.floor(Math.random() * 3)];
  socket.emit('rps_hand', { roomId, hand });
});

socket.on('rps_result', ({ p1, p2, firstTurn }) => {
  addMessage('system', `猜拳結果：P1 ${p1} vs P2 ${p2}`);
});

socket.on('turn_update', ({ turn }) => {
  currentTurn = turn;
  addMessage('system', `現在輪到 ${turn === mySocketId ? '你' : '對手'}`);
  updateGuessButtonState();
});

// 問答
socket.on('question_asked', ({ from, text }) => {
  addMessage(from === mySocketId ? 'player' : 'opponent', `提問：${text}`);
});
socket.on('question_answered', ({ from, answer }) => {
  addMessage(from === mySocketId ? 'player' : 'opponent', `回答：${answer}`);
});

// 猜模式
socket.on('guess_mode_started', ({ by }) => {
  addMessage('system', `${by === mySocketId ? '你' : '對手'} 進入猜模式`);
  gridArea.classList.add('guess-mode');
});
socket.on('guess_result', ({ from, targetCardName, correct }) => {
  addMessage(from === mySocketId ? 'player' : 'opponent',
             `我猜是 ${targetCardName} → ${correct ? '猜對！' : '猜錯'}`);
});
socket.on('game_end', ({ winner, p1Card, p2Card }) => {
  endGame(winner === mySocketId ? '你贏了！' : '對手贏了！', p1Card, p2Card);
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


function updateGuessButtonState() {
  guessBtn.style.display = (currentTurn === mySocketId && canGuess) ? 'inline-block' : 'none';
}
function endGame(resultText, p1Card, p2Card) {
  addMessage('system', '遊戲結束');
  const endModal = document.getElementById('endModal');
  document.getElementById('endResultText').textContent = resultText;
  document.getElementById('endChoicesText').textContent = `你選的是：${myCard} ｜ 對手選的是：${opponentCard}`;
  endModal.style.display = 'flex';
}

// ===== 主題格子資料 =====
const topics = [
  { name: '名偵探柯南', img: 'img-KN/柯南_loge.jpg' },
  { name: '名偵探柯南-紅黑篇', img: 'img-KN/柯南_loge.jpg' },
  { name: '鬼滅之刃', img: 'img-GM/鬼滅之刃-logo.png' },
  { name: '防風少年', img: 'img-WB/防風少年-logo.png' },
  { name: 'FREE!', img: 'img/topic_free.jpg' }
];

// ===== 選主題格子 =====
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

// ===== 顯示卡牌選擇 =====
async function showCardSelection() {
  gridArea.innerHTML = '';
  addMessage('system', '請選擇你的卡牌');

  const dataList = await loadTopicData(selectedTopic);
  dataList.forEach(item => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.name = item.name;
    const img = document.createElement('img');
    img.src = item.img;
    img.alt = item.name;
    const text = document.createElement('div');
    text.className = 'cell-text';
    text.textContent = item.name;
    cell.appendChild(img);
    cell.appendChild(text);

    cell.addEventListener('click', () => {
      if (!myCard) {
        cell.classList.add('selected-antidote');
        myCard = item.name;
        socket.emit('select_card', { roomId, cardName: item.name });
      } else if (gridArea.classList.contains('guess-mode') && currentTurn === mySocketId) {
        socket.emit('make_guess', { roomId, from: mySocketId, targetCardName: item.name });
      }
    });

    gridArea.appendChild(cell);
  });
}

// ===== 載入角色資料 =====
async function loadTopicData(topic) {
  const map = {
    '名偵探柯南': 'data/conan.json',
    '名偵探柯南-紅黑篇': 'data/conan_redblack.json',
    '鬼滅之刃': 'data/ghost.json',
    '防風少年': 'data/wind_breaker.json',
    'FREE!': 'data/free.json',
  };
  const url = map[topic];
  const res = await fetch(url);
  return res.json();
}

window.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn'); // ✅ 跟 HTML 對應
  if (startBtn) startBtn.addEventListener('click', startGame);
});

function startGame() {
  if (rulesModal) rulesModal.style.display = 'none'; // ✅ 關閉規則彈窗
  createTopicCells();
  addMessage('system', '遊戲開始，請選擇主題。');
}

