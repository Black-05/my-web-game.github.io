const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const messageElement = document.getElementById('message');
const startButton = document.getElementById('start-button');
const modeSelect = document.getElementById('game-mode');
const difficultySelect = document.getElementById('difficulty');
const leaderboardList = document.getElementById('leaderboard-list');
const leaderboardMode = document.getElementById('leaderboard-mode');

const CELL_SIZE = 24;
const CELLS = canvas.width / CELL_SIZE;
const modeNames = { classic: '經典模式', time: '60 秒限時', wrap: '穿牆模式' };
const speeds = { easy: 180, normal: 135, hard: 95 };
let snake;
let food;
let direction;
let nextDirection;
let score = 0;
let gameMode = 'classic';
let difficulty = 'normal';
let elapsed = 0;
let running = false;
let paused = false;
let timer = null;
let snakeSkin = ArcadeFeatures.getSkin();

function refreshLeaderboard() {
  const selectedMode = modeSelect.value;
  leaderboardMode.textContent = `・${modeNames[selectedMode]}`;
  ArcadeFeatures.renderLeaderboard(leaderboardList, ArcadeFeatures.getScores('snake', selectedMode));
}

function tickInterval() {
  return Math.max(65, speeds[difficulty] - Math.floor(score / 50) * 5);
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(tick, tickInterval());
}

function placeFood() {
  const emptyCells = [];
  for (let y = 0; y < CELLS; y++) {
    for (let x = 0; x < CELLS; x++) {
      if (!snake.some(segment => segment.x === x && segment.y === y)) {
        emptyCells.push({ x, y });
      }
    }
  }
  return emptyCells.length ? emptyCells[Math.floor(Math.random() * emptyCells.length)] : null;
}

function drawCell(x, y, color, inset = 2) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(
    x * CELL_SIZE + inset,
    y * CELL_SIZE + inset,
    CELL_SIZE - inset * 2,
    CELL_SIZE - inset * 2,
    6
  );
  ctx.fill();
}

function draw() {
  ctx.fillStyle = '#11111b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(69, 71, 90, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= CELLS; i++) {
    const position = i * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(canvas.width, position);
    ctx.stroke();
  }

  if (food) {
    drawCell(food.x, food.y, snakeSkin.enemy, 3);
    ctx.fillStyle = snakeSkin.food;
    ctx.beginPath();
    ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (snake) {
    snake.forEach((segment, index) => {
      drawCell(segment.x, segment.y, index === 0 ? snakeSkin.player : snakeSkin.snake);
    });
  }
}

function tick() {
  if (!running || paused) return;
  elapsed += tickInterval() / 1000;
  if (gameMode === 'time') {
    const remaining = Math.max(0, 60 - Math.floor(elapsed));
    timerElement.textContent = `${remaining}s`;
    if (remaining === 0) {
      endGame('時間到！');
      return;
    }
  }

  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };
  if (gameMode === 'wrap') {
    head.x = (head.x + CELLS) % CELLS;
    head.y = (head.y + CELLS) % CELLS;
  }
  const eating = head.x === food.x && head.y === food.y;
  const bodyToCheck = eating ? snake : snake.slice(0, -1);

  if (
    (gameMode !== 'wrap' && (head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS)) ||
    bodyToCheck.some(segment => segment.x === head.x && segment.y === head.y)
  ) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (eating) {
    score += 10;
    scoreElement.textContent = score;
    ArcadeFeatures.playSound('collect');
    food = placeFood();
    if (!food) {
      endGame('太厲害了！你填滿了整個棋盤！');
      return;
    }
  } else {
    snake.pop();
  }

  if (eating) startTimer();
  draw();
}

function startGame() {
  clearInterval(timer);
  gameMode = modeSelect.value;
  difficulty = difficultySelect.value;
  modeSelect.disabled = true;
  difficultySelect.disabled = true;
  const center = Math.floor(CELLS / 2);
  snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
    { x: center - 3, y: center }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  elapsed = 0;
  running = true;
  paused = false;
  scoreElement.textContent = score;
  messageElement.textContent = '';
  startButton.textContent = '重新開始';
  timerElement.textContent = gameMode === 'time' ? '60s' : '∞';
  food = placeFood();
  draw();
  startTimer();
}

function endGame(message = '遊戲結束！') {
  running = false;
  paused = false;
  clearInterval(timer);
  modeSelect.disabled = false;
  difficultySelect.disabled = false;
  ArcadeFeatures.renderLeaderboard(
    leaderboardList,
    ArcadeFeatures.recordScore('snake', gameMode, score)
  );
  ArcadeFeatures.playSound('gameover');
  messageElement.textContent = `${message} 本次得分：${score}`;
  startButton.textContent = '再玩一次';
  draw();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    clearInterval(timer);
    messageElement.textContent = '已暫停，按 P 繼續';
  } else {
    messageElement.textContent = '';
    startTimer();
  }
}

const directionByKey = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 }
};

startButton.addEventListener('click', startGame);
modeSelect.addEventListener('change', refreshLeaderboard);
ArcadeFeatures.bindSkin(document.getElementById('skin-select'), skin => {
  snakeSkin = skin;
  draw();
});
ArcadeFeatures.bindSoundToggle(document.getElementById('sound-toggle'));
refreshLeaderboard();
document.addEventListener('keydown', event => {
  if (event.code === 'KeyP') {
    togglePause();
    return;
  }

  const requestedDirection = directionByKey[event.code];
  if (!requestedDirection) return;
  event.preventDefault();
  if (!running || paused) return;

  if (
    requestedDirection.x !== -direction.x ||
    requestedDirection.y !== -direction.y
  ) {
    nextDirection = requestedDirection;
  }
});

snake = [
  { x: Math.floor(CELLS / 2), y: Math.floor(CELLS / 2) },
  { x: Math.floor(CELLS / 2) - 1, y: Math.floor(CELLS / 2) },
  { x: Math.floor(CELLS / 2) - 2, y: Math.floor(CELLS / 2) },
  { x: Math.floor(CELLS / 2) - 3, y: Math.floor(CELLS / 2) }
];
direction = { x: 1, y: 0 };
nextDirection = { x: 1, y: 0 };
food = placeFood();
timerElement.textContent = '∞';
draw();
