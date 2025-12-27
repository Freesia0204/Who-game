const socket = io('https://who-game.onrender.com');

// 從登入時取得玩家資訊
const meName = localStorage.getItem('playerName') || '玩家';
const myPlayerId = localStorage.getItem('playerId') || null;

function generateRoomId() {
  return 'room-' + Math.floor(Math.random() * 100000);
}

console.log('[match.js] loaded, meName=', meName, 'playerId=', myPlayerId);

// 顯示玩家名字（例如在 match.html 頁面某個元素）
const nameDisplay = document.getElementById('playerName');
if (nameDisplay) {
  nameDisplay.textContent = meName;
}

// 真人對戰
document.getElementById('pvpBtn').addEventListener('click', () => {
  window.location.href = 'PVP_room.html';
});

// AI對戰
document.getElementById('aiBtn').addEventListener('click', () => {
  window.location.href = 'AI_room.html';
});

// 加入房間
const joinRoomBtn = document.getElementById('joinRoomBtn');
if (joinRoomBtn) {
  joinRoomBtn.addEventListener('click', () => {
    const roomId = document.getElementById('roomInput').value.trim();

    if (!meName || !myPlayerId) {
      alert('尚未登入，請先回首頁登入');
      return;
    }
    if (!roomId) {
      alert('請輸入房號');
      return;
    }

    const url = `PVP_room.html?room=${roomId}`;
    console.log('[match.js] join room:', url);
    window.location.href = url;
  });
}

// 創建房間 → 跳轉，不再帶 host=true
const createRoomBtn = document.getElementById('createRoomBtn');
if (createRoomBtn) {
  createRoomBtn.addEventListener('click', () => {
    if (!meName || !myPlayerId) {
      alert('尚未登入，請先回首頁登入');
      return;
    }

    const roomId = generateRoomId();
    const url = `PVP_room.html?room=${roomId}`; // ✅ 移除 &host=true
    console.log('[match.js] create room:', url);
    window.location.href = url;
  });

  // 上一步按鈕事件
  document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'index.html'; // 直接回首頁
  });

}



