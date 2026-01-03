// 定義所有特效主題
const clickThemes = {
  柯南: [
  'img-chick/柯1.png',
  'img-chick/柯2.png',
  'img-chick/柯3.png',
  'img-chick/柯4.png',
  'img-chick/柯5.png',
  'img-chick/柯6.png',
  'img-chick/柯7.png',
  'img-chick/柯8.png',
  'img-chick/柯9.png',
  'img-chick/柯10.png',
  'img-chick/柯11.png',
  'img-chick/柯12.png',
  'img-chick/柯13.png',
  'img-chick/柯14.png',
  'img-chick/柯15.png',
  'img-chick/柯16.png',
  'img-chick/柯17.png',
  'img-chick/柯18.png',
  'img-chick/柯19.png',
  'img-chick/柯20.png',
  'img-chick/柯21.png',
  'img-chick/柯22.png',
  'img-chick/柯23.png',
  'img-chick/柯24.png',
  'img-chick/柯25.png',
  'img-chick/柯26.png',
  'img-chick/柯27.png',
  'img-chick/柯28.png',
  'img-chick/柯29.png'
],

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
