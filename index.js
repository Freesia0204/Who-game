let index = 0;
const slides = document.querySelectorAll('.slide');

function switchSlide() {
  slides.forEach(s => s.classList.remove('active'));
  slides[index].classList.add('active');
  index = (index + 1) % slides.length;
}

setInterval(switchSlide, 2600);
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const closeLogin = document.getElementById('closeLogin');

loginBtn.addEventListener('click', () => {
  loginModal.style.display = 'flex';
});

closeLogin.addEventListener('click', () => {
  loginModal.style.display = 'none';
});

// 登入表單
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  // 簡單驗證（實際應該接後端）
  if (username && password) {
    alert('登入成功！');
    loginModal.style.display = 'none';
    loginBtn.textContent = '個人主頁';
    loginBtn.href = 'profile.html'; // ✅ 登入後導向個人主頁
  }
});

// 註冊表單
document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const newUser = document.getElementById('newUsername').value;
  const newPass = document.getElementById('newPassword').value;

  if (newUser && newPass) {
    alert('註冊成功！請使用新帳號登入');
  }
});

document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert('請輸入完整的帳號與密碼');
    return;
  }

  alert('登入成功！');
  loginModal.style.display = 'none';
  loginBtn.textContent = '個人主頁';
  loginBtn.href = 'profile.html';
});

document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const newUser = document.getElementById('newUsername').value.trim();
  const newPass = document.getElementById('newPassword').value.trim();

  if (!newUser || !newPass) {
    alert('請輸入完整的註冊資訊');
    return;
  }

  alert('註冊成功！請使用新帳號登入');
});
