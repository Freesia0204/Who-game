// 1. 定義所有特效主題的圖片庫
const clickThemes = {
  "柯南": [
    'img-chick/柯1.png', 'img-chick/柯2.png', 'img-chick/柯3.png', 'img-chick/柯4.png', 'img-chick/柯5.png',
    'img-chick/柯6.png', 'img-chick/柯7.png', 'img-chick/柯8.png', 'img-chick/柯9.png', 'img-chick/柯10.png',
    'img-chick/柯11.png', 'img-chick/柯12.png', 'img-chick/柯13.png', 'img-chick/柯14.png', 'img-chick/柯15.png',
    'img-chick/柯16.png', 'img-chick/柯17.png', 'img-chick/柯18.png', 'img-chick/柯19.png', 'img-chick/柯20.png',
    'img-chick/柯21.png', 'img-chick/柯22.png', 'img-chick/柯23.png', 'img-chick/柯24.png', 'img-chick/柯25.png',
    'img-chick/柯26.png', 'img-chick/柯27.png', 'img-chick/柯28.png', 'img-chick/柯29.png'
  ],
  "Free": [
    'img-chick/F1.png', 'img-chick/F2.png', 'img-chick/F3.png', 'img-chick/F4.png', 'img-chick/F5.png',
    'img-chick/F6.png', 'img-chick/F7.png', 'img-chick/F8.png', 'img-chick/F9.png', 'img-chick/F10.png',
    'img-chick/F11.png', 'img-chick/F12.png', 'img-chick/F13.png', 'img-chick/F14.png', 'img-chick/F15.png'
  ]
};

// 2. 監聽點擊事件
document.addEventListener('mousedown', (e) => {
  // 取得目前玩家在 profile.js 中選擇的特效主題
  const currentTheme = localStorage.getItem('clickEffectTheme');

  // 【核心判斷】如果主題是「無」，或玩家尚未選擇，則直接 return 不產生任何元素
  if (currentTheme === "無" || !currentTheme) {
    return; 
  }

  // 檢查該主題是否有對應的圖片庫
  const images = clickThemes[currentTheme];
  if (!images || images.length === 0) {
    return;
  }

  // 3. 產生特效圖片
  const imgPath = images[Math.floor(Math.random() * images.length)];
  const img = document.createElement('img');
  img.src = imgPath;
  img.className = 'click-effect';

  // 設定產生位置（扣除圖片寬高的一半以置中，假設圖片為 60x60）
  img.style.left = `${e.pageX - 30}px`;
  img.style.top = `${e.pageY - 30}px`;
  
  // 防止影響頁面元件點擊
  img.style.position = 'absolute';
  img.style.pointerEvents = 'none';
  img.style.zIndex = '9999';

  document.body.appendChild(img);

  // 4. 動畫結束後移除元素（對應 CSS 0.8s 動畫）
  setTimeout(() => {
    img.remove();
  }, 800);
});