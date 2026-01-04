document.addEventListener('DOMContentLoaded', () => {
  // ===== 基礎初始化 =====
  const playerName = localStorage.getItem('playerName') || '玩家';
  const playerId = localStorage.getItem('playerId') || 'Guest';
  const myPlayerId = playerId;

  // 顯示玩家資訊
  document.getElementById('profileName').textContent = playerName;
  document.getElementById('profileId').textContent = playerId;

  // ===== 登出功能 =====
  document.getElementById('goLoginBtn').addEventListener('click', () => {
    if (confirm('確定要登出嗎？')) {
      localStorage.removeItem('playerName');
      localStorage.removeItem('playerId');
      alert('已登出，下次可直接登入');
      window.location.href = 'index.html';
    }
  });

  // ===== 註銷功能 =====
  document.getElementById('deleteBtn').addEventListener('click', () => {
    if (!playerName || playerName === '玩家') {
      alert('目前沒有登入帳號');
      return;
    }
    if (confirm('⚠️ 確定要註銷帳號嗎？此動作無法復原！')) {
      localStorage.removeItem(`user_${playerName}`);
      localStorage.removeItem('playerName');
      localStorage.removeItem('playerId');
      localStorage.removeItem('avatar'); // 清除頭像
      alert('帳號已註銷，請重新註冊');
      window.location.href = 'index.html';
    }
  });

  // ===== 頭像功能 =====
const avatarDisplay = document.getElementById('avatarDisplay');
const avatarInput = document.getElementById('avatarInput');
const avatarContainer = document.getElementById('avatarContainer');

/**
 * 初始化頭像：判斷顯示圖片或名字首字
 */
function initAvatar() {
  if (!avatarDisplay) {
    console.warn('avatarDisplay 元素不存在');
    return;
  }
  
  console.log('初始化頭像...', { playerName, playerId });

  // 先檢查 localStorage
  const localAvatar = localStorage.getItem('avatar');
  console.log('localStorage 頭像:', localAvatar ? '有' : '無');
  
  if (localAvatar) {
    // 確保 avatarDisplay 的樣式正確
    avatarDisplay.innerHTML = '';
    avatarDisplay.style.background = 'none';
    avatarDisplay.style.borderRadius = '50%';
    avatarDisplay.style.overflow = 'hidden';
    
    const img = document.createElement('img');
    img.src = localAvatar;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';
    avatarDisplay.appendChild(img);
    return;
  }

  // 如果有上傳過的頭像檔案
  const savedAvatarUrl = localStorage.getItem('avatarUrl');
  if (savedAvatarUrl) {
    avatarDisplay.innerHTML = '';
    const img = document.createElement('img');
    img.src = savedAvatarUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';
    avatarDisplay.appendChild(img);
    return;
  }

  // 都沒有 → 顯示首字母
  displayInitialAvatar();
}

/**
 * 顯示首字母頭像
 */
function displayInitialAvatar() {
  if (!avatarDisplay) return;
  
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#98D8C8', '#F3A683'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  avatarDisplay.innerHTML = '';
  avatarDisplay.textContent = playerName.charAt(0).toUpperCase();
  avatarDisplay.style.backgroundColor = randomColor;
  avatarDisplay.style.color = 'white';
  avatarDisplay.style.display = 'flex';
  avatarDisplay.style.alignItems = 'center';
  avatarDisplay.style.justifyContent = 'center';
  avatarDisplay.style.fontSize = '30px';
  avatarDisplay.style.fontWeight = 'bold';
  avatarDisplay.style.borderRadius = '50%';
  avatarDisplay.style.width = '100%';
  avatarDisplay.style.height = '100%';
}

/**
 * 處理頭像上傳
 */
function handleAvatarUpload(file) {
  if (!file || !avatarDisplay) return;
  
  console.log('上傳頭像檔案:', file.name, file.type);
  
  // 即時預覽
  const previewUrl = URL.createObjectURL(file);
  
  // 清除之前的內容
  avatarDisplay.innerHTML = '';
  avatarDisplay.style.background = 'none';
  
  // 創建圖片元素
  const img = document.createElement('img');
  img.src = previewUrl;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.borderRadius = '50%';
  avatarDisplay.appendChild(img);
  
  // 存到 localStorage (base64)
  const reader = new FileReader();
  reader.onload = (event) => {
    const base64Data = event.target.result;
    localStorage.setItem('avatar', base64Data);
    localStorage.setItem('avatarUrl', previewUrl); // 也存 URL
    console.log('頭像已存到 localStorage');
  };
  reader.readAsDataURL(file);
  
  // 同步到後端 (如果後端 API 可用)
  if (playerId && playerId !== 'Guest') {
    const formData = new FormData();
    formData.append('playerId', playerId);
    formData.append('avatar', file);
    
    fetch('/api/uploadAvatar', {
      method: 'POST',
      body: formData
    })
      .then(r => {
        if (!r.ok) throw new Error('API 回應錯誤');
        return r.json();
      })
      .then(res => {
        if (res.success) {
          console.log('後端頭像上傳成功:', res);
        } else {
          console.warn('後端上傳失敗:', res.message);
        }
      })
      .catch(err => {
        console.error('後端上傳錯誤:', err);
        // 本地存儲已成功，所以可以繼續
      });
  }
}

// 綁定頭像點擊事件
if (avatarContainer) {
  avatarContainer.addEventListener('click', () => {
    console.log('點擊頭像區域');
    if (avatarInput) {
      avatarInput.click();
    }
  });
}

// 綁定檔案選擇事件
if (avatarInput) {
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log('未選擇檔案');
      return;
    }
    
    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案');
      return;
    }
    
    // 檢查檔案大小 (限制 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('圖片大小不能超過 5MB');
      return;
    }
    
    handleAvatarUpload(file);
    
    // 重置 input，讓可以再次選擇相同檔案
    avatarInput.value = '';
  });
}

// 如果有上傳頭像的按鈕，也綁定事件
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
if (uploadAvatarBtn) {
  uploadAvatarBtn.addEventListener('click', () => {
    if (avatarInput) {
      avatarInput.click();
    }
  });
}



// ===== 頁面載入時初始化頭像 =====
document.addEventListener('DOMContentLoaded', () => {
  // 確保 DOM 完全載入後才初始化
  setTimeout(() => {
    console.log('DOM 載入完成，初始化頭像...');
    initAvatar();
  }, 100);
});

// ===== 新增：監聽 storage 變化，當其他頁面上傳頭像時自動更新 =====
window.addEventListener('storage', (e) => {
  if (e.key === 'avatar') {
    console.log('偵測到頭像更新，重新載入...');
    setTimeout(initAvatar, 100);
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
    deleteTopicBtn.onclick = null; // 清除舊事件
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
        if (!list) return;
        
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
      .catch(err => console.error('載入自訂主題失敗:', err));
  }

  // ===== 點擊特效選擇功能 =====
  const effectsList = document.getElementById('effectsList');
  
  if (effectsList) {
    // 定義特效資料
    const effectsData = [
      { name: '無', img: null },
      { name: '柯南', img: 'img-KN/柯南頭像.jpg' },
      { name: 'Free', img: 'img-Free/free頭像.jpg' }
    ];

    effectsList.innerHTML = '';

    effectsData.forEach(effect => {
      const div = document.createElement('div');
      div.className = 'effect-circle';
      
      if (effect.name === '無') {
        div.style.backgroundColor = '#d3d3d3'; 
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.innerHTML = '<span style="color: white; font-size: 24px; font-weight: bold;">✕</span>';
      } else {
        div.innerHTML = `<img src="${effect.img}" alt="${effect.name}">`;
      }

      // 檢查目前設定
      const savedEffect = localStorage.getItem('clickEffectTheme');
      if (savedEffect === effect.name || (!savedEffect && effect.name === '無')) {
        div.classList.add('selected');
      }

      // 點擊事件
      div.addEventListener('click', () => {
        document.querySelectorAll('.effect-circle').forEach(c => c.classList.remove('selected'));
        div.classList.add('selected');
        
        localStorage.setItem('clickEffectTheme', effect.name);
        
        if (effect.name === '無') {
          alert('點擊特效已關閉');
        } else {
          alert(`點擊特效已設定為：${effect.name}`);
        }
      });

      effectsList.appendChild(div);
    });
  }

  // ===== 背景主題功能 =====
  const ThemeCatalog = {
    "初始": {
      background_profile: "linear-gradient(135deg, #fcb1d3, #c2a3ff, #a6c1ee, #ff9a9e, #d18fff)",
      background_index: "linear-gradient(135deg, #fcb1d3, #c2a3ff, #a6c1ee, #ff9a9e, #d18fff)",
      background_game: "linear-gradient(135deg, #fcb1d3, #c2a3ff, #a6c1ee, #ff9a9e, #d18fff)",
      background_rank: "linear-gradient(135deg, #fcb1d3, #c2a3ff, #a6c1ee, #ff9a9e, #d18fff)"
    },
    "名偵探柯南": {
      background_profile: "url('img-background/柯南背景.png')",
      background_index: "url('img-background/柯南背景.png')",
      background_game: "url('img-background/柯南背景.png')",
      background_match: "url('img-background/柯南背景.png')"
    },
    "FREE!": {
      background_profile: "url('img-background/FREE!游泳池.jpg')",
      background_index: "url('img-background/FREE!游泳池.jpg')",
      background_game: "url('img-background/FREE!游泳池.jpg')",
      background_match: "url('img-background/FREE!游泳池.jpg')"
    },
  };

  // 產生主題方格
  const backgroundList = document.getElementById("backgroundList");
  
  if (backgroundList) {
    const themes = Object.keys(ThemeCatalog);
    themes.forEach(themeName => {
      const preview = ThemeCatalog[themeName].background_profile;

      const wrapper = document.createElement("div");
      wrapper.className = "bg-wrapper";

      const div = document.createElement("div");
      div.className = "bg-option";
      div.style.background = preview;

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

      wrapper.appendChild(div);
      wrapper.appendChild(label);
      backgroundList.appendChild(wrapper);
    });
  }

  // ===== 儲存主題功能 =====
  if (saveTopicBtn) {
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
  }

  // ===== 規則模態框 =====
  const modal2 = document.getElementById('rulesModal2');
  const openBtn = document.getElementById('openRules2');
  const closeBtn = document.getElementById('closeRules2');

  if (openBtn && modal2) {
    openBtn.addEventListener('click', e => {
      e.preventDefault();
      modal2.style.display = 'flex';
    });
  }
  
  if (closeBtn && modal2) {
    closeBtn.addEventListener('click', () => {
      modal2.style.display = 'none';
    });
  }

  // ===== 頁面初始化 =====
  // 1. 初始化頭像
  initAvatar();
  
  // 2. 載入自訂主題
  loadCustomTopics();
  
  // 3. 載入背景
  const pageKey = "background_profile";
  const savedBg = localStorage.getItem(pageKey);
  if (savedBg) {
    document.body.style.background = savedBg;
  }
  
  // 4. 如果有保存的主題，標記為選中
  if (backgroundList) {
    const savedTheme = localStorage.getItem("selectedTheme");
    if (savedTheme) {
      setTimeout(() => {
        const options = backgroundList.querySelectorAll('.bg-option');
        options.forEach((option, index) => {
          const label = option.parentElement.querySelector('.bg-label');
          if (label && label.textContent === savedTheme) {
            option.classList.add('selected');
          }
        });
      }, 100);
    }
  }
});