// DOM 參考
const loginModal = document.getElementById('loginModal');
const closeLogin = document.getElementById('closeLogin');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const loginBtn = document.getElementById('loginBtn'); // ✅ 確保有變數可更新導覽列

// ===== 導覽列初始化（跨頁保持登入狀態顯示） =====
document.addEventListener('DOMContentLoaded', () => {
  const name = localStorage.getItem('playerName');
  const id = localStorage.getItem('playerId');
  if (loginBtn && name && id) {
    loginBtn.textContent = '個人檔案';
    loginBtn.href = 'profile.html';
  }
});

// ===== 開關登入視窗 =====
if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    if (!loginModal) return;
    loginModal.style.display = 'flex';
    if (loginSection) loginSection.style.display = 'block';
    if (registerSection) registerSection.style.display = 'none';
  });
}
if (closeLogin) {
  closeLogin.addEventListener('click', () => {
    if (!loginModal) return;
    loginModal.style.display = 'none';
  });
}

// ===== 登入/註冊切換 =====
if (showRegister) {
  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    if (loginSection) loginSection.style.display = 'none';
    if (registerSection) registerSection.style.display = 'block';
  });
}
if (showLogin) {
  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    if (registerSection) registerSection.style.display = 'none';
    if (loginSection) loginSection.style.display = 'block';
  });
}

// ===== 工具：標準化帳號字串（去空白＋小寫） =====
function normalizeName(str) {
  return (str || '').trim().toLowerCase();
}

// ===== 產生 5–7 位數字 ID =====
function generatePlayerId() {
  const length = Math.floor(Math.random() * 3) + 5; // 5,6,7
  let id = '';
  for (let i = 0; i < length; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
}

// ===== 安全解析 JSON =====
function safeParse(json) {
  try { return JSON.parse(json); } catch { return null; }
}

// ===== 註冊表單 =====
const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', e => {
    e.preventDefault();
    const rawUser = document.getElementById('newUsername')?.value || '';
    const newPass = (document.getElementById('newPassword')?.value || '').trim();

    const newUser = normalizeName(rawUser); // ✅ 標準化帳號

    if (!newUser || !newPass) {
      alert('請輸入完整的註冊資訊');
      return;
    }

    // 密碼必須是 4 位數字
    if (!/^\d{4}$/.test(newPass)) {
      alert('密碼必須是 4 位數字');
      return;
    }

    // ✅ 嚴格檢查帳號是否已存在（只看帳號 key）
    if (localStorage.getItem(`user_${newUser}`)) {
      alert('此帳號名已被使用，請更改名字');
      return;
    }

    // 建立玩家 ID (5–7 位數字)
    const playerId = generatePlayerId();

    // 存帳號資料（保存原始顯示名 rawUser 以便顯示）
    const record = {
      username: rawUser.trim(), // 顯示用，保留大小寫
      key: newUser,             // 登入用，標準化
      password: newPass,
      playerId: playerId
    };
    localStorage.setItem(`user_${newUser}`, JSON.stringify(record));

    alert('註冊成功！請使用新帳號登入');
    if (loginModal) loginModal.style.display = 'none';
  });
}

// ===== 登入表單 =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const rawName = document.getElementById('username')?.value || '';
    const password = (document.getElementById('password')?.value || '').trim();

    const usernameKey = normalizeName(rawName); // ✅ 標準化帳號

    if (!usernameKey || !password) {
      alert('請輸入完整的帳號與密碼');
      return;
    }

    const userData = localStorage.getItem(`user_${usernameKey}`);
    if (!userData) {
      alert('此帳號尚未註冊，請先註冊');
      return;
    }

    const user = safeParse(userData);
    if (!user) {
      alert('帳號資料異常，請重新註冊');
      return;
    }

    if (user.password !== password) {
      alert('密碼錯誤');
      return;
    }

    // 登入成功 → 存當前玩家資訊（使用顯示名 username）
localStorage.setItem('playerName', user.username);
sessionStorage.setItem('playerName', user.username); // ✅ 加這行

if (user.playerId) {
  localStorage.setItem('playerId', user.playerId);
  sessionStorage.setItem('playerId', user.playerId); // ✅ 加這行
} else {
  const newId = 'P' + Math.floor(100000 + Math.random() * 900000);
  localStorage.setItem('playerId', newId);
  sessionStorage.setItem('playerId', newId); // ✅ 加這行
  user.playerId = newId;
  localStorage.setItem(`user_${usernameKey}`, JSON.stringify(user));
}


    alert(`登入成功！歡迎 ${user.username}`);
    if (loginModal) loginModal.style.display = 'none';

    // 導覽列更新（跨頁保持狀態）
    if (loginBtn) {
      loginBtn.textContent = '個人檔案';
      loginBtn.href = 'profile.html';
    }
  });
}
// ===== 工具 =====
function generatePlayerId() {
  const length = Math.floor(Math.random() * 3) + 5; // 5,6,7
  let id = '';
  for (let i = 0; i < length; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
}


// ===== 主題卡片 → 彈窗顯示大圖 =====
const modal = document.getElementById('imgModal');
const modalImg = document.getElementById('modalImg');
const caption = document.getElementById('caption');
const closeBtn = document.querySelector('.close');

document.querySelectorAll('.topic-card').forEach(card => {
  card.addEventListener('click', () => {
    const altSrc = card.getAttribute('data-alt'); // 取出大圖路徑
    const text = card.querySelector('p').textContent;

    if (altSrc) {
      modal.style.display = 'flex';
      modalImg.src = altSrc;
      caption.textContent = text;
    }
  });
});

closeBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.style.display = 'none';
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const rulesModal2 = document.getElementById('rulesModal2');
  const openRules2 = document.getElementById('openRules2');
  const closeRules2 = document.getElementById('closeRules2');

  if (openRules2) {
    openRules2.addEventListener('click', e => {
      e.preventDefault();
      rulesModal2.style.display = 'flex';
    });
  }

  if (closeRules2) {
    closeRules2.addEventListener('click', () => {
      rulesModal2.style.display = 'none';
    });
  }
});
// 背景更換
window.addEventListener("DOMContentLoaded", () => {
  const pageKey = "background_index"; // 改成對應頁面名稱
  const savedBg = localStorage.getItem(pageKey);
  if (savedBg) {
    document.body.style.background = savedBg;
  }
});
