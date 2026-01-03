document.addEventListener('DOMContentLoaded', () => {
  const playerName = localStorage.getItem('playerName');
  const playerId = localStorage.getItem('playerId');
  const myPlayerId = playerId;

  // 顯示玩家資訊
  document.getElementById('profileName').textContent = playerName || '未登入';
  document.getElementById('profileId').textContent = playerId || '未登入';

  // 登出
  document.getElementById('goLoginBtn').addEventListener('click', () => {
    if (confirm('確定要登出嗎？')) {
      localStorage.removeItem('playerName');
      localStorage.removeItem('playerId');
      alert('已登出，下次可直接登入');
      window.location.href = 'index.html';
    }
  });

  // 註銷
  document.getElementById('deleteBtn').addEventListener('click', () => {
    if (!playerName) {
      alert('目前沒有登入帳號');
      return;
    }
    if (confirm('⚠️ 確定要註銷帳號嗎？此動作無法復原！')) {
      localStorage.removeItem(`user_${playerName}`);
      localStorage.removeItem('playerName');
      localStorage.removeItem('playerId');
      alert('帳號已註銷，請重新註冊');
      window.location.href = 'index.html';
    }
  });

  // ===== 自訂主題功能 =====
  const modal = document.getElementById('customTopicModal');
  const cardGrid = document.getElementById('cardGrid');
  const addCardBtn = document.getElementById('addCardBtn');
  const saveTopicBtn = document.getElementById('saveTopicBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const deleteTopicBtn = document.getElementById('deleteTopicBtn');
  const topicNameInput = document.getElementById('topicNameInput');

  // 共用函式：新增或載入卡片
  function renderCardSlot(card, index) {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.innerHTML = `
      <div class="card-header delete-bar">🗑️ 刪除此卡牌</div>
      <div class="card-image ${card?.img ? 'has-image' : ''}">
        ${card?.img ? `<img src="${card.img}" alt="預覽圖片">` : ''}
        <input type="file" accept="image/*">
      </div>
      <div class="card-text">
        <input type="text" value="${card?.name || ''}" placeholder="輸入文字">
      </div>
    `;

    cardGrid.appendChild(slot);

    // 刪除卡牌
    slot.querySelector('.delete-bar').addEventListener('click', (e) => {
      e.stopPropagation();
      slot.remove();
    });

    // 綁定圖片上傳
    const imageContainer = slot.querySelector('.card-image');
    const fileInput = slot.querySelector('input[type="file"]');

    imageContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-bar')) return;
      fileInput.click();
    });

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
  }

  // 打開 Modal → 初始一格
  document.getElementById('addCustomTopicBtn').addEventListener('click', () => {
    modal.style.display = 'flex';
    cardGrid.innerHTML = '';
    topicNameInput.value = '';
    renderCardSlot(null);
  });

  // 關閉 Modal
  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    cardGrid.innerHTML = '';
    topicNameInput.value = '';
    deleteTopicBtn.onclick = null;
  });

  // 新增卡牌
  addCardBtn.addEventListener('click', () => {
    if (cardGrid.querySelectorAll('.card-slot').length >= 30) {
      alert('最多只能新增 30 格');
      return;
    }
    renderCardSlot(null);
  });

  // 載入自訂主題名稱列表
  function loadCustomTopics() {
    fetch(`/api/getCustomTopics?userId=${myPlayerId}`)
      .then(r => r.json())
      .then(data => {
        const list = document.getElementById('customTopicsList');
        list.innerHTML = '';

        data.customTopics.forEach(topic => {
          const div = document.createElement('div');
          div.className = 'topic-item';
          div.textContent = topic.name;

          div.addEventListener('click', () => {
            topicNameInput.value = topic.name;
            cardGrid.innerHTML = '';

            topic.cards.forEach((card, i) => renderCardSlot(card, i));

            deleteTopicBtn.onclick = () => {
              if (confirm(`確定要刪除主題「${topic.name}」嗎？`)) {
                fetch('/api/deleteCustomTopic', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: myPlayerId, topicName: topic.name })
                })
                  .then(r => r.json())
                  .then(res => {
                    if (res.success) {
                      alert('主題已刪除');
                      modal.style.display = 'none';
                      loadCustomTopics();
                    } else {
                      alert('刪除失敗');
                    }
                  })
                  .catch(err => {
                    console.error('API 錯誤:', err);
                    alert('伺服器錯誤，請稍後再試');
                  });
              }
            };

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
    if (!topicName) {
      alert('請輸入主題名稱');
      return;
    }

    const formData = new FormData();
    formData.append('userId', myPlayerId);
    formData.append('topicName', topicName);

    cardGrid.querySelectorAll('.card-slot').forEach((slot, index) => {
      const text = slot.querySelector('input[type="text"]').value.trim();
      const fileInput = slot.querySelector('input[type="file"]');
      const file = fileInput?.files?.[0];

      formData.append(`cards[${index}][name]`, text || '');
      if (file) {
        formData.append(`cards[${index}][file]`, file);
      }
    });

    fetch('/api/uploadTopic', {
      method: 'POST',
      body: formData
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          alert(res.updated ? '主題已更新' : '自訂主題已儲存');
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
const effectsData = [
  { name: '星星', img: 'img-KN/柯南_loge.jpg' },
  { name: '愛心', img: 'img-GM/鬼滅之刃-logo.png' },
  { name: '柯南', img: 'img/effects/conan.png' },
  { name: 'Free!', img: 'img/effects/free.png' }
];

const effectsList = document.getElementById('effectsList');

effectsData.forEach(effect => {
  const div = document.createElement('div');
  div.className = 'effect-circle';
  div.innerHTML = `<img src="${effect.img}" alt="${effect.name}">`;
  
  div.addEventListener('click', () => {
    document.querySelectorAll('.effect-circle').forEach(c => c.classList.remove('selected'));
    div.classList.add('selected');
    // ✅ 儲存玩家選擇
    localStorage.setItem('clickEffect', effect.name);
  });

  effectsList.appendChild(div);
});

// 預設載入玩家選擇
const savedEffect = localStorage.getItem('clickEffect');
if (savedEffect) {
  const selected = [...document.querySelectorAll('.effect-circle')]
    .find(c => c.querySelector('img').alt === savedEffect);
  if (selected) selected.classList.add('selected');
}


// 背景選項清單
const backgrounds = [
  { name: "初始背景", key: "default", type: "gradient", style: `linear-gradient(135deg,
      #fcb1d3,
      #c2a3ff,
      #a6c1ee,
      #ff9a9e,
      #d18fff)` },

  // 後面改成圖片
  { name: "海灘", key: "beach", type: "image", style: "url('img-GM/愈史郎.jpg')" },
  { name: "森林", key: "forest", type: "image", style: "url('背景.jpg')" },
  { name: "夜空", key: "night", type: "image", style: "url('images/bg-night.jpg')" },
  { name: "城市", key: "city", type: "image", style: "url('images/bg-city.jpg')" }
];

const backgroundList = document.getElementById("backgroundList");

// 插入背景選項
backgrounds.forEach(bg => {
  const div = document.createElement("div");
  div.className = "bg-option";
  div.style.background = bg.style;
  div.title = bg.name;

  div.addEventListener("click", () => {
    // 標記選中
    document.querySelectorAll(".bg-option").forEach(opt => opt.classList.remove("selected"));
    div.classList.add("selected");

    // 套用背景到 body
    document.body.style.background = bg.style;

    // 儲存到 localStorage（依頁面 key）
    localStorage.setItem("background_profile", bg.style);
    localStorage.setItem("background_index", bg.style);
    localStorage.setItem("background_game", bg.style);
    localStorage.setItem("background_rank", bg.style);
  });

  backgroundList.appendChild(div);
});

// 背景更換
window.addEventListener("DOMContentLoaded", () => {
  const pageKey = "background_profile"; // 改成對應頁面名稱
  const savedBg = localStorage.getItem(pageKey);
  if (savedBg) {
    document.body.style.background = savedBg;
  }
});