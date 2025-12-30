window.AIDebugLog = [];

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
let playerName = '大小姐';
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
let gridData = {};


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

// ===== 開始遊戲 =====
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
    cell.className = 'cell';

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
    cell.className = 'cell';
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
  { name: '防風少年', img: 'img-WB/防風少年-logo.png' },
  { name: 'FREE!', img: 'img-Free/Free_logo.png' }
];

// 🎲 AI 問題選擇邏輯：合併通用 + 主題題庫


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



'鬼滅之刃': [
{ question: '他是不是柱？（曾經也算）', trait: 'column' },
{ question: '他最後是不是死了？', trait: 'die' },
{ question: '他有沒有開斑紋？', trait: 'Texture' },
{ question: '他的臉上有沒有傷痕、疤痕？', trait: 'scar' },
{ question: '他有沒有參加無限城決戰？', trait: 'battle ' },
{ question: '他是不是領袖？', trait: 'leader' },
{ question: '他是不是鬼？（曾經變鬼算，吃鬼不算、無限城不算）', trait: 'ghost' },
{ question: '他是不是人？', trait: 'people' },
{ question: '他是不是自爆而亡的？', trait: 'explode' },
{ question: '他是不是被切一半死的？', trait: 'half' },
{ question: '他是不是很溫柔？', trait: 'gentle' },
{ question: '他是不是很暴躁？', trait: 'irritable' },
{ question: '他是不是喜歡吃東西？', trait: 'eat' },
{ question: '他的頭髮是不是雙拼髮色？', trait: 'color ' },
{ question: '他有沒有兄弟姐妹？', trait: 'sisters' },
{ question: '他的頭髮有黑色嗎？', trait: 'blackhair' },
{ question: '他是上弦嗎？', trait: 'Upper' },
{ question: '他是下弦嗎？', trait: 'lower' },
{ question: '他的臉是不是一般五官？（一雙眼睛一個鼻子一個嘴巴，都在正常位子上）', trait: 'facial' },
{ question: '他是不是上弦三以上？', trait: 'Mikami' },
{ question: '他是不是上弦三以下？', trait: 'ThreeDown' },
{ question: '他會不會使用血鬼術？', trait: 'Blood' },
{ question: '他會使用呼吸法嗎？', trait: 'breathe' },
{ question: '他使用日輪刀嗎？', trait: 'knife' },
{ question: '他有戴面具嗎？', trait: 'mask' },
{ question: '他是十二鬼月的一員嗎', trait: 'moon' },
{ question: '他是五感組的一員嗎', trait: 'FiveSenses' },
],

'防風少年': [
{ question: '他是風鈴的嗎？', trait: 'column' },
{ question: '他很擅長打架嗎？', trait: 'die' },
{ question: '？', trait: 'column' },
{ question: '他是GRAVEL的嗎？', trait: 'Texture' },
{ question: '他是獅子頭連的嗎？', trait: 'scar' },
{ question: '他是六方一座的嗎？', trait: 'battle ' },
{ question: '他是烽的嗎？', trait: 'leader' },
{ question: '他是四天王的嗎？（曾經變鬼算，吃鬼不算）', trait: 'ghost' },
{ question: '他是多聞眾的嗎？', trait: 'people' },
{ question: '他是持國眾的嗎？', trait: 'explode' },
{ question: '他是增長眾的嗎？', trait: 'half' },
{ question: '他是廣目眾的嗎？', trait: 'gentle' },
{ question: '他是級長嗎？', trait: 'irritable' },
{ question: '他是副級長嗎？', trait: 'eat' },
{ question: '他是總代嗎？', trait: 'color ' },
{ question: '他有沒有兄弟姐妹（親的）？', trait: 'sisters' },
{ question: '他是黑髮嗎？（半邊也算）', trait: 'blackhair' },
{ question: '他有戴耳環嗎？', trait: 'Upper' },
{ question: '他成年了嗎？', trait: 'lower' },
],



  'FREE!': [
    { question: '他是不是游泳選手' },
    { question: '他是不是高中生' },
    { question: '他有沒有紅頭髮' }
  ],

  // 🔹 trait 對照表
  traitMap: {
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
    Disguise: '易容',
    family: '兄弟姊妹',
    highschool: '高中生',
    parents: '父母',
    actor: '演員',
    magic: '魔術師',
    adult: '成年人'
  }
};

//AI相近詞偵測
const synonyms = {

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
  hairNotBlack: ['黑髮', '黑頭髮', '黑色頭髮',],
  hasHat: ['帽子', '帽', '戴帽'],
  hasBeard: ['鬍子'],
  isFat: ['胖', '壯', '壯碩', '肥', '肥胖'],
  isLongHair: ['長頭髮', '長髮'],
  isShortHair: ['短頭髮', '短髮'],
  hasChildhoodFriend: ['青梅竹馬', '幼馴染'],
  hasGlasses: ['眼鏡'],
  karate: ['空手道'],
  Disguise: ['易容'],
  family: ['兄弟姊妹', '哥哥', '弟弟', '姊姊', '姐姐', '妹妹'],
  highschool: ['高中生', '高中', '小學'],
  parents: ['父母', '爸爸', '媽媽', '父親', '母親'],
  actor: ['演員'],
  magic: ['魔術師', '魔術'],
  adult: ['成年人', '成年', '大人',]

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



// ===== AI 問題選擇（避免重复） =====
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



// ===== AI 問問題 =====
function AIAskQuestion() {
  const dataList = gridData[selectedTopic] || [];
  const remaining = dataList.filter(c => possibleCells.includes(c.name));

  if (questionsAskedByAI === 0) {
    const commonQuestions = AI_DB.common;
    const chosen = commonQuestions[Math.floor(Math.random() * commonQuestions.length)];
    addMessage('AI', chosen.question);
    aiAwaitingAnswer = true;
    questionsAskedByAI++;
    lastAIQuestion = chosen.question;
    if (chosen.trait) askedTraits.push(chosen.trait); // ✅ 記錄 trait
    turn = 'waitingForAnswer';
    enableChat();
    return;
  }

  if (remaining.length === 0) {
    const allQuestions = [...(AI_DB.common || []), ...(AI_DB[selectedTopic] || [])];
    const randomQ = allQuestions[Math.floor(Math.random() * allQuestions.length)];
    if (randomQ && randomQ.question) {
      addMessage('AI', randomQ.question);
      aiAwaitingAnswer = true;
      questionsAskedByAI++;
      lastAIQuestion = randomQ.question;
      if (randomQ.trait) askedTraits.push(randomQ.trait); // ✅ 記錄 trait
      turn = 'waitingForAnswer';
      enableChat();
    }
    return;
  }

  const traitCounts = {};
  remaining.forEach(c => {
    for (const key in c.traits) {
      const val = c.traits[key];
      if (!traitCounts[key]) traitCounts[key] = { yes: 0, no: 0 };
      if (val === true) traitCounts[key].yes++;
      else if (val === false) traitCounts[key].no++;
    }
  });

  let bestTrait = null;
  let bestCount = 0;
  for (const key in traitCounts) {
    const { yes, no } = traitCounts[key];
    const total = yes + no;

    if (askedTraits.includes(key)) continue;
    if (yes === 0 || no === 0) continue; // 沒區分度
    const existsInRemaining = remaining.some(c => c.traits[key] === true) &&
      remaining.some(c => c.traits[key] === false);
    if (!existsInRemaining) continue;



    if (total > bestCount) {
      bestCount = total;
      bestTrait = key;
    }
  }


  if (bestTrait) {
    const question = AI_DB.traitMap[bestTrait]
      ? `他有${AI_DB.traitMap[bestTrait]}嗎？`
      : `他有${bestTrait}嗎？`;
    addMessage('AI', question);
    aiAwaitingAnswer = true;
    questionsAskedByAI++;
    lastAIQuestion = question;
    askedTraits.push(bestTrait);             // ✅ 記錄 trait
    turn = 'waitingForAnswer';
    enableChat();
  }
}





// ===== AI 回答玩家問題（穩定版） =====
function AIAnswer(playerQuestion) {
  if (!selectedTopic || !AIChoice) return;
  const dataList = gridData[selectedTopic] || [];
  const antidote = dataList.find(c => c.name === AIChoice);

  if (!antidote || !antidote.traits) {
    addMessage('AI', '這個問題無關或不重要');
    return;
  }

  let matchedKey = null;

  // 🔹 先跑同義詞表
  for (const key in synonyms) {
    if (synonyms[key].some(word => playerQuestion.includes(word))) {
      matchedKey = key;
      break;
    }
  }

  // 🔹 如果找到 trait → 回答是/不是
  let answer = '不重要';
  if (matchedKey) {
    const val = antidote.traits[matchedKey];
    if (typeof val === 'boolean') {
      answer = val ? '是' : '不是';
    } else if (typeof val === 'string') {
      answer = val;
    }
  }

  addMessage('AI', answer);
  updatePossibleCells(playerQuestion, answer);

  turn = 'AI';
  setTimeout(() => { AIGuessOrAsk(); }, 800);
}


// ===== 處理玩家發問（玩家問 AI） =====
function handlePlayerAsk_forSubmit(msg) {
  // 若進入猜題階段，阻止用聊天再問
  if (canGuess) {
    showSystemMessage('目前為猜題階段，請使用「我要猜」，或先略過猜題再提問。');
    enableChat();
    return;
  }

  setTimeout(() => { AIAnswer(msg); }, 700);
  playerTurns++;
  questionsAskedByPlayer++;
  if (playerGuessCooldown > 0) playerGuessCooldown--;
  updateGuessButtonState();
}

// ===== 更新 AI 可能解藥清單（排除法） =====
function updatePossibleCells(question, playerAnswer) {
  const before = possibleCells.map(c => c.name); // 排除前

  // 🚫 如果這次的 question 是玩家問的，就不要進行排除
  if (turn === 'player') {
    return;
  }

  possibleCells = possibleCells.filter(cell => {
    const traits = cell.traits || {};

    // 不再用 guessedWrongCells 來排除
    // if (guessedWrongCells.includes(cell.name)) return false;

    for (const key in AI_DB.traitMap) {
      const keyword = AI_DB.traitMap[key];
      if (question.includes(keyword)) {
        const val = traits[key];
        if (val === undefined) return true;
        if (typeof val === 'boolean') {
          if (playerAnswer === '是' || playerAnswer === '有') return val === true;
          else if (playerAnswer === '不是' || playerAnswer === '沒有') return val === false;
        } else if (typeof val === 'string') {
          return playerAnswer === val;
        }
      }
    }

    return true;
  });

  const after = possibleCells.map(c => c.name); // 排除後
  const eliminated = before.filter(name => !after.includes(name));

  // 保留原本的紀錄
  if (question && playerAnswer) {
    window.AIDebugLog = window.AIDebugLog || [];
    window.AIDebugLog.push({
      round: currentRound,
      aiQuestion: question,
      playerAnswer: playerAnswer,
      playerQuestion: playerQuestion || null,
      aiAnswer: aiAnswer || null,
      eliminated: eliminated || [],
      remaining: after || [],
      guess: guessInfo || null
    });
  }

  console.log('[DebugLog] 推理紀錄更新', window.AIDebugLog);
  console.log('🧩 AI 可能解藥剩下：', after);
}





// ===== 玩家點「我要猜」按鈕事件 =====
const guessBtnEl = document.getElementById('guessBtn');
if (guessBtnEl) {
  guessBtnEl.addEventListener('click', () => {
    if (questionsAskedByPlayer >= 3 && questionsAskedByAI >= 3 && playerGuessCooldown === 0 && turn === 'player') {
      canGuess = true;
      guessBtnEl.style.display = 'inline-block';
      addMessage('system', '「我要猜」功能開啟！');
      showSystemMessage('請在左側點一個格子來猜解藥！');
      if (gridArea) gridArea.classList.add('guess-mode');
    } else {
      showSystemMessage('目前還不能猜喔，請先問問題～');
    }
  });
}

// ===== 表單送出（玩家問或回答） =====
if (chatForm) {
  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if (!msg) return;

    addMessage('player', msg);
    chatInput.value = '';
    disableChat();

    if (turn === 'player') {
      // 當玩家回合發言，被視為問問題
      handlePlayerAsk_forSubmit(msg);
    } else if (turn === 'waitingForAnswer') {
      handlePlayerAnswer(msg);
    } else {
      // 若不是在玩家回合，允許問問題當作普通詢問（也會觸發 AI 回答）
      handlePlayerAsk_forSubmit(msg);
    }
  });
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
  updatePossibleCells(lastAIQuestion, msg);

  if (turn === 'waitingForAnswer') {
    aiAwaitingAnswer = false;
    aiGuessLocked = false;
    showSystemMessage('AI 已問問題');

    // ✅ 修正：回答完 → 換玩家回合
    turn = 'player';
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
  if (!guessBtn) return;

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
  }
}

// ===== AI 的下一步決策 =====
function AIGuessOrAsk() {
  console.log('[AI] AIGuessOrAsk start', { turn, aiGuessLocked, aiAwaitingAnswer, aiGuessCount, possibleLen: possibleCells.length });

  if (turn !== 'AI') return;
  if (aiAwaitingAnswer) return;

  if (aiGuessLocked || aiGuessCount >= maxGuesses) {
    AIAskQuestion();
    return;
  }

  if (aiGuessCooldown > 0) aiGuessCooldown--;
  if (playerGuessCooldown > 0) playerGuessCooldown--;
  updateGuessButtonState();

  // 當可能選項少時嘗試猜
  if (possibleCells.length <= 3) {
    aiTryGuess();
  } else {
    AIAskQuestion(); // ← 改良版
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
  addMessage('system', '換你問我囉～');
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
