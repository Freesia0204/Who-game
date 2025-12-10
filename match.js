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
