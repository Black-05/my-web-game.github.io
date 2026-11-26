const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const bestScoreElement = document.getElementById('best-score');
const messageElement = document.getElementById('message');
const startButton = document.getElementById('start-button');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const stars = Array.from({ length: 70 }, () => ({
  x: Math.random() * WIDTH,
  y: Math.random() * HEIGHT,
  size: Math.random() * 2 + 0.5,
  speed: Math.random() * 35 + 15
}));

let player;
let bullets;
let enemies;
let score = 0;
let lives = 3;
let running = false;
let paused = false;
let spawnTimer = 0;
let shotTimer = 0;
let previousTime = 0;
let animationFrame = 0;
let bestScore = Number(localStorage.getItem('shooter-best-score')) || 0;

bestScoreElement.textContent = bestScore;

function resetGame() {
  player = { x: WIDTH / 2, y: HEIGHT - 52, width: 34, height: 36, speed: 300 };
  bullets = [];
  enemies = [];
  score = 0;
  lives = 3;
  spawnTimer = 0;
  shotTimer = 0;
  paused = false;
  scoreElement.textContent = score;
  livesElement.textContent = lives;
  messageElement.textContent = '';
  startButton.textContent = '重新開始';
  running = true;
  previousTime = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
  const size = 22 + Math.random() * 12;
  enemies.push({
    x: size + Math.random() * (WIDTH - size * 2),
    y: -size,
    size,
    speed: 90 + Math.random() * 45 + Math.min(score, 500) * 0.12,
    drift: (Math.random() - 0.5) * 70
  });
}

function overlaps(rect, circle) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.size * circle.size;
}

function update(delta) {
  const direction = Number(keys.has('ArrowRight') || keys.has('KeyD')) -
    Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  player.x = Math.max(player.width / 2, Math.min(WIDTH - player.width / 2, player.x + direction * player.speed * delta));

  shotTimer += delta;
  if (keys.has('Space') && shotTimer >= 0.18) {
    bullets.push({ x: player.x, y: player.y - 20, speed: 440 });
    shotTimer = 0;
  }

  for (const star of stars) {
    star.y += star.speed * delta;
    if (star.y > HEIGHT) {
      star.y = 0;
      star.x = Math.random() * WIDTH;
    }
  }

  spawnTimer += delta;
  const spawnInterval = Math.max(0.32, 0.85 - score / 1400);
  if (spawnTimer >= spawnInterval) {
    spawnEnemy();
    spawnTimer = 0;
  }

  for (const bullet of bullets) bullet.y -= bullet.speed * delta;
  bullets = bullets.filter(bullet => bullet.y > -10);

  for (const enemy of enemies) {
    enemy.y += enemy.speed * delta;
    enemy.x += enemy.drift * delta;
    if (enemy.x < enemy.size || enemy.x > WIDTH - enemy.size) enemy.drift *= -1;
  }

  for (const enemy of enemies) {
    for (const bullet of bullets) {
      const dx = enemy.x - bullet.x;
      const dy = enemy.y - bullet.y;
      if (dx * dx + dy * dy < enemy.size * enemy.size) {
        enemy.destroyed = true;
        bullet.destroyed = true;
        score += 10;
        scoreElement.textContent = score;
        break;
      }
    }

    if (!enemy.destroyed && overlaps({
      x: player.x - player.width / 2,
      y: player.y - player.height / 2,
      width: player.width,
      height: player.height
    }, enemy)) {
      enemy.destroyed = true;
      lives -= 1;
      livesElement.textContent = lives;
      if (lives <= 0) {
        endGame();
        return;
      }
    }

    if (!enemy.destroyed && enemy.y - enemy.size > HEIGHT) {
      enemy.destroyed = true;
      lives -= 1;
      livesElement.textContent = lives;
      if (lives <= 0) {
        endGame();
        return;
      }
    }
  }

  bullets = bullets.filter(bullet => !bullet.destroyed);
  enemies = enemies.filter(enemy => !enemy.destroyed);
}

function draw() {
  ctx.fillStyle = '#090b18';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#cdd6f4';
  for (const star of stars) {
    ctx.globalAlpha = 0.35 + star.size * 0.2;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  for (const bullet of bullets) {
    ctx.fillStyle = '#89dceb';
    ctx.fillRect(bullet.x - 2, bullet.y - 9, 4, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bullet.x - 1, bullet.y - 8, 2, 8);
  }

  for (const enemy of enemies) {
    ctx.fillStyle = '#f38ba8';
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y + enemy.size);
    ctx.lineTo(enemy.x - enemy.size, enemy.y - enemy.size * 0.6);
    ctx.lineTo(enemy.x - enemy.size * 0.45, enemy.y - enemy.size);
    ctx.lineTo(enemy.x + enemy.size * 0.45, enemy.y - enemy.size);
    ctx.lineTo(enemy.x + enemy.size, enemy.y - enemy.size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f9e2af';
    ctx.fillRect(enemy.x - 3, enemy.y - 4, 6, 6);
  }

  if (player) {
    ctx.fillStyle = '#89b4fa';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2);
    ctx.lineTo(player.x - 7, player.y + player.height / 2 - 5);
    ctx.lineTo(player.x, player.y + 2);
    ctx.lineTo(player.x + 7, player.y + player.height / 2 - 5);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f9e2af';
    ctx.fillRect(player.x - 3, player.y + player.height / 2 - 2, 6, 7);
  }
}

function gameLoop(time) {
  if (!running || paused) return;
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  update(delta);
  draw();
  if (running) animationFrame = requestAnimationFrame(gameLoop);
}

function endGame() {
  running = false;
  paused = false;
  cancelAnimationFrame(animationFrame);
  if (score > bestScore) {
    bestScore = score;
    bestScoreElement.textContent = bestScore;
    localStorage.setItem('shooter-best-score', String(bestScore));
  }
  messageElement.textContent = `任務結束！本次得分：${score}`;
  startButton.textContent = '再玩一次';
  draw();
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    cancelAnimationFrame(animationFrame);
    messageElement.textContent = '已暫停，按 P 繼續';
    draw();
  } else {
    messageElement.textContent = '';
    previousTime = performance.now();
    animationFrame = requestAnimationFrame(gameLoop);
  }
}

startButton.addEventListener('click', resetGame);
document.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (event.code === 'KeyP') togglePause();
});
document.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

player = { x: WIDTH / 2, y: HEIGHT - 52, width: 34, height: 36, speed: 300 };
bullets = [];
enemies = [];
draw();
