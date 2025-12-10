document.getElementById('startBtn').addEventListener('click', () => {
  const name = document.getElementById('nameInput').value.trim();
  if(!name) {
    alert('請輸入名字！');
    return;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startBtn');
  const nameInput = document.getElementById('nameInput');

  startBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (name) {
      localStorage.setItem('playerName', name); // 儲存名字
      window.location.href = 'match.html';    // 跳轉到遊戲頁
    } else {
      alert('請輸入名字才能開始遊戲喔！');
    }
  });
});
