// 定義所有特效主題
const clickThemes = {
  柯南: ['img-chick/柯1.png', 'img-chick/柯2.png','img-chick/柯1.png'],
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
