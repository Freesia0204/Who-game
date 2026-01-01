document.addEventListener('DOMContentLoaded', () => {
  const playerName = localStorage.getItem('playerName');
  const playerId = localStorage.getItem('playerId');
  const myPlayerId = playerId;

  // 顯示玩家資訊
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
  const cardGrid = document.getElementById('cardGrid');
  const addCardBtn = document.getElementById('addCardBtn');
  const saveTopicBtn = document.getElementById('saveTopicBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const topicNameInput = document.getElementById('topicNameInput');

  let cardCount = 0;

  function createCardSlot() {
  const div = document.createElement('div');
  div.className = 'card-slot';

  const fileInputId = `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  div.innerHTML = `
    <div class="card-header delete-bar">🗑️ 刪除此卡牌</div>
    <div class="card-image">
      <input type="file" accept="image/*" id="${fileInputId}">
    </div>
    <div class="card-text">
      <input type="text" placeholder="輸入文字">
    </div>
  `;

  cardGrid.appendChild(div);

  const imageContainer = div.querySelector('.card-image');
  const fileInput = div.querySelector(`#${fileInputId}`);
  const removeBtn = div.querySelector('.delete-bar');

  // 點擊圖片區 → 開檔案選擇
  imageContainer.addEventListener('click', (e) => {
    if (e.target === removeBtn) return;
    fileInput.click();
  });

  // 圖片預覽
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const preview = document.createElement('img');
    preview.src = URL.createObjectURL(file);
    imageContainer.classList.add('has-image');
    [...imageContainer.children].forEach(child => {
      if (child.tagName === 'IMG') child.remove();
    });
    imageContainer.appendChild(preview);
  });

  // 整條刪除卡牌
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    div.remove();
  });

  cardCount++;
}



  // 打開 Modal → 初始一格
  document.getElementById('addCustomTopicBtn').addEventListener('click', () => {
    modal.style.display = 'flex';
    cardGrid.innerHTML = '';
    cardCount = 0;
    createCardSlot();
  });

  // 關閉 Modal
  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    cardGrid.innerHTML = '';
    topicNameInput.value = '';
  });

  // 新增卡牌
  addCardBtn.addEventListener('click', () => {
    if (cardGrid.querySelectorAll('.card-slot').length >= 30) {
      alert('最多只能新增 30 格');
      return;
    }
    createCardSlot();
  });

  

// 載入自訂主題名稱列表
function loadCustomTopics() {
  

  fetch(`/api/getCustomTopics?userId=${myPlayerId}`)
    .then(r => r.json())
    .then(data => {
      console.log('✅ API 回傳資料:', data);
      const list = document.getElementById('customTopicsList');
      list.innerHTML = '';

      data.customTopics.forEach(topic => {
        const div = document.createElement('div');
        div.className = 'topic-item';
        div.textContent = topic.name;
        console.log('卡牌資料:', topic.cards);

        // 點擊預覽與修改
        div.addEventListener('click', () => {
          topicNameInput.value = topic.name;
          cardGrid.innerHTML = '';
          topic.cards.forEach(card => {
  const slot = document.createElement('div');
  slot.className = 'card-slot';
  slot.innerHTML = `
    <div class="card-header delete-bar">🗑️ 刪除此卡牌</div>
    <div class="card-image has-image">
      <img src="${card.img}" alt="預覽圖片">
      <input type="file" accept="image/*">
    </div>
    <div class="card-text">
      <input type="text" value="${card.name}">
    </div>
  `;
  cardGrid.appendChild(slot);
});



          modal.style.display = 'flex';
        });

        list.appendChild(div);
      });
    })
    .catch(err => console.error('API 錯誤:', err));
}

loadCustomTopics();
// 儲存主題
saveTopicBtn.addEventListener('click', () => {
  const topicName = topicNameInput.value.trim();
  console.log('前端送出的 userId:', myPlayerId);
  console.log('送出的 topicName:', topicName);

  if (!topicName) {
    alert('請輸入主題名稱');
    return;
  }

  const formData = new FormData();
  formData.append('userId', myPlayerId);
  formData.append('topicName', topicName);



  // 把每張卡牌的文字和圖片一起送
  cardGrid.querySelectorAll('.card-slot').forEach((slot, index) => {
  const text = slot.querySelector('input[type="text"]').value.trim();
  const fileInput = slot.querySelector('input[type="file"]');
  const file = fileInput?.files?.[0];

  // 送文字
  if (text) {
    formData.append(`cards[${index}][name]`, text);
  }

  // 送圖片（只有真的有檔案才送）
  if (file) {
    formData.append('cards', file);
  }
});



for (let pair of formData.entries()) {
  console.log('🧾 formData:', pair[0], pair[1]);
}


  fetch('/api/uploadTopic', {
    method: 'POST',
    body: formData
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        alert('自訂主題已儲存');
        modal.style.display = 'none';
        loadCustomTopics();
      } else {
        alert('儲存失敗：' + (res.message || '未知錯誤'));
      }
    })
    .catch(err => {
      console.error('API 錯誤:', err);
      alert('伺服器錯誤，請稍後再試');
    });
});

});

