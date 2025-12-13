const socket = io('https://who-game.onrender.com');
const meName = sessionStorage.getItem('playerName') || '玩家';

function generateRoomId() {
  return 'room-' + Math.floor(Math.random() * 100000);
}

// 顯示玩家名字
document.getElementById('playerName').textContent = sessionStorage.getItem('playerName') || '玩家';

// 真人對戰
document.getElementById('pvpBtn').addEventListener('click', () => {
  window.location.href = 'PVP_room.html';
});

// AI對戰
document.getElementById('aiBtn').addEventListener('click', () => {
  window.location.href = 'AI_room.html';
});

const createRoomBtn = document.getElementById('createRoomBtn');
createRoomBtn.addEventListener('click', () => {
  const roomId = generateRoomId();
  window.location.href = `PVP_room.html?room=${roomId}&host=true`;
});


