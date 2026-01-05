window.AIDebugLog = [];
// ===== 添加調試函式 =====
function checkGameState() {
  console.log('=== 遊戲狀態檢查 ===');
  console.log('selectedTopic:', selectedTopic);
  console.log('turn:', turn);
  console.log('AIChoice:', AIChoice);
  console.log('antidoteCell:', antidoteCell);
  console.log('possibleCells:', possibleCells.length);
  console.log('questionsAskedByPlayer:', questionsAskedByPlayer);
  console.log('questionsAskedByAI:', questionsAskedByAI);
  console.log('aiGuessCount:', aiGuessCount);
  console.log('aiGuessLocked:', aiGuessLocked);
  console.log('aiAwaitingAnswer:', aiAwaitingAnswer);
  console.log('canGuess:', canGuess);
  console.log('playerGuessCooldown:', playerGuessCooldown);
  console.log('====================');
}

// 在控制台可以調用 checkGameState() 來檢查狀態
// ===== 抓取元素 =====
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatButton = chatForm ? chatForm.querySelector('button') : null;
const messagesEl = document.getElementById('messages');
const gridArea = document.querySelector('.grid-area');
const rulesModal = document.getElementById('rulesModal');
const startGameBtn = document.getElementById('startGameBtn');
const guessedWrongCells = []; // 玩家已猜錯的解藥名稱


// ===== 遊戲資料 =====
let playerChoice = null;
let AIChoice = null;
let turn = null; // 'player' 或 'AI' 或 'waitingForAnswer'
let selectedTopic = null;
let antidoteCell = null; // 玩家自己選的"解藥"（顯示用）
let chosenAntidoteId = null; // 內部記錄使用
let possibleCells = []; // AI 猜解藥用
let aiGuessCooldown = 0; // AI 猜錯後需要等待幾輪才能再猜（可選）
let playerGuessCount = 0; // 玩家已猜幾次
let playerGuessCooldown = 0; // 猜錯後要等幾輪才能再猜
let playerTurns = 0; // 玩家目前問了幾題（問問題次數）
let canGuess = false; // 控制是否進入猜模式（玩家可點格子猜）
let aiAwaitingAnswer = false;
let questionsAskedByPlayer = 0;
let questionsAskedByAI = 0;
let currentRound = 0;
let playerQuestion = null;
let aiAnswer = null;
let guessInfo = null;
let askedTraits = []; // 🔹 新增：AI 已問過的 trait key
let lastAIQuestion = null; // ✅ 新增：記錄 AI 最近問的問題 
const characterData = {}; //  ✅ 新增：人物查詢用的資料容器

let gridData = {
  '名偵探柯南': [],
  '名偵探柯南-紅黑篇': [],
  '鬼滅之刃': [],
  'FREE!': [],
  '防風少年': []
};

// ===== 工具函式 =====
function markGuessWrong(cellName) {
  if (!guessedWrongCells.includes(cellName)) {
    guessedWrongCells.push(cellName);
    console.log(`❌ 已標記猜錯：${cellName}`);
  }
}

function unmarkGuessWrong(cellName) {
  const index = guessedWrongCells.indexOf(cellName);
  if (index !== -1) {
    guessedWrongCells.splice(index, 1);
    console.log(`🔄 已取消標記：${cellName}`);
  }
}


// AI 猜測相關
let aiGuessCount = 0;          // AI 已猜的次數
let aiGuessLocked = false;     // 猜錯後鎖住，需問一題才能再猜
const maxGuesses = 3;          // AI 最多可猜 3 次

// 互動旗標
let isChoosingAntidote = false; // 用在 UI 上（最後選格子的一段）
let askedQuestions = []; // AI 已問過問題的記錄（避免重複問）

// ===== DOMContentLoaded：房號、名字、開始按鈕綁定 =====
window.addEventListener('DOMContentLoaded', () => {
  const name = localStorage.getItem('playerName') || '未知玩家';
  const mode = 'AI';
  const roomInfo = document.getElementById('roomInfo');
  if (roomInfo) {
    roomInfo.innerHTML = `玩家姓名: ${name}　｜　對戰模式: ${mode}<br>`;
  }

  // 開始按鈕（可能在 modal 裡）
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', startGame);

  // 初始化 chat 狀態
  disableChat();
});
// ===== 在 DOMContentLoaded 中添加 =====
window.addEventListener('DOMContentLoaded', () => {
  const name = localStorage.getItem('playerName') || '未知玩家';
  const mode = 'AI';
  const roomInfo = document.getElementById('roomInfo');
  if (roomInfo) {
    roomInfo.innerHTML = `玩家姓名: ${name}　｜　對戰模式: ${mode}<br>`;
  }

  // 開始按鈕（可能在 modal 裡）
  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', startGame);

  // ===== 初始化聊天表單事件 =====
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  
  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', function(e) {
      e.preventDefault(); // ⚠️ 這行最重要！阻止表單提交重整頁面
      
      const msg = chatInput.value.trim();
      if (!msg) return;
      
      console.log('[Chat] 玩家輸入:', msg, '當前回合:', turn);
      
      // 清除輸入
      chatInput.value = '';
      disableChat();
      
      // 顯示玩家訊息
      addMessage('player', msg);
      
      // 根據狀態處理
      if (turn === 'player') {
        setTimeout(() => handlePlayerAsk_forSubmit(msg), 100);
      } else if (turn === 'waitingForAnswer') {
        setTimeout(() => handlePlayerAnswer(msg), 100);
      } else {
        setTimeout(() => {
          addMessage('system', '現在不是你的回合喔～');
          if (turn === 'player') enableChat();
        }, 500);
      }
    });
    
    console.log('聊天表單初始化完成');
  }

  // 初始化 chat 狀態
  disableChat();
});
// ===== 開始遊戲 =====
function startGame(topic) {
  // --- 新增：針對防風少年的特殊判斷 ---
  if (topic === '防風少年') {
    alert("📢 此主題尚未建立完成，敬請期待！");
    return; // 直接中斷函式，不進入遊戲
  }
  // ----------------------------------

  selectedTopic = topic;
  const dataList = gridData[topic];

  if (!dataList || dataList.length === 0) {
    console.warn('selected topic has no data', topic);
    return;
  }
  
  // ... 後面原本的程式碼保持不變
}
function startGame() {
  if (rulesModal) rulesModal.style.display = 'none';
  createTopicCells();
  addMessage('system', '遊戲開始，請選擇主題。');
}

// ===== 初始化主題格子 =====
function createTopicCells() {
  if (!gridArea) return;
  gridArea.innerHTML = ''; // 清空格子區

  topics.forEach(topic => {
    const cell = document.createElement('div');
    cell.className = 'cell topic-select';

    const img = document.createElement('img');
    img.src = topic.img;
    img.alt = topic.name;

    const text = document.createElement('div');
    text.textContent = topic.name;
    text.className = 'cell-text';

    cell.appendChild(img);
    cell.appendChild(text);

    cell.addEventListener('click', () => {
      selectedTopic = topic.name;
      addMessage('system', `玩家選擇了主題：${topic.name}`);

      const dataList = gridData[selectedTopic];
      if (!dataList || dataList.length === 0) {
        console.warn('selected topic has no data', selectedTopic);
        return;
      }

      AIChoice = dataList[Math.floor(Math.random() * dataList.length)].name;
      console.log('AI 選擇的卡牌：', AIChoice);

      showAntidoteSelection();
    });

    gridArea.appendChild(cell);
  });
}

// ===== 顯示解藥格子（玩家選格子） =====
function showAntidoteSelection() {
  if (!gridArea || !selectedTopic) return;
  gridArea.innerHTML = '';
  addMessage('system', '請選擇你的卡牌');

  const dataList = gridData[selectedTopic];
  possibleCells = [...dataList]; // 初始化 AI 的候選清單

  dataList.forEach((item, index) => {
    const cell = document.createElement('div');
    cell.className = 'cell card';
    cell.dataset.name = item.name;

    const img = document.createElement('img');
    img.src = item.img;
    img.alt = item.name;

    const text = document.createElement('div');
    text.textContent = item.name;
    text.className = 'cell-text';

    cell.appendChild(img);
    cell.appendChild(text);

    // 左鍵點擊格子
    cell.addEventListener('click', () => {
      // 如果已選解藥且不是猜階段 → 翻格子效果
      if (antidoteCell && !canGuess) {
        cell.classList.toggle('flipped');
        return;
      }

      // 玩家初次選擇解藥（設定玩家要 "保留" 的選擇，用來遊戲 UI）
      if (!antidoteCell) {
        antidoteCell = item.name;
        chosenAntidoteId = item.name;
        isChoosingAntidote = true;
        cell.classList.add('selected-antidote');
        addMessage('system', `你選了 ${antidoteCell}`);
        // 進入猜拳決定先後
        startRockPaperScissors();
        return;
      }

      // 玩家在猜題模式 點格子嘗試猜解藥
      if (canGuess) {
        playerGuessCount++;
        canGuess = false;

        // 清除 grid guess-mode 樣式
        if (gridArea) gridArea.classList.remove('guess-mode');

        if (item.name === AIChoice) {
          addMessage('system', '🎉 你猜對了！你贏了！');
          endGame('你猜對了！');
        } else {
          addMessage('system', '猜錯啦!要再問一題後才能猜！');
          playerGuessCooldown = 2;
          turn = 'AI';
          updateGuessButtonState();
          setTimeout(AIGuessOrAsk, 800); // AI 接手
        }
      }
    });

    // 右鍵翻轉
    cell.addEventListener('contextmenu', e => {
      e.preventDefault();
      cell.classList.toggle('flipped');
    });

    gridArea.appendChild(cell);
  });
}

// ===== 猜拳流程 =====
function startRockPaperScissors() {
  addMessage('system', '猜拳開始決定先後...');
  const options = ['石頭', '剪刀', '布'];
  const playerHand = options[Math.floor(Math.random() * 3)];
  const AIHand = options[Math.floor(Math.random() * 3)];
  addMessage('player', `玩家出拳：${playerHand}`);
  addMessage('AI', `AI 出拳：${AIHand}`);

  if (playerHand === AIHand) {
    addMessage('system', '平手，重新猜拳...');
    setTimeout(startRockPaperScissors, 800);
    return;
  }

  const playerWins =
    (playerHand === '石頭' && AIHand === '剪刀') ||
    (playerHand === '剪刀' && AIHand === '布') ||
    (playerHand === '布' && AIHand === '石頭');

  turn = playerWins ? 'player' : 'AI';
  addMessage('system', `${turn === 'player' ? '玩家' : 'AI'} 先問`);
  updateGuessButtonState();

  setTimeout(() => {
    if (turn === 'AI') AIAskQuestion();
    else enableChat();
  }, 500);
}

// ===== 訊息函式 =====
function addMessage(role, text) {
  const li = document.createElement('li');
  li.classList.add('message', role);

  const meta = document.createElement('div');
  meta.classList.add('meta');
  if (role === 'system') meta.textContent = '系統';
  else if (role === 'AI') meta.textContent = 'AI';
  else if (role === 'player') meta.textContent = '玩家';

  const content = document.createElement('div');
  content.classList.add('text');
  content.textContent = text;

  li.appendChild(meta);
  li.appendChild(content);

  const msgList = document.querySelector('.messages');
  if (msgList) {
    msgList.appendChild(li);
    msgList.scrollTop = msgList.scrollHeight;
  }
}

function enableChat() {
  if (!chatInput || !chatButton) return;
  chatInput.disabled = false;
  chatButton.disabled = false;
  chatInput.focus();
}

function disableChat() {
  if (!chatInput || !chatButton) return;
  chatInput.disabled = true;
  chatButton.disabled = true;
}


// ===== 主題格子資料（含圖片） =====
const topics = [
  { name: '名偵探柯南', img: 'img-KN/柯南_loge.jpg' },
  { name: '名偵探柯南-紅黑篇', img: 'img-KN/柯南_loge.jpg' },
  { name: '鬼滅之刃', img: 'img-GM/鬼滅之刃-logo.png' },
  { name: 'FREE!', img: 'img-Free/Free_logo.png' },
  { name: '防風少年', img: 'img/敬請期待.jpg' }
  
];


// 🧠 AI資料庫（含通用問題與各主題專屬問題）
// 🧠 AI資料庫（含通用問題與各主題專屬問題）
const AI_DB = {
  // 🔹通用問題：所有主題都可能會問
  common: [
    { question: '他是不是男的', trait: 'boy' },
    { question: '他是不是女的', trait: 'girl' },
  ],

  // 🔸專屬題庫：針對特定主題角色
  '名偵探柯南': [
    { question: '他是不是酒廠的（臥底、曾經是也算）？', trait: 'isWinery' },
    { question: '他有沒有當過臥底？', trait: 'hasBeenUndercover' },
    { question: '他是不是警察？（不包含公安、FBI等，曾經是的不算）', trait: 'isPolice' },
    { question: '他是不是FBI？', trait: 'isFBI' },
    { question: '他是不是公安？', trait: 'isPublicSecurity' },
    { question: '他是不是警校五人組之一？', trait: 'isPoliceSchoolFive' },
    { question: '他是不是偵探？', trait: 'isDetective' },
    { question: '他是不是科學家？', trait: 'isScientist' },
    { question: '他是不是怪盜？', trait: 'isPhantomThief' },
    { question: '他是不是小孩(變小的也算)？', trait: 'isChild' },
    { question: '他的頭髮是不是黑色的？', trait: 'hairNotBlack' },
    { question: '他有沒有戴帽子？', trait: 'hasHat' },
    { question: '他有沒有鬍子？', trait: 'hasBeard' },
    { question: '他是不是胖的？', trait: 'isFat' },
    { question: '他是不是長頭髮？', trait: 'isLongHair' },
    { question: '他是不是短頭髮(含禿頭)？', trait: 'isShortHair' },
    { question: '他有沒有青梅竹馬？', trait: 'hasChildhoodFriend' },
    { question: '他有沒有戴眼鏡？', trait: 'hasGlasses' },
    { question: '他是不是空手道很厲害？', trait: 'karate' },
    { question: '他是不是會易容？', trait: 'Disguise' },
    { question: '他有沒有兄弟姊妹(親的)？', trait: 'family' },
    { question: '他是高中生嗎？', trait: 'highschool' },
    { question: '他是誰的父母嗎？', trait: 'parents' },
    { question: '他是演員嗎？', trait: 'actor' },
    { question: '他是魔術師嗎？', trait: 'magic' },
    { question: '他成年人嗎？', trait: 'adult' },
  ],
  
  '名偵探柯南-紅黑篇': [
    { question: '他是不是男的', trait: 'boy' },
    { question: '他是不是女的', trait: 'girl' },
    { question: '他是不是酒廠的（臥底、曾經是也算）？', trait: 'isWinery' },
    { question: '他有沒有當過臥底？', trait: 'hasBeenUndercover' },
    { question: '他是不是警察？（不包含公安、FBI等，曾經是的不算）', trait: 'isPolice' },
    { question: '他是不是FBI？', trait: 'isFBI' },
    { question: '他是不是公安？', trait: 'isPublicSecurity' },
    { question: '他是不是警校五人組之一？', trait: 'isPoliceSchoolFive' },
    { question: '他是不是偵探？', trait: 'isDetective' },
    { question: '他是不是科學家？', trait: 'isScientist' },
    { question: '他是不是怪盜？', trait: 'isPhantomThief' },
    { question: '他是不是小孩(變小的也算)？', trait: 'isChild' },
    { question: '他的頭髮是不是黑色的？', trait: 'hairNotBlack' },
    { question: '他有沒有戴帽子？', trait: 'hasHat' },
    { question: '他有沒有鬍子？', trait: 'hasBeard' },
    { question: '他是不是胖的？', trait: 'isFat' },
    { question: '他是不是長頭髮？', trait: 'isLongHair' },
    { question: '他是不是短頭髮(含禿頭)？', trait: 'isShortHair' },
    { question: '他有沒有青梅竹馬？', trait: 'hasChildhoodFriend' },
    { question: '他有沒有戴眼鏡？', trait: 'hasGlasses' },
    { question: '他是不是會易容？', trait: 'Disguise' },
    { question: '他有沒有兄弟姊妹(親的)？', trait: 'family' },
    { question: '他是高中生嗎？', trait: 'highschool' },
    { question: '他是誰的父母嗎？', trait: 'parents' },
    { question: '他是演員嗎？', trait: 'actor' },
    { question: '他是成年人嗎？', trait: 'adult' },
    { question: '他是不是死了?', trait: 'adie' },
    { question: '他是因為爆炸死的嗎?', trait: 'boom' },
    { question: '他是因為車禍死的嗎?', trait: 'CarAccident' },
    { question: '他是膚色是偏黑/黃的嗎?', trait: 'dark' },
    { question: '他是不是知道柯南就是新一?', trait: 'Shinichi' },
  ],

  '鬼滅之刃': [
    { question: '他是不是男的', trait: 'boy' },
    { question: '他是不是女的', trait: 'girl' },
    { question: '他是不是柱？（曾經也算）', trait: 'column' },
    { question: '他最後是不是死了？', trait: 'die' },
    { question: '他有沒有開斑紋？', trait: 'Texture' },
    { question: '他的臉上有沒有傷痕、疤痕？', trait: 'scar' },
    { question: '他有沒有參加無限城決戰？', trait: 'battle' },
    { question: '他是不是鬼或鬼殺隊的領袖？', trait: 'leader' },
    { question: '他是不是鬼？（曾經變鬼算，吃鬼算、無限城不算）', trait: 'ghost' },
    { question: '他是不是人？', trait: 'people' },
    { question: '他是不是自爆而亡的？', trait: 'explode' },
    { question: '他是不是被切一半死的？', trait: 'half' },
    { question: '他是不是很溫柔？', trait: 'gentle' },
    { question: '他是不是很暴躁？', trait: 'irritable' },
    { question: '他是不是喜歡吃東西？', trait: 'eat' },
    { question: '他的頭髮是不是雙拼髮色？', trait: 'color' },
    { question: '他有沒有兄弟姐妹？', trait: 'sisters' },
    { question: '他的頭髮有黑色嗎？', trait: 'blackhair' },
    { question: '他是上弦嗎？', trait: 'Upper' },
    { question: '他是下弦嗎？', trait: 'lower' },
    { question: '他的臉是不是一般五官？（一雙眼睛一個鼻子一個嘴巴，都在正常位子上）', trait: 'facial' },
    { question: '他是不是上弦三以上(含上三)？', trait: 'mikami' },
    { question: '他是不是上弦三以下？', trait: 'threeDown' },
    { question: '他會不會使用血鬼術？', trait: 'Blood' },
    { question: '他會使用呼吸法嗎？', trait: 'breathe' },
    { question: '他使用日輪刀嗎？', trait: 'knife' },
    { question: '他有戴面具嗎？', trait: 'mask' },
    { question: '他是十二鬼月的一員嗎', trait: 'moon' },
    { question: '他是五感組的一員嗎', trait: 'fiveSenses' },
  ],
  
  'FREE!': [
    { question: '他是不是游泳社的成員？', trait: 'swimmer' },
    { question: '他是不是岩鳶高校的學生？', trait: 'iwatobi' },
    { question: '他是不是鮫柄學園的學生？', trait: 'samezuka' },
    { question: '他是不是轉學或留學過？', trait: 'abroad' },
    { question: '他有沒有青梅竹馬？', trait: 'childhood' },
    { question: '他的個性是不是偏冷靜寡言？', trait: 'quiet' },
    { question: '他的個性是不是很溫柔？', trait: 'gentle2' },
    { question: '他是不是隊內的氣氛製造者？', trait: 'cheerful' },
    { question: '他一開始是不是不太會游泳？', trait: 'beginner' },
    { question: '他是不是有兄弟姐妹？', trait: 'siblings' },
    { question: '他是不是曾擔任游泳社的經理？', trait: 'manager' },
    { question: '他是不是教練？', trait: 'coach' },
    { question: '他是不是黑髮？', trait: 'volatilize' },
    { question: '他是不是橘、紅髮？', trait: 'red' },
    { question: '他是不是棕髮？', trait: 'brown' },
    { question: '他是不是藍髮？', trait: 'blue' },
    { question: '他是不是黃髮？', trait: 'yellow' },
  ],

  // 🔹 trait 對照表
  traitMap: {
    "名偵探柯南": {
      boy: '男',
      girl: '女',
      isWinery: '酒廠',
      hasBeenUndercover: '臥底',
      isPolice: '警察',
      isFBI: 'FBI',
      isPublicSecurity: '公安',
      isPoliceSchoolFive: '警校五人組',
      isDetective: '偵探',
      isScientist: '科學家',
      isPhantomThief: '怪盜',
      isChild: '小孩',
      hairNotBlack: '黑髮',
      hasHat: '帽子',
      hasBeard: '鬍子',
      isFat: '胖',
      isLongHair: '長頭髮',
      isShortHair: '短頭髮',
      hasChildhoodFriend: '青梅竹馬',
      hasGlasses: '眼鏡',
      karate: '空手道',
      disguise: '易容',
      family: '兄弟姊妹',
      highschool: '高中生',
      parents: '父母',
      actor: '演員',
      magic: '魔術師',
      adult: '成年人',
      twin: '雙胞胎', 
      Kansai: '關西',
      Kanto: '關東',
      Nagano: '長野縣的警察',
      ponytail: '馬尾',
      dark: '膚色黑',
    },
    "名偵探柯南-紅黑篇": {
      boy: '男',
      girl: '女',
      isWinery: '酒廠',
      hasBeenUndercover: '臥底',
      isPolice: '警察',
      isFBI: 'FBI',
      isPublicSecurity: '公安',
      isPoliceSchoolFive: '警校五人組',
      isDetective: '偵探',
      isScientist: '科學家',
      isPhantomThief: '怪盜',
      isChild: '小孩',
      hairNotBlack: '黑髮',
      hasHat: '帽子',
      hasBeard: '鬍子',
      isFat: '胖',
      isLongHair: '長頭髮',
      isShortHair: '短頭髮',
      hasChildhoodFriend: '青梅竹馬',
      hasGlasses: '眼鏡',
      karate: '空手道',
      disguise: '易容',
      family: '兄弟姊妹',
      highschool: '高中生',
      parents: '父母',
      actor: '演員',
      magic: '魔術師',
      adult: '成年人',
      twin: '雙胞胎', 
      Kansai: '關西',
      Kanto: '關東',
      dark: '膚色黑',
      adie: '死了',
      boom: '爆炸死亡',
      CarAccident: '車禍死亡',
      Shinichi: '柯南就是新一',
    },
    "鬼滅之刃": {
      boy: '男',
      girl: '女',
      column: '柱',
      die: '死亡',
      Texture: '斑紋',
      scar: '傷痕',
      battle: '參加無限城決戰',
      leader: '領袖',
      ghost: '鬼',
      people: '人類',
      explode: '自爆死亡',
      half: '被切一半死亡',
      gentle: '溫柔',
      irritable: '暴躁',
      eat: '喜歡吃東西',
      color: '雙拼髮色',
      sisters: '兄弟姊妹',
      blackhair: '黑髮',
      Upper: '上弦',
      lower: '下弦',
      facial: '五官正常',
      mikami: '上弦三以上',
      threeDown: '上弦三以下',
      Blood: '血鬼術',
      breathe: '呼吸法',
      knife: '日輪刀',
      mask: '面具',
      moon: '十二鬼月',
      fiveSenses: '五感組',
    },
    "FREE!": {
      swimmer: '游泳社成員',
      iwatobi: '岩鳶高校學生',
      samezuka: '鮫柄學園學生',
      abroad: '轉學或留學過',
      childhood: '青梅竹馬',
      quiet: '冷靜寡言',
      gentle: '溫柔',
      cheerful: '氣氛製造者',
      beginner: '游泳初學者',
      siblings: '兄弟姊妹',
      manager: '游泳社經理',
      coach: '教練',
      volatilize: '黑髮',
      red: '橘/紅髮',
      brown: '棕髮',
      blue: '藍髮',
      yellow: '黃髮'
    }
  }
};

//AI相近詞偵測
const synonyms = {
  "名偵探柯南": {
    boy: ['男', '男生', '男性'],
    girl: ['女', '女生', '女性'],
    isWinery: ['酒廠', '黑方'],
    hasBeenUndercover: ['臥底'],
    isPolice: ['警察', '警部', '警官'],
    isFBI: ['FBI'],
    isPublicSecurity: ['公安'],
    isPoliceSchoolFive: ['警校五人組'],
    isDetective: ['偵探'],
    isScientist: ['科學家'],
    isPhantomThief: ['怪盜', '小偷', '基德'],
    isChild: ['小孩', '孩童', '孩子', '兒童', '小學', '小學生'],
    hairNotBlack: ['黑髮', '黑頭髮', '黑色頭髮'],
    hasHat: ['帽子', '帽', '戴帽'],
    hasBeard: ['鬍子'],
    isFat: ['胖', '壯', '壯碩', '肥', '肥胖'],
    isLongHair: ['長頭髮', '長髮'],
    isShortHair: ['短頭髮', '短髮'],
    hasChildhoodFriend: ['青梅竹馬', '幼馴染'],
    hasGlasses: ['眼鏡'],
    karate: ['空手道'],
    disguise: ['易容'],
    family: ['兄弟姊妹', '哥哥', '弟弟', '姊姊', '姐姐', '妹妹','兄弟','姊妹'],
    highschool: ['高中生', '高中', '小學'],
    parents: ['父母', '爸爸', '媽媽', '父親', '母親'],
    actor: ['演員'],
    magic: ['魔術師', '魔術'],
    adult: ['成年人', '成年', '大人'],
    twin: ['雙胞胎', '雙胞胎兄弟'], 
    Kansai: ['關西', '關西的偵探', '關西的人','關西人','關西偵探'],
    Kanto: ['關東', '關東的偵探', '關東的人','關東人','關東偵探'],
    Nagano: ['長野縣的警察', '長野縣警', '長野縣三人組', '長野','長野縣','長野的','長野的人'],
    ponytail: ['馬尾','綁馬尾'],
    dark: ['皮膚是黑色的','皮膚黑','皮膚是黑的','膚色偏黑','皮膚偏黑','黑皮','膚色黑'],
  },
  "名偵探柯南-紅黑篇": {
    boy: ['男', '男生', '男性'],
    girl: ['女', '女生', '女性'],
    isWinery: ['酒廠', '黑方'],
    hasBeenUndercover: ['臥底'],
    isPolice: ['警察', '警部', '警官'],
    isFBI: ['FBI'],
    isPublicSecurity: ['公安'],
    isPoliceSchoolFive: ['警校五人組'],
    isDetective: ['偵探'],
    isScientist: ['科學家'],
    isPhantomThief: ['怪盜', '小偷', '基德'],
    isChild: ['小孩', '孩童', '孩子', '兒童', '小學', '小學生'],
    hairNotBlack: ['黑髮', '黑頭髮', '黑色頭髮'],
    hasHat: ['帽子', '帽', '戴帽'],
    hasBeard: ['鬍子'],
    isFat: ['胖', '壯', '壯碩', '肥', '肥胖'],
    isLongHair: ['長頭髮', '長髮'],
    isShortHair: ['短頭髮', '短髮'],
    hasChildhoodFriend: ['青梅竹馬', '幼馴染'],
    hasGlasses: ['眼鏡'],
    karate: ['空手道'],
    disguise: ['易容'],
    family: ['兄弟姊妹', '哥哥', '弟弟', '姊姊', '姐姐', '妹妹','兄弟','姊妹'],
    highschool: ['高中生', '高中', '小學'],
    parents: ['父母', '爸爸', '媽媽', '父親', '母親'],
    actor: ['演員'],
    magic: ['魔術師', '魔術'],
    adult: ['成年人', '成年', '大人'],
    twin: ['雙胞胎', '雙胞胎兄弟'], 
    Kansai: ['關西', '關西的偵探', '關西的人','關西人','關西偵探'],
    Kanto: ['關東', '關東的偵探', '關東的人','關東人','關東偵探'],
    dark: ['皮膚是黑色的','皮膚黑','皮膚是黑的','膚色偏黑','皮膚偏黑','黑皮','膚色黑'], 
    adie: ['死亡','死去','過世','離世','離開','去世','死掉','死'],
    boom: ['被炸死','拆彈時死亡','因爆炸死亡','爆炸死亡'],
    CarAccident: ['被撞死','遇到車禍','因車禍死亡','車禍死亡'],
    Shinichi: ['江戶川柯南就是工藤新一','柯南的真實身分','柯南就是新一'],
  },
  "鬼滅之刃": {
    boy: ['男', '男生', '男性'],
    girl: ['女', '女生', '女性'],  
    column: ['柱', '柱級', '柱之一'],
    die: ['死亡', '死了', '去世', '死掉','死'],
    Texture: ['斑紋'],
    scar: ['傷痕', '疤', '疤痕'],
    battle: ['參加無限城決戰', '進入無限城', '參加決戰','參加最終決戰','最終決戰'],
    leader: ['領袖','領導','領導者'],
    ghost: ['鬼', '變鬼'],
    people: ['人類', '人'],
    explode: ['自爆死亡', '自爆', '炸死'],
    half: ['被切一半死亡', '被切一半'],
    gentle: ['溫柔', '柔和'],
    irritable: ['暴躁', '易怒', '脾氣差'],
    eat: ['喜歡吃東西', '愛吃'],
    color: ['雙拼髮色', '頭髮有兩種顏色'],
    sisters: ['兄弟姊妹', '兄弟', '姊妹', '姐姐', '妹妹', '弟弟', '哥哥'],
    blackhair: ['黑髮', '黑頭髮', '黑色頭髮'],
    Upper: ['上弦', '上弦鬼'],
    lower: ['下弦', '下弦鬼'],
    facial: ['五官正常', '正常五官'],
    mikami: ['上弦三以上', '上三以上'],
    threeDown: ['上弦三以下', '上三以下'],
    Blood: ['血鬼術'],
    breathe: ['呼吸法'],
    knife: ['日輪刀'],
    mask: ['面具', '戴面具'],
    moon: ['十二鬼月', '十二鬼月成員'],
    fiveSenses: ['五感組', '五感組成員','五小隻']
  },
  "FREE!": {
    swimmer: ['游泳社成員', '游泳社', '泳社'],
    iwatobi: ['岩鳶高校學生', '岩鳶', '岩鳶高中'],
    samezuka: ['鮫柄學園學生', '鮫柄', '鮫柄學園'],
    abroad: ['轉學', '留學', '曾留學', '曾轉學'],
    childhood: ['青梅竹馬', '幼馴染'],
    quiet: ['冷靜寡言', '冷靜', '寡言','少言','話很少','話不多'],
    gentle: ['溫柔', '柔和', '和善'],
    cheerful: ['氣氛製造者', '搞笑', '活潑', '開朗'],
    beginner: ['游泳初學者', '不會游泳', '新手'],
    siblings: ['兄弟姊妹', '兄弟', '姊妹', '哥哥', '姐姐', '弟弟', '妹妹'],
    manager: ['游泳社經理', '經理', '社長助理'],
    coach: ['教練', '泳隊教練'],
    volatilize: ['黑髮', '黑色頭髮'],
    red: ['橘髮', '紅髮', '橘/紅髮'],
    brown: ['棕髮', '咖啡色頭髮'],
    blue: ['藍髮', '藍色頭髮'],
    yellow: ['黃髮', '金髮', '黃色頭髮','金色頭髮']
  }
};

// ===== 每個主題對應的30格資料（圖片+文字） =====

Promise.all([
  fetch('data/conan.json').then(r => r.json()),
  fetch('data/conan_redblack.json').then(r => r.json()),
  fetch('data/ghost.json').then(r => r.json()),
  fetch('data/wind_breaker.json').then(r => r.json()),
  fetch('data/free.json').then(r => r.json())
])
.then(([conan, conanRed, ghost, wind, free]) => {
  gridData['名偵探柯南'] = conan;
  gridData['名偵探柯南-紅黑篇'] = conanRed;
  gridData['鬼滅之刃'] = ghost;
  gridData['防風少年'] = wind;
  gridData['FREE!'] = free;
  console.log('角色資料載入完成');
});


// ===== AI 問題選擇（避免重複） =====
function getAIQuestion(topic) {
  const commonQuestions = AI_DB.common || [];
  const topicQuestions = AI_DB[topic] || [];
  const allQuestions = [...commonQuestions, ...topicQuestions];

  let remainingQuestions = allQuestions.filter(q => !askedQuestions.includes(q.question));
  if (remainingQuestions.length === 0) {
    askedQuestions = [];
    remainingQuestions = [...allQuestions];
  }
  const chosen = remainingQuestions[Math.floor(Math.random() * remainingQuestions.length)];
  if (chosen && chosen.question) askedQuestions.push(chosen.question);
  return chosen;
}

function askQuestion() {
  const allTags = {};
  
  // 1. 統計剩下角色中，每個標籤出現的次數
  remainingCharacters.forEach(char => {
    char.tags.forEach(tag => {
      allTags[tag] = (allTags[tag] || 0) + 1;
    });
  });

  // 2. 篩選掉已經問過的標籤
  const unusedTags = Object.keys(allTags).filter(tag => !askedQuestions.includes(tag));

  if (unusedTags.length === 0) {
    // 如果沒標籤好問了，就直接猜測
    const finalGuess = remainingCharacters[Math.floor(Math.random() * remainingCharacters.length)];
    makeFinalGuess(finalGuess);
    return;
  }

  // 3. 【關鍵優化】尋找最接近「剩餘人數一半」的標籤
  const targetCount = remainingCharacters.length / 2;
  let bestTag = unusedTags[0];
  let minDiff = Math.abs(allTags[bestTag] - targetCount);

  unusedTags.forEach(tag => {
    const diff = Math.abs(allTags[tag] - targetCount);
    if (diff < minDiff) {
      minDiff = diff;
      bestTag = tag;
    }
  });

  // 4. 提問
  currentQuestionTag = bestTag;
  askedQuestions.push(bestTag);
  addLog(`🤖 AI 問：${bestTag}？`);
}

// ✅ 檢查是否有區分度
function hasEliminationPotential(key, remaining) {
  let hasTrue = false, hasFalse = false;
  remaining.forEach(c => {
    if (c.traits && typeof c.traits[key] === 'boolean') {
      if (c.traits[key]) hasTrue = true;
      else hasFalse = true;
    }
  });
  return hasTrue && hasFalse; // 只有同時存在 true/false 才有區分度
}



// ===== 修正 AI 提問函式 =====
function AIAskQuestion() {
  console.log('[AI] AIAskQuestion called', { selectedTopic });
  
  if (!selectedTopic) {
    addMessage('system', '請先選擇主題');
    return;
  }

  const dataList = gridData[selectedTopic] || [];
  if (dataList.length === 0) {
    addMessage('system', '此主題無資料');
    return;
  }

  // 取得 AI 的問題（從題庫中選擇）
  const topicQuestions = AI_DB[selectedTopic] || [];
  if (topicQuestions.length === 0) {
    addMessage('system', '此主題無可用問題');
    turn = 'player';
    enableChat();
    return;
  }

  // 篩選尚未問過的問題
  const unusedQuestions = topicQuestions.filter(q => 
    !askedQuestions.includes(q.question)
  );

  let chosenQuestion;
  if (unusedQuestions.length > 0) {
    chosenQuestion = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
  } else {
    // 所有問題都問過了，重設並重新開始
    askedQuestions = [];
    chosenQuestion = topicQuestions[Math.floor(Math.random() * topicQuestions.length)];
  }

  // 記錄問題
  askedQuestions.push(chosenQuestion.question);
  lastAIQuestion = chosenQuestion.question;
  
  // 顯示 AI 的問題
  addMessage('AI', `${chosenQuestion.question}`);
  
  // 切換狀態等待玩家回答
  turn = 'waitingForAnswer';
  aiAwaitingAnswer = true;
  enableChat();
  
  
  updateGuessButtonState();
}

// ===== 修正 AI 回答玩家問題的邏輯 =====
function AIAnswer(playerQuestion) {
  console.log('[AI] AIAnswer called', { selectedTopic, playerQuestion });
  
  if (!selectedTopic || !AIChoice) {
    addMessage('AI', '遊戲尚未開始或資料不完整');
    return;
  }

  const dataList = gridData[selectedTopic] || [];
  const antidote = dataList.find(c => c.name === AIChoice);

  if (!antidote || !antidote.traits) {
    addMessage('AI', '這個問題我無法回答');
    return;
  }

  let matchedKey = null;
  const topicSynonyms = synonyms[selectedTopic] || {};
  const topicTraitMap = AI_DB.traitMap[selectedTopic] || {};

  console.log('[AI] 檢查同義詞表:', topicSynonyms);
  console.log('[AI] 檢查特徵表:', topicTraitMap);

  // 🔹 先檢查同義詞表
  for (const key in topicSynonyms) {
    if (topicSynonyms[key].some(word => playerQuestion.includes(word))) {
      matchedKey = key;
      console.log('[AI] 同義詞匹配成功:', key);
      break;
    }
  }

  // 🔹 如果沒匹配到同義詞，嘗試直接匹配 traitMap
  if (!matchedKey) {
    for (const key in topicTraitMap) {
      if (playerQuestion.includes(topicTraitMap[key])) {
        matchedKey = key;
        console.log('[AI] 特徵匹配成功:', key);
        break;
      }
    }
  }

  let answer = '這個問題我無法回答';
  
  if (matchedKey && antidote.traits[matchedKey] !== undefined) {
    const traitValue = antidote.traits[matchedKey];
    
    if (typeof traitValue === 'boolean') {
      answer = traitValue ? '是' : '不是';
    } else if (typeof traitValue === 'string') {
      answer = (traitValue === 'true' || traitValue === '是') ? '是' : '不是';
    } else {
      answer = '這個問題無法判斷';
    }
    console.log('[AI] 回答:', answer, '特徵值:', traitValue);
  } else {
    console.log('[AI] 未匹配到特徵:', matchedKey);
  }

  addMessage('AI', answer);
  
  // 更新可能選項
  if (matchedKey) {
    updatePossibleCells(playerQuestion, answer);
  }

  // 切換回合
  turn = 'AI';
  setTimeout(() => {
    AIGuessOrAsk();
  }, 800);
}

// 刪除第 628-662 行的舊版 updatePossibleCells 函式
// 只保留一個統一的 updatePossibleCells 函式

// ===== 統一的 updatePossibleCells 函式（保留第 418-460 行的版本） =====
function updatePossibleCells(question, answer) {
  console.log('[AI] updatePossibleCells', { question, answer });
  
  const before = possibleCells.map(c => c.name);
  
  // 玩家問問題時，AI 回答後要更新可能選項
  if (turn === 'player') {
    const topicSynonyms = synonyms[selectedTopic] || {};
    const topicTraitMap = AI_DB.traitMap[selectedTopic] || {};
    
    possibleCells = possibleCells.filter(cell => {
      const traits = cell.traits || {};
      
      // 檢查是否匹配問題關鍵字
      for (const key in topicSynonyms) {
        if (topicSynonyms[key].some(word => question.includes(word))) {
          const traitValue = traits[key];
          if (traitValue === undefined) return true;
          
          const expectedAnswer = (traitValue === true || traitValue === 'true' || traitValue === '是') ? '是' : '不是';
          return answer === expectedAnswer;
        }
      }
      
      // 檢查特徵表
      for (const key in topicTraitMap) {
        if (question.includes(topicTraitMap[key])) {
          const traitValue = traits[key];
          if (traitValue === undefined) return true;
          
          const expectedAnswer = (traitValue === true || traitValue === 'true' || traitValue === '是') ? '是' : '不是';
          return answer === expectedAnswer;
        }
      }
      
      return true;
    });
  } 
  // AI 問問題後，根據玩家回答更新可能選項
  else if (turn === 'waitingForAnswer') {
    const isPositive = answer === '是' || answer === '有';
    
    possibleCells = possibleCells.filter(cell => {
      const traits = cell.traits || {};
      
      // 解析 AI 剛才問的問題對應的特徵
      const topicSynonyms = synonyms[selectedTopic] || {};
      const topicTraitMap = AI_DB.traitMap[selectedTopic] || {};
      
      for (const key in topicSynonyms) {
        if (topicSynonyms[key].some(word => lastAIQuestion.includes(word))) {
          const traitValue = traits[key];
          if (traitValue === undefined) return true;
          
          const hasTrait = traitValue === true || traitValue === 'true' || traitValue === '是';
          return isPositive ? hasTrait : !hasTrait;
        }
      }
      
      for (const key in topicTraitMap) {
        if (lastAIQuestion.includes(topicTraitMap[key])) {
          const traitValue = traits[key];
          if (traitValue === undefined) return true;
          
          const hasTrait = traitValue === true || traitValue === 'true' || traitValue === '是';
          return isPositive ? hasTrait : !hasTrait;
        }
      }
      
      return true;
    });
  }

  const after = possibleCells.map(c => c.name);
  console.log('[AI] 排除後剩下：', after);
}

// ===== 修正 startRockPaperScissors =====
// ===== 猜拳流程 =====
function startRockPaperScissors() {
  addMessage('system', '猜拳開始決定先後...');
  const options = ['石頭', '剪刀', '布'];
  const playerHand = options[Math.floor(Math.random() * 3)];
  const AIHand = options[Math.floor(Math.random() * 3)];
  addMessage('player', `玩家出拳：${playerHand}`);
  addMessage('AI', `AI 出拳：${AIHand}`);

  if (playerHand === AIHand) {
    addMessage('system', '平手，重新猜拳...');
    setTimeout(startRockPaperScissors, 800);
    return;
  }

  const playerWins =
    (playerHand === '石頭' && AIHand === '剪刀') ||
    (playerHand === '剪刀' && AIHand === '布') ||
    (playerHand === '布' && AIHand === '石頭');

  turn = playerWins ? 'player' : 'AI';
  addMessage('system', `${turn === 'player' ? '玩家' : 'AI'} 先問`);
  
  // 重置相關變數
  askedQuestions = [];
  aiGuessCount = 0;
  aiGuessLocked = false;
  aiAwaitingAnswer = false;
  
  // 重要：重置可能選項為所有角色
  const dataList = gridData[selectedTopic] || [];
  possibleCells = [...dataList];
  
  // 重置提問計數
  questionsAskedByPlayer = 0;
  questionsAskedByAI = 0;
  
  updateGuessButtonState();

  setTimeout(() => {
    if (turn === 'AI') {
      AIAskQuestion();
    } else {
      enableChat();
      addMessage('system', '請輸入你的問題');
    }
  }, 500);
}

// ===== 處理玩家發問（玩家問 AI） =====
function handlePlayerAsk_forSubmit(msg) {
  console.log('[Player] 玩家問問題:', msg, '當前回合:', turn);
  
  // 若進入猜題階段，阻止用聊天再問
  if (canGuess) {
    showSystemMessage('目前為猜題階段，請使用「我要猜」，或先略過猜題再提問。');
    enableChat();
    return;
  }

  // 確保當前是玩家回合
  if (turn !== 'player') {
    addMessage('system', '現在不是你的回合喔');
    enableChat(); // 讓玩家可以繼續輸入
    return;
  }

 
  
  // 增加玩家提問計數
  questionsAskedByPlayer++;
  playerTurns++;
  
  if (playerGuessCooldown > 0) playerGuessCooldown--;
  
  console.log('[Player] 玩家問問題後計數:', { 
    questionsAskedByPlayer, 
    questionsAskedByAI,
    playerGuessCooldown 
  });
  
  // 延遲讓玩家看到訊息
  setTimeout(() => { 
    AIAnswer(msg); 
  }, 700);
  
  // 切換回合
  turn = 'AI';
  disableChat();
  
  updateGuessButtonState();
}



// ===== 玩家點「我要猜」按鈕事件 =====
const guessBtn = document.getElementById('guessBtn');
const cancelGuessBtn = document.getElementById('cancelGuessBtn');

if (guessBtn) {
  guessBtn.addEventListener('click', () => {
    if (questionsAskedByPlayer >= 3 && questionsAskedByAI >= 3 && playerGuessCooldown === 0 && turn === 'player') {
      canGuess = true;
      addMessage('system', '猜模式開啟，請點左邊格子來猜！');
      if (gridArea) gridArea.classList.add('guess-mode');

      // ✅ 按鈕切換
      guessBtn.style.display = 'none';
      cancelGuessBtn.style.display = 'inline-block';
    } else {
      showSystemMessage('目前還不能猜喔，請先問問題～');
    }
  });
}

if (cancelGuessBtn) {
  cancelGuessBtn.addEventListener('click', () => {
    canGuess = false;
    addMessage('system', '已取消猜模式');
    if (gridArea) gridArea.classList.remove('guess-mode');

    // ✅ 按鈕切換回來
    guessBtn.style.display = 'inline-block';
    cancelGuessBtn.style.display = 'none';
  });
}



// ===== 修正表單提交處理（解決重複問題） =====
// ===== 處理玩家發問（玩家問 AI） =====
function handlePlayerAsk_forSubmit(msg) {
  console.log('[Player] 玩家問問題:', msg, '當前回合:', turn);
  
  // 若進入猜題階段，阻止用聊天再問
  if (canGuess) {
    showSystemMessage('目前為猜題階段，請使用「我要猜」，或先略過猜題再提問。');
    enableChat();
    return;
  }

  // 確保當前是玩家回合
  if (turn !== 'player') {
    addMessage('system', '現在不是你的回合喔');
    enableChat(); // 讓玩家可以繼續輸入
    return;
  }

  // ⚠️ 刪除這行！因為已經在表單提交時顯示過了
  // addMessage('player', msg); // <-- 刪除這行！
  
  // 增加玩家提問計數
  questionsAskedByPlayer++;
  playerTurns++;
  
  if (playerGuessCooldown > 0) playerGuessCooldown--;
  
  console.log('[Player] 玩家問問題後計數:', { 
    questionsAskedByPlayer, 
    questionsAskedByAI,
    playerGuessCooldown 
  });
  
  // 延遲讓玩家看到訊息
  setTimeout(() => { 
    AIAnswer(msg); 
  }, 700);
  
  // 切換回合
  turn = 'AI';
  disableChat();
  
  updateGuessButtonState();
}

// ===== 玩家回答 AI 的問題 =====
function handlePlayerAnswer(msg) {
  const validAns = ['是', '不是', '有', '沒有'];
  if (!validAns.includes(msg)) {
    addMessage('system', '請用「是 / 不是 / 有 / 沒有」回答喔～');
    enableChat();
    return;
  }

  addMessage('AI', `玩家已回答：${msg}`);
  
  // 更新可能選項（使用統一的 updatePossibleCells）
  updatePossibleCells(lastAIQuestion, msg);

  if (turn === 'waitingForAnswer') {
    aiAwaitingAnswer = false;
    aiGuessLocked = false;
    showSystemMessage('AI 已問問題');

    // 回答完 → 換玩家回合
    turn = 'player';
    
    // 增加玩家和AI的提問計數
    questionsAskedByAI++;
    
    setTimeout(() => {
      addMessage('system', '換你問囉～');
      enableChat();
      updateGuessButtonState();
    }, 500);
  }

  console.log('[Game] player answered', { aiGuessLocked, aiAwaitingAnswer, turn });
}


// ===== 控制「我要猜」按鈕顯示狀態 =====
function updateGuessButtonState() {
  const guessBtn = document.getElementById('guessBtn');
  const cancelGuessBtn = document.getElementById('cancelGuessBtn');
  if (!guessBtn || !cancelGuessBtn) return;

  if (
    turn === 'player' &&
    playerGuessCooldown === 0 &&
    questionsAskedByPlayer >= 3 &&
    questionsAskedByAI >= 3
  ) {
    guessBtn.style.display = 'inline-block';
    guessBtn.disabled = false;
  } else {
    guessBtn.style.display = 'none';
    guessBtn.disabled = true;
    cancelGuessBtn.style.display = 'none'; // ✅ 保證回合結束時也隱藏
  }
}


// ===== AI 的下一步決策 =====
function AIGuessOrAsk() {
  console.log('[AI] AIGuessOrAsk start', checkGameState());
  
  if (turn !== 'AI') {
    console.log('[AI] 不是AI回合，跳過');
    return;
  }
  
  if (aiAwaitingAnswer) {
    console.log('[AI] 等待玩家回答中，跳過');
    return;
  }

  // 如果被鎖定或達到最大猜測次數，只能提問
  if (aiGuessLocked || aiGuessCount >= maxGuesses) {
    console.log('[AI] 猜測被鎖定或達上限，只能提問');
    AIAskQuestion();
    return;
  }

  // 當可能選項少時嘗試猜
  if (possibleCells.length <= 2) {
    console.log('[AI] 可能選項少，嘗試猜測');
    aiTryGuess();
  } else {
    console.log('[AI] 可能選項多，繼續提問');
    AIAskQuestion();
  }
}


// ===== AI 嘗試猜解藥 =====
function aiTryGuess() {
  console.log('[AI] aiTryGuess start', { aiGuessLocked, aiGuessCount, maxGuesses, possibleLen: possibleCells.length });

  if (aiGuessLocked || aiGuessCount >= maxGuesses) {
    console.log('[AI] guess blocked by lock or max');
    return;
  }

  let guess;
  if (possibleCells.length > 0) {
    guess = possibleCells[Math.floor(Math.random() * possibleCells.length)];
  } else {
    showSystemMessage('AI 無法推理出可能解藥，放棄這次猜測');
    aiGuessLocked = true;
    turn = 'player';
    enableChat();
    updateGuessButtonState();
    return;
  }

  if (!guess || !guess.name) {
    showSystemMessage('AI 無法猜出角色名稱，可能資料有誤');
    return;
  }

  addMessage('AI', `我猜可能是 ${guess.name}！`);
  console.log('[AI] guessed', guess.name);

  if (guess.name === antidoteCell) {
    showSystemMessage(`AI 猜的是 ${guess.name}，猜對了！🎉`);
    endGame('AI 猜對了！');
    return;
  }

  // 猜錯處理
  showSystemMessage(`AI 猜的是 ${guess.name}，但猜錯了 😢`);
  aiGuessCount++;
  aiGuessLocked = true;
  aiGuessCooldown = 1;

  turn = 'player';
  canGuess = false;
  enableChat();
  updateGuessButtonState();
  
}

// ===== 顯示系統訊息（短） =====
function showSystemMessage(text) {
  const messages = document.getElementById('messages');
  if (!messages) return;
  const li = document.createElement('li');
  li.className = 'message system';
  li.textContent = text;
  messages.appendChild(li);
  messages.scrollTop = messages.scrollHeight;
}

// ===== 標註解藥格（UI） =====
function markAntidoteCell(cellElement) {
  if (!cellElement) return;
  cellElement.classList.add('selected-antidote');
}



function endGame(resultText) {
  addMessage('system', '遊戲結束');
  disableChat();

  const endModal = document.getElementById('endModal');
  const resultEl = document.getElementById('endResultText');
  const choicesEl = document.getElementById('endChoicesText');

  if (endModal && resultEl && choicesEl) {
    resultEl.textContent = resultText; // 例如：你贏了！或 AI 贏了！
    choicesEl.textContent = `你選的是：${antidoteCell}　｜　AI選的是：${AIChoice}`;
    endModal.style.display = 'flex';
  }
}

// ===== 玩家互動事件 =====
function onPlayerGuess(cellName, isCorrect) {
  addMessage('player', `我猜可能是 ${cellName}！`);
  showSystemMessage(`玩家猜的是 ${cellName}${isCorrect ? '，猜對了！🎉' : '，但猜錯了 '}`);

  if (!isCorrect) {
    markGuessWrong(cellName);
    // ❌ 原本錯誤：updatePossibleCells('', '')
    // ✅ 修正：不要在猜錯時更新 AI 候選
  } else {
    endGame('玩家猜對了！');
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const openQueryModal = document.getElementById('openQueryModal');
  const characterQueryModal = document.getElementById('characterQueryModal');
  const closeQueryModal = document.getElementById('closeQueryModal');

  if (openQueryModal) {
    openQueryModal.addEventListener('click', e => {
      e.preventDefault();
      characterQueryModal.style.display = 'flex';
    });
  }

  if (closeQueryModal) {
    closeQueryModal.addEventListener('click', () => {
      characterQueryModal.style.display = 'none';
    });
 }
});
// ===== 修正人物查詢功能（匹配HTML中的ID） =====
document.addEventListener('DOMContentLoaded', () => {
  const queryModal = document.getElementById('characterQueryModal');
  const openQueryBtn = document.getElementById('openQueryModal');
  const closeQueryBtn = document.getElementById('closeQueryModal');
  const queryBtn = document.getElementById('queryBtn'); // HTML中是 queryBtn
  const queryInput = document.getElementById('queryInput');
  const queryResult = document.getElementById('queryResult');

  // 打開 Modal
  if (openQueryBtn) {
    openQueryBtn.addEventListener('click', e => {
      e.preventDefault();
      if (queryModal) queryModal.style.display = 'flex';
      if (queryInput) queryInput.focus();
    });
  }

  // 關閉 Modal
  if (closeQueryBtn) {
    closeQueryBtn.addEventListener('click', () => {
      if (queryModal) queryModal.style.display = 'none';
      if (queryInput) queryInput.value = '';
      if (queryResult) queryResult.innerHTML = '';
    });
  }

  // 查詢邏輯 - 使用 queryBtn 而不是 querySubmitBtn
  if (queryBtn) {
    queryBtn.addEventListener('click', () => {
      const question = queryInput.value.trim();
      if (!question) {
        if (queryResult) queryResult.innerHTML = '請輸入問題';
        return;
      }

      // 檢查是否有選擇主題
      if (!selectedTopic) {
        if (queryResult) queryResult.innerHTML = '請先開始遊戲並選擇主題';
        return;
      }

      // 獲取當前主題的資料
      const dataList = gridData[selectedTopic] || [];
      const topicSynonyms = synonyms[selectedTopic] || {};
      const topicTraitMap = AI_DB.traitMap[selectedTopic] || {};

      console.log('[Query] 查詢問題:', question, '主題:', selectedTopic);

      // 查找匹配的關鍵字
      let matchedKey = null;
      let matchedTrait = null;
      
      // 先檢查同義詞
      for (const key in topicSynonyms) {
        if (topicSynonyms[key].some(word => question.includes(word))) {
          matchedKey = key;
          matchedTrait = topicTraitMap[key] || key;
          break;
        }
      }
      
      // 如果沒找到，檢查特徵表
      if (!matchedKey) {
        for (const key in topicTraitMap) {
          if (question.includes(topicTraitMap[key])) {
            matchedKey = key;
            matchedTrait = topicTraitMap[key];
            break;
          }
        }
      }

      if (!matchedKey) {
        if (queryResult) queryResult.innerHTML = '❓ 無法辨識問題，請換個問法<br>範例：他是警察嗎？他有戴眼鏡嗎？<br><br><small>提示：請使用簡短明確的問題</small>';
        return;
      }

      // 分析哪些角色有此特徵
      const hasTrait = [];    // 有此特徵的角色
      const noTrait = [];     // 無此特徵的角色
      
      dataList.forEach(character => {
        const traits = character.traits || {};
        const has = traits[matchedKey] === true || traits[matchedKey] === 'true' || traits[matchedKey] === '是';
        
        if (has) {
          hasTrait.push(character.name);
        } else {
          noTrait.push(character.name);
        }
      });

      // 顯示結果
      const resultHTML = `
        <div style="margin-bottom: 15px;">
          <strong>🔍 分析問題：</strong>「${question}」<br>
          <strong>對應特徵：</strong>${matchedTrait}
        </div>
        
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 250px;">
            <strong style="color: #2e7d32;">✓ 有此特徵 (${hasTrait.length}人)：</strong><br>
            <div style="max-height: 150px; overflow-y: auto; margin-top: 5px; padding: 5px; background: #f0f9f0; border-radius: 4px; border: 1px solid #c8e6c9;">
              ${hasTrait.length > 0 ? hasTrait.join('、') : '（無）'}
            </div>
          </div>
          
          <div style="flex: 1; min-width: 250px;">
            <strong style="color: #c62828;">✗ 無此特徵 (${noTrait.length}人)：</strong><br>
            <div style="max-height: 150px; overflow-y: auto; margin-top: 5px; padding: 5px; background: #fff0f0; border-radius: 4px; border: 1px solid #ffcdd2;">
              ${noTrait.length > 0 ? noTrait.join('、') : '（無）'}
            </div>
          </div>
        </div>
        
        <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 4px; font-size: 0.9em; border: 1px solid #bbdefb;">
          <strong>💡 策略提示：</strong>
          <br>• 如果你回答「是」，AI會排除 <strong style="color: #c62828;">${noTrait.length}</strong> 個角色
          <br>• 如果你回答「不是」，AI會排除 <strong style="color: #2e7d32;">${hasTrait.length}</strong> 個角色
          <br>• 建議提問能排除約一半角色的問題
        </div>
      `;
      
      if (queryResult) {
        queryResult.innerHTML = resultHTML;
        // 自動滾動到底部
        setTimeout(() => {
          queryResult.scrollTop = queryResult.scrollHeight;
        }, 100);
      }
    });
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
  const pageKey = "background_game"; 
  const savedBg = localStorage.getItem(pageKey);
  if (savedBg) {
    document.body.style.background = savedBg;
  }
});


// ===== 人物查詢功能 (修復 AI 問答掛掉的問題) =====
function searchCharacter() {
  const input = document.getElementById('queryInput');
  const resultDiv = document.getElementById('queryResult');
  const name = input.value.trim();

  if (!name) {
    resultDiv.innerHTML = '請輸入名稱';
    return;
  }

  // 確保從正確的語料庫查找
  const data = characterData[name];
  if (data) {
    let html = `<h4>${name}</h4><ul>`;
    for (const key in data) {
      html += `<li><strong>${key}:</strong> ${data[key]}</li>`;
    }
    html += '</ul>';
    resultDiv.innerHTML = html;
  } else {
    resultDiv.innerHTML = '查無此人物資料。';
  }
}

// ===== 統一事件綁定 (確保 DOM 加載後執行) =====
document.addEventListener('DOMContentLoaded', () => {
  const queryModal = document.getElementById('characterQueryModal');
  const closeQueryBtn = document.getElementById('closeQueryModal');
  const openQueryBtn = document.getElementById('openQueryModal');
  const bankModal = document.getElementById('question-bank-modal');

  // 綁定人物查詢開關
  if (openQueryBtn) {
    openQueryBtn.addEventListener('click', e => {
      e.preventDefault();
      if (queryModal) queryModal.style.display = 'flex';
    });
  }
  if (closeQueryBtn) {
    closeQueryBtn.addEventListener('click', () => {
      if (queryModal) queryModal.style.display = 'none';
    });
  }

  // 點擊彈窗外部關閉
  window.addEventListener('click', event => {
    if (event.target === queryModal) queryModal.style.display = 'none';
    if (event.target === bankModal) bankModal.style.display = 'none';
  });
});

// ===== 修正題庫功能 =====
window.showQuestionBank = function() {
  const modal = document.getElementById('question-bank-modal');
  // 注意：HTML中是 question-list-container，不是 question-list
  const listContainer = document.getElementById('question-list-container');
  const title = document.getElementById('question-bank-title');

  if (!modal || !listContainer) {
    console.error('題庫Modal元素不存在', { modal, listContainer });
    return;
  }
  
  // 清除之前的內容
  listContainer.innerHTML = '';

  if (!selectedTopic) {
    title.innerText = '請先選擇主題';
    listContainer.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">請先開始遊戲並選擇一個主題</p>';
  } else {
    title.innerText = `【${selectedTopic}】推薦提問`;
    
    // 獲取當前主題的問題庫
    const topicQuestions = AI_DB[selectedTopic] || [];
    const commonQuestions = AI_DB.common || [];
    const allQuestions = [...commonQuestions, ...topicQuestions];
    
    if (allQuestions.length === 0) {
      listContainer.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">此主題暫無題庫資料</p>';
    } else {
      // 顯示問題列表
      allQuestions.forEach((q, index) => {
        const item = document.createElement('div');
        item.className = 'question-item';
        item.style.cssText = `
          cursor: pointer;
          padding: 12px 15px;
          margin: 8px 0;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          transition: all 0.2s;
          color: #333;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        `;
        
        item.textContent = `${index + 1}. ${q.question}`;
        
        // 滑鼠懸停效果
        item.addEventListener('mouseover', () => {
          item.style.background = '#e3f2fd';
          item.style.borderColor = '#2196f3';
          item.style.transform = 'translateY(-2px)';
        });
        
        item.addEventListener('mouseout', () => {
          item.style.background = 'white';
          item.style.borderColor = '#ddd';
          item.style.transform = 'translateY(0)';
        });
        
        // 點擊複製功能
        item.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(q.question);
            
            // 顯示複製成功提示
            item.style.background = '#e8f5e9';
            item.style.borderColor = '#4caf50';
            item.innerHTML = `${index + 1}. ${q.question} <span style="color:#4caf50; margin-left:10px;">✓ 已複製</span>`;
            
            // 顯示全局提示
            showToast('已複製到剪貼簿！');
            
            // 2秒後恢復
            setTimeout(() => {
              item.style.background = 'white';
              item.style.borderColor = '#ddd';
              item.textContent = `${index + 1}. ${q.question}`;
            }, 2000);
          } catch (err) {
            showToast('複製失敗，請手動選取文字複製');
          }
        });
        
        listContainer.appendChild(item);
      });
      
      // 添加使用說明
      const info = document.createElement('div');
      info.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 6px;
        font-size: 12px;
        color: #666;
        border-left: 4px solid #2196f3;
      `;
      info.innerHTML = `
        <strong>💡 使用說明：</strong>
        <br>• 點擊問題即可複製到剪貼簿
        <br>• 貼到聊天框問AI
        <br>• 共 ${allQuestions.length} 個問題
      `;
      listContainer.appendChild(info);
    }
  }
  
  modal.style.display = 'flex';
};

// ===== 添加調試功能，檢查題庫元素是否存在 =====
function debugQuestionBank() {
  console.log('=== 題庫元素檢查 ===');
  console.log('modal:', document.getElementById('question-bank-modal'));
  console.log('listContainer:', document.getElementById('question-list-container'));
  console.log('title:', document.getElementById('question-bank-title'));
  console.log('selectedTopic:', selectedTopic);
  console.log('AI_DB:', AI_DB);
  console.log('====================');
}

// 在控制台可以調用 debugQuestionBank() 來檢查


// ===== 點擊外部關閉彈窗 =====
document.addEventListener('DOMContentLoaded', () => {
  // 點擊題庫彈窗外部關閉
  const bankModal = document.getElementById('question-bank-modal');
  if (bankModal) {
    bankModal.addEventListener('click', (e) => {
      if (e.target === bankModal) {
        closeQuestionBank();
      }
    });
  }
  
  // 點擊查詢彈窗外部關閉
  const queryModal = document.getElementById('characterQueryModal');
  if (queryModal) {
    queryModal.addEventListener('click', (e) => {
      if (e.target === queryModal) {
        queryModal.style.display = 'none';
        const queryInput = document.getElementById('queryInput');
        const queryResult = document.getElementById('queryResult');
        if (queryInput) queryInput.value = '';
        if (queryResult) queryResult.innerHTML = '';
      }
    });
  }
});




// ===== 修正題庫按鈕綁定 =====
document.addEventListener('DOMContentLoaded', () => {
  const openBankBtn = document.getElementById('openQuestionBank');
  
  if (openBankBtn) {
    // 移除舊的事件監聽器
    openBankBtn.removeEventListener('click', showQuestionBank);
    
    // 重新綁定
    openBankBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showQuestionBank();
    });
  }
  
  const closeBankBtn = document.getElementById('closeQuestionBank');
  if (closeBankBtn) {
    closeBankBtn.addEventListener('click', closeQuestionBank);
  }
  
  // 點擊外部關閉
  const bankModal = document.getElementById('question-bank-modal');
  if (bankModal) {
    bankModal.addEventListener('click', (e) => {
      if (e.target === bankModal) {
        closeQuestionBank();
      }
    });
  }
});