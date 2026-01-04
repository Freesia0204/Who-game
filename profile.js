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
// ===== 點擊特效選擇功能 =====
const effectsList = document.getElementById('effectsList');

// 1. 定義特效資料（包含「無」與其他主題）
const effectsData = [
  { name: '無', img: null }, // img 為 null 表示純色
  { name: '柯南', img: 'img-KN/柯南頭像.jpg' },
  { name: 'Free', img: 'img-Free/free頭像.jpg' }
];

// 清空舊清單（防止重複生成）
if (effectsList) {
  effectsList.innerHTML = '';

  effectsData.forEach(effect => {
    const div = document.createElement('div');
    div.className = 'effect-circle';
    
    // 2. 判斷是否為「無」
    if (effect.name === '無') {
      // 使用淺灰色填滿，並放一個叉叉符號
      div.style.backgroundColor = '#d3d3d3'; 
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'center';
      div.innerHTML = '<span style="color: white; font-size: 24px; font-weight: bold;">✕</span>';
    } else {
      // 正常主題顯示圖片
      div.innerHTML = `<img src="${effect.img}" alt="${effect.name}">`;
    }

    // 3. 檢查目前 localStorage 儲存的設定（用於預設選取）
    const savedEffect = localStorage.getItem('clickEffectTheme');
    if (savedEffect === effect.name || (!savedEffect && effect.name === '無')) {
      div.classList.add('selected');
    }

    // 4. 點擊事件
    div.addEventListener('click', () => {
      // 移除其他人的選中狀態
      document.querySelectorAll('.effect-circle').forEach(c => c.classList.remove('selected'));
      // 自己加上選中狀態
      div.classList.add('selected');
      
      // 儲存選擇到 localStorage (統一 key 名稱為 clickEffectTheme)
      localStorage.setItem('clickEffectTheme', effect.name);
      
      // 小提示彈窗（選用）
      if (effect.name === '無') {
        alert('點擊特效已關閉');
      } else {
        alert(`點擊特效已設定為：${effect.name}`);
      }
    });

    effectsList.appendChild(div);
  });
}

// 主題清單：每個主題都提供各頁背景（示例用圖片）
const ThemeCatalog = {
   "初始": {
    // 初始可用你既有的漸層或對應圖片
    background_profile: "linear-gradient(135deg, #fcb1d3, #c2a3ff, #a6c1ee, #ff9a9e, #d18fff)",
    background_index:  "linear-gradient(135deg, #fcb1d3, #c2a3ff, #a6c1ee, #ff9a9e, #d18fff)",
    background_game:   "linear-gradient(135deg, #fcb1d3, #c2a3ff, #a6c1ee, #ff9a9e, #d18fff)",
    background_rank:   "linear-gradient(135deg, #fcb1d3, #c2a3ff, #a6c1ee, #ff9a9e, #d18fff)"
  },
  "名偵探柯南": {
    background_profile: "url('img-background/柯南背景.png')",
    background_index:  "url('img-background/柯南背景.png')",
    background_game:   "url('img-background/柯南背景.png')",
    background_match:   "url('img-background/柯南背景.png')"
  },
  "FREE!": {
    background_profile: "url('img-background/FREE!游泳池.jpg')",
    background_index:  "url('img-background/FREE!游泳池.jpg')",
    background_game:   "url('img-background/FREE!游泳池.jpg')",
    background_match:   "url('img-background/FREE!游泳池.jpg')"
  },
 
};
// 產生主題方格
const backgroundList = document.getElementById("backgroundList");
const themes = Object.keys(ThemeCatalog);

// 每個主題用其 profile 頁的背景作為預覽縮圖
themes.forEach(themeName => {
  const preview = ThemeCatalog[themeName].background_profile;

  // 外層容器
  const wrapper = document.createElement("div");
  wrapper.className = "bg-wrapper";

  // 背景方塊
  const div = document.createElement("div");
  div.className = "bg-option";
  div.style.background = preview;

  // 名稱文字
  const label = document.createElement("span");
  label.className = "bg-label";
  label.textContent = themeName;

  // 點擊事件
  div.addEventListener("click", () => {
    document.querySelectorAll(".bg-option").forEach(o => o.classList.remove("selected"));
    div.classList.add("selected");

    localStorage.setItem("selectedTheme", themeName);

    const pack = ThemeCatalog[themeName];
    Object.entries(pack).forEach(([pageKey, bgStyle]) => {
      localStorage.setItem(pageKey, bgStyle);
    });

    document.body.style.background = pack.background_profile;
  });

  // 組合並插入
  wrapper.appendChild(div);
  wrapper.appendChild(label);
  backgroundList.appendChild(wrapper);
});
document.addEventListener('DOMContentLoaded', () => {
    // --- 基礎資訊初始化 ---
    const playerName = localStorage.getItem('playerName') || '玩家';
    const playerId = localStorage.getItem('playerId') || 'Guest';

    const profileNameEl = document.getElementById('profileName');
    const profileIdEl = document.getElementById('profileId');
    if (profileNameEl) profileNameEl.textContent = playerName;
    if (profileIdEl) profileIdEl.textContent = playerId;

    // --- 頭像功能變數 ---
    const avatarDisplay = document.getElementById('avatarDisplay');
    const avatarInput = document.getElementById('avatarInput');
    const avatarContainer = document.getElementById('avatarContainer');

    /**
     * 初始化頭像：判斷顯示圖片或名字首字
     */
    function initAvatar() {
  if (!avatarDisplay) return;

  // 先問後端有沒有存過頭像
  fetch(`/api/getAvatar?playerId=${playerId}`)
    .then(r => r.json())
    .then(res => {
      if (res.success && res.avatar) {
        avatarDisplay.innerHTML = `<img src="${res.avatar}" 
          style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
      } else {
        // 沒有 → 顯示首字母
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#98D8C8', '#F3A683'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        avatarDisplay.innerHTML = '';
        avatarDisplay.innerText = playerName.charAt(0).toUpperCase();
        avatarDisplay.style.backgroundColor = randomColor;
        Object.assign(avatarDisplay.style, {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '30px',
          fontWeight: 'bold'
        });
      }
    });
}

// 上傳事件
avatarInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // 即時顯示
  const preview = document.createElement('img');
  preview.src = URL.createObjectURL(file);
  preview.style.width = '100%';
  preview.style.height = '100%';
  preview.style.objectFit = 'cover';
  preview.style.borderRadius = '50%';
  avatarDisplay.innerHTML = '';
  avatarDisplay.appendChild(preview);

  // 存到 localStorage
  const reader = new FileReader();
  reader.onload = (event) => {
    localStorage.setItem('avatar', event.target.result);
  };
  reader.readAsDataURL(file);

  // 同步到後端
  const formData = new FormData();
  formData.append('playerId', playerId);
  formData.append('avatar', file);

  fetch('/api/uploadAvatar', {
    method: 'POST',
    body: formData
  })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        avatarDisplay.innerHTML = `<img src="${res.avatar}" 
          style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
      }
    });
});

// 頁面載入時執行
initAvatar();
});

// 背景更換
window.addEventListener("DOMContentLoaded", () => {
  const pageKey = "background_profile"; // 改成對應頁面名稱
  const savedBg = localStorage.getItem(pageKey);
  if (savedBg) {
    document.body.style.background = savedBg;
  }
});