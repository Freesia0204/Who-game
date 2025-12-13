// === 連線到 Socket.IO server ===
const socket = io('https://who-game.onrender.com');

// ===== 全域狀態 =====
const roomId = new URLSearchParams(location.search).get('room') || 'demo-001';
const meName = sessionStorage.getItem('playerName');   // ✅ 改用 sessionStorage
const myPlayerId = sessionStorage.getItem('playerId'); // ✅ 改用 sessionStorage
if (!meName || !myPlayerId) {
  alert('尚未登入，請先登入');
  location.href = 'index.html';
}

const isHost = new URLSearchParams(location.search).get('host') === 'true';

let opponentName = '等待中';
let roomHostId = null;
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
  sessionStorage.setItem('socketId', socket.id); // ✅ 存下伺服器的唯一 ID

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
// 發送訊息
document.getElementById('sendBtn').addEventListener('click', () => {
  const msg = document.getElementById('chatInput').value;
  socket.emit('chat_message', { roomId, name: meName, message: msg });
});

// 接收訊息
socket.on('chat_message', ({ name, message }) => {
  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML += `<p><b>${name}:</b> ${message}</p>`;
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

function updateRoomInfo() {
  document.getElementById('roomIdText').textContent = roomId;
  document.getElementById('playerNameText').textContent = meName;
  document.getElementById('opponentNameText').textContent = opponentName;
}

// === 開始遊戲按鈕 ===
const startBtn = document.getElementById('startBtn');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    // ✅ 不再限制房主，所有人都能按
    if (rulesModal) rulesModal.style.display = 'none';
    createTopicCells();
    addMessage('system', '遊戲開始，請等待房主選擇主題。');
  });
}

function startGame() {
  if (rulesModal) rulesModal.style.display = 'none';
  createTopicCells();
  addMessage('system', '遊戲開始，請選擇主題。');
}

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
    addMessage('system', '只有房主可以選主題');
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
      if (!myCard) {
        myCard = item.name;
        cell.classList.add('selected-card');
        socket.emit('choose_card', { roomId, playerId: myPlayerId, card: myCard });
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
 const myHand = hands[players[myPlayerId].playerId]; // ✅ 用伺服器存的 playerId
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
});

// ===== 房間更新（維持你原本邏輯） =====
socket.on('room_update', ({ players, topicSelector }) => {
  const myInfo = players[socket.id];
  const otherId = Object.keys(players).find(id => id !== socket.id);
  const opponentInfo = otherId ? players[otherId] : null;

  opponentName = opponentInfo ? opponentInfo.name : '等待中';

  document.getElementById('roomIdText').textContent = roomId;
  document.getElementById('playerNameText').textContent = myInfo?.name || meName;
  document.getElementById('opponentNameText').textContent = opponentName;

  // ✅ 判斷自己是不是選題者
  if (socket.id === topicSelector && !selectedTopic) {
    createTopicCells(); // 第一人 → 顯示主題格子
  }
  // 第二人不用顯示主題，等 topic_selected 事件觸發後直接進卡牌
});




function generateUniquePlayerId() {
  let id;
  do {
    id = 'P' + Math.floor(100000 + Math.random() * 900000);
  } while (localStorage.getItem(`playerId_${id}`));
  localStorage.setItem(`playerId_${id}`, true);
  return id;
}
