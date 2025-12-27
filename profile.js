document.addEventListener('DOMContentLoaded', () => {
  const playerName = localStorage.getItem('playerName');
  const playerId = localStorage.getItem('playerId');
  const myPlayerId = playerId; // ✅ 定義

  document.getElementById('profileName').textContent = playerName || '未登入';
  document.getElementById('profileId').textContent = playerId || '未登入';

  // 登出
  document.getElementById('goLoginBtn').addEventListener('click', () => {
    localStorage.removeItem('playerName');
    localStorage.removeItem('playerId');
    alert('已登出，下次可直接登入');
    window.location.href = 'index.html';
  });

  // 註銷
  document.getElementById('deleteBtn').addEventListener('click', () => {
    if (!playerName) {
      alert('目前沒有登入帳號');
      return;
    }
    localStorage.removeItem(`user_${playerName}`);
    localStorage.removeItem('playerName');
    localStorage.removeItem('playerId');
    alert('帳號已註銷，請重新註冊');
    window.location.href = 'index.html';
  });

  // ===== 自訂主題功能 =====
  const modal = document.getElementById('customTopicModal');
  const cardsContainer = document.getElementById('cardsContainer');

  document.getElementById('addCustomTopicBtn').addEventListener('click', () => {
    modal.style.display = 'flex';
    cardsContainer.innerHTML = '';
  });

  document.getElementById('closeModalBtn').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // 新增卡片
  document.getElementById('addCardBtn').addEventListener('click', () => {
    const count = cardsContainer.querySelectorAll('.card-item').length;
    if (count >= 30) {
      alert('最多只能新增 30 格');
      return;
    }
    const div = document.createElement('div');
    div.className = 'card-item';
    div.innerHTML = `
      <input type="text" placeholder="卡片文字">
      <input type="file" accept="image/*">
    `;
    cardsContainer.appendChild(div);
  });

  // 儲存主題
  document.getElementById('saveTopicBtn').addEventListener('click', () => {
    const topicName = document.getElementById('topicNameInput').value.trim();
    if (!topicName) {
      alert('請輸入主題名稱');
      return;
    }

    const cards = [];
    cardsContainer.querySelectorAll('.card-item').forEach(item => {
      const text = item.querySelector('input[type="text"]').value.trim();
      const fileInput = item.querySelector('input[type="file"]');
      let img = null;
      if (fileInput.files[0]) {
        img = URL.createObjectURL(fileInput.files[0]); // 前端預覽用
      }
      if (text) {
        cards.push({ name: text, img });
      }
    });

    const topic = { name: topicName, cards };

    // 呼叫後端 API 儲存
    fetch('/api/saveCustomTopic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: myPlayerId, topic })
    }).then(r => r.json()).then(res => {
      if (res.success) {
        alert('自訂主題已儲存');
        modal.style.display = 'none';
        loadCustomTopics(); // 重新載入
      }
    });
  });

  // 載入自訂主題
  function loadCustomTopics() {
    fetch(`/api/getCustomTopics?userId=${myPlayerId}`)
      .then(r => r.json())
      .then(data => {
        const list = document.getElementById('customTopicsList');
        list.innerHTML = '';
        data.customTopics.forEach(topic => {
          const div = document.createElement('div');
          div.textContent = topic.name;
          list.appendChild(div);
        });
      });
  }

  loadCustomTopics();
});
