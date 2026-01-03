// 定義所有特效主題
const clickThemes = {
  星星: ['img-KN/工藤有希子.jpg', 'img-KN/本堂瑛祐.jpg'],
  愛心: ['img-WB/佐狐浩太.png', 'img-GM/愈史郎.jpg'],
  柯南: ['img/effects/conan.png', 'img/effects/haibara.png'],
  Free: ['img/effects/free.png', 'img/effects/makoto.png']
};

// 讀取玩家選擇的特效主題
function getCurrentTheme() {
  const saved = localStorage.getItem('clickEffect');
  return clickThemes[saved] || clickThemes['星星']; // 預設星星
}

document.addEventListener('click', e => {
  const images = getCurrentTheme();
  const img = document.createElement('img');
  img.src = images[Math.floor(Math.random() * images.length)];
  img.className = 'click-effect';

  img.style.left = `${e.pageX - 30}px`;
  img.style.top = `${e.pageY - 30}px`;
  document.body.appendChild(img);

  setTimeout(() => img.remove(), 800);
});
