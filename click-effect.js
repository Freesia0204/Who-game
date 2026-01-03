// 你可以把去背圖片放在 img/effects/ 資料夾
const clickImages = [
  'AC.jpg',
  '',
  '',
  ''
];

document.addEventListener('click', e => {
  // 隨機挑一張圖片
  const img = document.createElement('img');
  img.src = clickImages[Math.floor(Math.random() * clickImages.length)];
  img.className = 'click-effect';

  // 放在滑鼠點擊位置
  img.style.left = `${e.pageX - 30}px`;
  img.style.top = `${e.pageY - 30}px`;

  document.body.appendChild(img);

  // 動畫結束後移除
  setTimeout(() => {
    img.remove();
  }, 800);
});
