const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('best-score');
const messageElement = document.getElementById('message');
const startButton = document.getElementById('start-button');

const CELL_SIZE = 24;
const CELLS = canvas.width / CELL_SIZE;
let snake;
let food;
let direction;
let nextDirection;
let score = 0;
let bestScore = Number(localStorage.getItem('snake-best-score')) || 0;
let running = false;
let paused = false;
let timer = null;

bestScoreElement.textContent = bestScore;

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
    drawCell(food.x, food.y, '#f38ba8', 3);
    ctx.fillStyle = '#f9e2af';
    ctx.beginPath();
    ctx.arc(food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (snake) {
    snake.forEach((segment, index) => {
      drawCell(segment.x, segment.y, index === 0 ? '#a6e3a1' : '#40a878');
    });
  }
}

function tick() {
  if (!running || paused) return;
  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };
  const eating = head.x === food.x && head.y === food.y;
  const bodyToCheck = eating ? snake : snake.slice(0, -1);

  if (
    head.x < 0 || head.x >= CELLS ||
    head.y < 0 || head.y >= CELLS ||
    bodyToCheck.some(segment => segment.x === head.x && segment.y === head.y)
  ) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (eating) {
    score += 10;
    scoreElement.textContent = score;
    food = placeFood();
    if (!food) {
      endGame('太厲害了！你填滿了整個棋盤！');
      return;
    }
  } else {
    snake.pop();
  }

  draw();
}

function startGame() {
  clearInterval(timer);
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
  running = true;
  paused = false;
  scoreElement.textContent = score;
  messageElement.textContent = '';
  startButton.textContent = '重新開始';
  food = placeFood();
  draw();
  timer = setInterval(tick, Math.max(65, 135 - Math.floor(score / 50) * 5));
}

function endGame(message) {
  running = false;
  paused = false;
  clearInterval(timer);
  if (score > bestScore) {
    bestScore = score;
    bestScoreElement.textContent = bestScore;
    localStorage.setItem('snake-best-score', String(bestScore));
  }
  messageElement.textContent = message || `遊戲結束！本次得分：${score}`;
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
    timer = setInterval(tick, Math.max(65, 135 - Math.floor(score / 50) * 5));
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
draw();
