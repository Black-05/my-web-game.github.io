    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 26;

    // 7種標準方塊（採用標準方陣，確保向右90度四方向旋轉中心精準穩定）
    const SHAPES = [
      [],
      // 1: I (青色 - 4x4 矩陣)
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ],
      // 2: J (藍色 - 3x3 矩陣)
      [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0]
      ],
      // 3: L (橘色 - 3x3 矩陣)
      [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0]
      ],
      // 4: O (黃色 - 2x2 矩陣)
      [
        [4, 4],
        [4, 4]
      ],
      // 5: S (綠色 - 3x3 矩陣)
      [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0]
      ],
      // 6: T (紫色 - 3x3 矩陣)
      [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0]
      ],
      // 7: Z (紅色 - 3x3 矩陣)
      [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
      ]
    ];

    const COLORS = [
      null,
      '#00f0f0', // 1: I - 青色
      '#3b82f6', // 2: J - 藍色
      '#f97316', // 3: L - 橘色
      '#eab308', // 4: O - 黃色
      '#22c55e', // 5: S - 綠色
      '#a855f7', // 6: T - 紫色
      '#ef4444', // 7: Z - 紅色
      '#6c7086'  // 8: 干擾垃圾行 - 灰色
    ];

    const DIR_LABELS = ['0° (上)', '90° (右)', '180° (下)', '270° (左)'];

    // 順時針向右旋轉 90 度（矩陣轉置後每列反轉）
    function rotateRight90(matrix) {
      const N = matrix.length;
      const result = Array.from({ length: N }, () => Array(N).fill(0));
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          result[x][N - 1 - y] = matrix[y][x];
        }
      }
      return result;
    }

    function cloneMatrix(matrix) {
      return matrix.map(row => [...row]);
    }

    function randomPiece() {
      const id = Math.floor(Math.random() * 7) + 1;
      return cloneMatrix(SHAPES[id]);
    }

    // 遊戲實例類別（同時用於玩家與電腦對手）
    class TetrisInstance {
      constructor(isAI, boardCanvasId, nextCanvasId, prefix) {
        this.isAI = isAI;
        this.canvas = document.getElementById(boardCanvasId);
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById(nextCanvasId);
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.prefix = prefix;

        this.board = this.createBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.dropCounter = 0;
        this.timeSpeedCounter = 0;
        this.isOver = false;
        this.opponent = null;

        this.piece = {
          pos: { x: 0, y: 0 },
          matrix: null,
          rotationIndex: 0 // 0, 1, 2, 3 代表四個方向
        };
        this.nextMatrix = null;

        // AI 專用狀態
        this.aiTargetX = 0;
        this.aiTargetRot = 0;
        this.aiActionTimer = 0;
        this.aiMoveDelay = 140;
      }

      createBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      }

      reset() {
        this.board = this.createBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.dropCounter = 0;
        this.timeSpeedCounter = 0;
        this.isOver = false;
        this.nextMatrix = randomPiece();
        this.setAlert('');
        this.spawnPiece();
        this.updateUI();
        this.draw();
      }

      setAlert(msg) {
        const el = document.getElementById(`${this.prefix}-alert`);
        if (el) el.textContent = msg;
      }

      spawnPiece() {
        this.piece.matrix = this.nextMatrix || randomPiece();
        this.nextMatrix = randomPiece();
        this.piece.rotationIndex = 0;
        this.piece.pos.y = 0;
        this.piece.pos.x = Math.floor(COLS / 2) - Math.floor(this.piece.matrix.length / 2);
        this.drawNext();
        this.updateDirectionUI();

        if (this.collide(this.board, this.piece.matrix, this.piece.pos)) {
          if (currentMode === 'blitz' && blitzTimeLeft > 0) {
            // 限時競速模式：堆滿時清空棋盤並扣 300 分繼續比賽
            this.board = this.createBoard();
            this.score = Math.max(0, this.score - 300);
            this.setAlert('觸頂重置！-300分');
            setTimeout(() => this.setAlert(''), 2000);
            this.updateUI();
          } else {
            this.isOver = true;
            checkMatchEnd();
          }
          return;
        }

        if (this.isAI) {
          this.computeBestAIMove();
        }
      }

      collide(board, matrix, pos) {
        for (let y = 0; y < matrix.length; y++) {
          for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x] !== 0) {
              const boardY = y + pos.y;
              const boardX = x + pos.x;
              if (
                boardX < 0 ||
                boardX >= COLS ||
                boardY >= ROWS ||
                (boardY >= 0 && board[boardY][boardX] !== 0)
              ) {
                return true;
              }
            }
          }
        }
        return false;
      }

      // 統一向右順時針旋轉 90 度（四方向循環）
      rotateClockwise() {
        if (this.isOver) return;
        const originalMatrix = this.piece.matrix;
        const originalX = this.piece.pos.x;
        const rotated = rotateRight90(this.piece.matrix);

        // 牆壁踢回測試偏移量 (Wall Kick)
        const kicks = [0, -1, 1, -2, 2];
        for (let offset of kicks) {
          const testPos = { x: originalX + offset, y: this.piece.pos.y };
          if (!this.collide(this.board, rotated, testPos)) {
            this.piece.matrix = rotated;
            this.piece.pos.x = testPos.x;
            this.piece.rotationIndex = (this.piece.rotationIndex + 1) % 4;
            this.updateDirectionUI();
            return;
          }
        }
        // 若完全卡死則維持原狀
        this.piece.matrix = originalMatrix;
        this.piece.pos.x = originalX;
      }

      move(dir) {
        if (this.isOver) return;
        const testPos = { x: this.piece.pos.x + dir, y: this.piece.pos.y };
        if (!this.collide(this.board, this.piece.matrix, testPos)) {
          this.piece.pos.x += dir;
        }
      }

      drop() {
        if (this.isOver) return;
        const testPos = { x: this.piece.pos.x, y: this.piece.pos.y + 1 };
        if (!this.collide(this.board, this.piece.matrix, testPos)) {
          this.piece.pos.y++;
        } else {
          this.merge();
          this.sweep();
          if (!this.isAI && currentMode === 'sprint' && this.lines >= 40) {
            finishSprintMatch();
            this.dropCounter = 0;
            return;
          }
          this.spawnPiece();
        }
        this.dropCounter = 0;
      }

      hardDrop() {
        if (this.isOver) return;
        while (!this.collide(this.board, this.piece.matrix, { x: this.piece.pos.x, y: this.piece.pos.y + 1 })) {
          this.piece.pos.y++;
          this.score += 2;
        }
        this.merge();
        this.sweep();
        if (!this.isAI && currentMode === 'sprint' && this.lines >= 40) {
          finishSprintMatch();
          this.dropCounter = 0;
          return;
        }
        this.updateUI();
        this.spawnPiece();
        this.dropCounter = 0;
      }

      merge() {
        this.piece.matrix.forEach((row, y) => {
          row.forEach((val, x) => {
            if (val !== 0 && y + this.piece.pos.y >= 0) {
              this.board[y + this.piece.pos.y][x + this.piece.pos.x] = val;
            }
          });
        });
      }

      sweep() {
        let cleared = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
          if (this.board[y].every(cell => cell !== 0)) {
            const emptyRow = this.board.splice(y, 1)[0].fill(0);
            this.board.unshift(emptyRow);
            y++;
            cleared++;
          }
        }

        if (cleared > 0) {
          const points = [0, 100, 300, 500, 800];
          this.score += points[cleared] * this.level;
          this.lines += cleared;
          if (!this.isAI) ArcadeFeatures.playSound('clear');

          // 每消除 4 行升一級，加快下落速度
          const newLevel = Math.floor(this.lines / 4) + 1;
          if (newLevel > this.level) {
            this.level = newLevel;
            this.updateSpeed();
          }

          // 對決模式：一次消除 2 行以上，向對手底部送出干擾行
          if (currentMode === 'battle' && this.opponent && !this.opponent.isOver && cleared >= 2) {
            const garbageCount = cleared === 4 ? 3 : cleared - 1;
            this.opponent.receiveGarbage(garbageCount);
            this.setAlert(`送出 ${garbageCount} 行攻擊！`);
            setTimeout(() => this.setAlert(''), 1800);
          }

          this.updateUI();
        }
      }

      // 接收對手的干擾垃圾行（底部推入灰色方塊，隨機留 1 格缺口）
      receiveGarbage(count) {
        if (this.isOver) return;
        const hole = Math.floor(Math.random() * COLS);
        for (let i = 0; i < count; i++) {
          this.board.shift();
          const garbageRow = Array(COLS).fill(8);
          garbageRow[hole] = 0;
          this.board.push(garbageRow);
        }
        // 避免目前方塊被頂入方塊重疊
        while (this.collide(this.board, this.piece.matrix, this.piece.pos) && this.piece.pos.y > 0) {
          this.piece.pos.y--;
        }
        this.setAlert(`受到 ${count} 行干擾！`);
        setTimeout(() => this.setAlert(''), 1800);
      }

      updateSpeed() {
        this.dropInterval = Math.max(110, 1000 - (this.level - 1) * 95);
      }

      updateDirectionUI() {
        if (!this.isAI) {
          const dirEl = document.getElementById('player-dir');
          if (dirEl) dirEl.textContent = DIR_LABELS[this.piece.rotationIndex];
        }
      }

      updateUI() {
        document.getElementById(`${this.prefix}-score`).textContent = this.score;
        document.getElementById(`${this.prefix}-lines`).textContent = this.lines;
        document.getElementById(`${this.prefix}-level`).textContent = this.level;
      }

      // ================= 電腦 AI 決策演算法 =================
      computeBestAIMove() {
        let bestScore = -Infinity;
        let bestX = this.piece.pos.x;
        let bestRot = 0;

        let testMatrix = cloneMatrix(this.piece.matrix);

        // 測試 4 個向右旋轉方向 (0, 1, 2, 3)
        for (let rot = 0; rot < 4; rot++) {
          for (let x = -2; x < COLS + 1; x++) {
            let y = 0;
            if (this.collide(this.board, testMatrix, { x, y })) continue;

            // 模擬落到底部
            while (!this.collide(this.board, testMatrix, { x, y: y + 1 })) {
              y++;
            }

            const evalScore = this.evaluateBoard(this.board, testMatrix, x, y);
            if (evalScore > bestScore) {
              bestScore = evalScore;
              bestX = x;
              bestRot = rot;
            }
          }
          testMatrix = rotateRight90(testMatrix);
        }

        this.aiTargetX = bestX;
        this.aiTargetRot = bestRot;
      }

      evaluateBoard(baseBoard, matrix, offsetX, offsetY) {
        const simBoard = baseBoard.map(r => [...r]);
        for (let y = 0; y < matrix.length; y++) {
          for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x] !== 0 && y + offsetY >= 0) {
              simBoard[y + offsetY][x + offsetX] = matrix[y][x];
            }
          }
        }

        let completeLines = 0;
        for (let y = 0; y < ROWS; y++) {
          if (simBoard[y].every(c => c !== 0)) completeLines++;
        }

        let heights = Array(COLS).fill(0);
        let holes = 0;
        for (let x = 0; x < COLS; x++) {
          let blockFound = false;
          for (let y = 0; y < ROWS; y++) {
            if (simBoard[y][x] !== 0) {
              if (!blockFound) {
                heights[x] = ROWS - y;
                blockFound = true;
              }
            } else if (blockFound) {
              holes++;
            }
          }
        }

        const aggregateHeight = heights.reduce((a, b) => a + b, 0);
        let bumpiness = 0;
        for (let x = 0; x < COLS - 1; x++) {
          bumpiness += Math.abs(heights[x] - heights[x + 1]);
        }

        // 經典 AI 權重評分公式
        return (
          completeLines * 0.85 -
          aggregateHeight * 0.51 -
          holes * 0.45 -
          bumpiness * 0.18
        );
      }

      stepAI(deltaTime) {
        if (!this.isAI || this.isOver) return;
        this.aiActionTimer += deltaTime;
        if (this.aiActionTimer < this.aiMoveDelay) return;
        this.aiActionTimer = 0;

        // 1. 先調整到目標旋轉方向（向右90度）
        if (this.piece.rotationIndex !== this.aiTargetRot) {
          this.rotateClockwise();
          return;
        }
        // 2. 再水平移動到目標 X 座標
        if (this.piece.pos.x < this.aiTargetX) {
          this.move(1);
          return;
        } else if (this.piece.pos.x > this.aiTargetX) {
          this.move(-1);
          return;
        }
        // 3. 對準位置後加速落底
        this.hardDrop();
      }

      // ================= 畫面繪製 =================
      drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
        ctx.fillStyle = color;
        ctx.fillRect(x * size, y * size, size, size);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);

        ctx.strokeStyle = '#11111b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * size, y * size, size, size);
      }

      drawMatrix(ctx, matrix, offset, size = BLOCK_SIZE) {
        matrix.forEach((row, y) => {
          row.forEach((val, x) => {
            if (val !== 0 && y + offset.y >= 0) {
              this.drawBlock(ctx, x + offset.x, y + offset.y, COLORS[val], size);
            }
          });
        });
      }

      drawNext() {
        this.nextCtx.fillStyle = '#181825';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        if (!this.nextMatrix) return;

        // 計算實際非空邊界以置中預覽
        let minX = 4, maxX = 0, minY = 4, maxY = 0;
        this.nextMatrix.forEach((row, y) => {
          row.forEach((val, x) => {
            if (val !== 0) {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          });
        });

        const size = 20;
        const pieceW = maxX - minX + 1;
        const pieceH = maxY - minY + 1;
        const offsetX = (this.nextCanvas.width / size - pieceW) / 2 - minX;
        const offsetY = (this.nextCanvas.height / size - pieceH) / 2 - minY;
        this.drawMatrix(this.nextCtx, this.nextMatrix, { x: offsetX, y: offsetY }, size);
      }

      drawOverlay(title, subtitle, color) {
        this.ctx.fillStyle = 'rgba(17, 17, 27, 0.85)';
        this.ctx.fillRect(0, this.canvas.height / 2 - 48, this.canvas.width, 96);
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 26px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(title, this.canvas.width / 2, this.canvas.height / 2 - 6);
        this.ctx.fillStyle = '#cdd6f4';
        this.ctx.font = '15px sans-serif';
        this.ctx.fillText(subtitle, this.canvas.width / 2, this.canvas.height / 2 + 24);
      }

      draw() {
        this.ctx.fillStyle = '#11111b';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#1e1e2e';
        this.ctx.lineWidth = 1;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            this.ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
          }
        }

        this.drawMatrix(this.ctx, this.board, { x: 0, y: 0 });
        if (this.piece.matrix && !this.isOver) {
          this.drawMatrix(this.ctx, this.piece.matrix, this.piece.pos);
        }
      }
    }

    // ================= 全局遊戲控制 =================
    const human = new TetrisInstance(false, 'player-board', 'player-next', 'player');
    const cpu = new TetrisInstance(true, 'ai-board', 'ai-next', 'ai');
    human.opponent = cpu;
    cpu.opponent = human;

    let currentMode = 'battle';
    let isMatchRunning = false;
    let lastTime = 0;
    let animationId = null;
    let blitzTimeLeft = 120;
    let blitzAccumulator = 0;
    let sprintAccumulator = 0;
    let matchRecorded = false;

    const modeNames = {
      battle: '電腦對決',
      solo: '單人經典',
      blitz: '限時競速',
      sprint: '40 行衝刺'
    };

    function refreshLeaderboard() {
      const selectedMode = document.getElementById('game-mode').value;
      document.getElementById('leaderboard-mode').textContent = `・${modeNames[selectedMode]}`;
      ArcadeFeatures.renderLeaderboard(
        document.getElementById('leaderboard-list'),
        ArcadeFeatures.getScores('tetris', selectedMode)
      );
    }

    function recordMatchScore(score) {
      if (matchRecorded) return;
      matchRecorded = true;
      ArcadeFeatures.renderLeaderboard(
        document.getElementById('leaderboard-list'),
        ArcadeFeatures.recordScore('tetris', currentMode, score)
      );
    }

    function onModeChange() {
      currentMode = document.getElementById('game-mode').value;
      const aiContainer = document.getElementById('ai-container');
      const diffSelect = document.getElementById('ai-difficulty');
      const diffLabel = document.getElementById('diff-label');
      const timerBadge = document.getElementById('blitz-timer');

      const soloMode = currentMode === 'solo' || currentMode === 'sprint';
      if (soloMode) {
        aiContainer.style.display = 'none';
        diffSelect.style.display = 'none';
        diffLabel.style.display = 'none';
      } else {
        aiContainer.style.display = 'flex';
        diffSelect.style.display = 'inline-block';
        diffLabel.style.display = 'inline-block';
      }
      timerBadge.style.display = currentMode === 'blitz' || currentMode === 'sprint' ? 'inline-block' : 'none';
      timerBadge.textContent = currentMode === 'sprint' ? '用時：0s' : '剩餘時間：120s';
      refreshLeaderboard();
    }

    function checkMatchEnd() {
      if ((currentMode === 'solo' || currentMode === 'sprint') && human.isOver) {
        isMatchRunning = false;
        document.getElementById('game-mode').disabled = false;
        recordMatchScore(human.score);
        human.draw();
        const title = currentMode === 'sprint' ? 'SPRINT OVER' : 'GAME OVER';
        const subtitle = currentMode === 'sprint'
          ? `完成 ${human.lines}/40 行・得分：${human.score}`
          : `最終得分：${human.score}`;
        human.drawOverlay(title, subtitle, '#f38ba8');
        document.getElementById('start-btn').textContent = '重新開始';
      } else if (currentMode === 'battle' && (human.isOver || cpu.isOver)) {
        isMatchRunning = false;
        document.getElementById('game-mode').disabled = false;
        recordMatchScore(human.score);
        human.draw();
        cpu.draw();
        if (human.isOver) {
          human.drawOverlay('YOU LOSE', '電腦獲勝！', '#f38ba8');
          cpu.drawOverlay('WINNER!', '電腦勝利', '#a6e3a1');
        } else {
          human.drawOverlay('YOU WIN!', '擊敗電腦對手！', '#a6e3a1');
          cpu.drawOverlay('K.O.', '電腦堆滿失敗', '#f38ba8');
        }
        document.getElementById('start-btn').textContent = '再戰一場';
      }
    }

    function finishBlitzMatch() {
      isMatchRunning = false;
      document.getElementById('game-mode').disabled = false;
      recordMatchScore(human.score);
      human.isOver = true;
      cpu.isOver = true;
      human.draw();
      cpu.draw();

      if (human.score > cpu.score) {
        human.drawOverlay('TIME UP - 獲勝！', `${human.score} vs ${cpu.score}`, '#a6e3a1');
        cpu.drawOverlay('惜敗', `${cpu.score} 分`, '#f38ba8');
      } else if (human.score < cpu.score) {
        human.drawOverlay('TIME UP - 落敗', `${human.score} vs ${cpu.score}`, '#f38ba8');
        cpu.drawOverlay('獲勝！', `${cpu.score} 分`, '#a6e3a1');
      } else {
        human.drawOverlay('平手 DRAW', `${human.score} 分`, '#f9e2af');
        cpu.drawOverlay('平手 DRAW', `${cpu.score} 分`, '#f9e2af');
      }
      document.getElementById('start-btn').textContent = '重新挑戰';
    }

    function finishSprintMatch() {
      isMatchRunning = false;
      document.getElementById('game-mode').disabled = false;
      human.isOver = true;
      recordMatchScore(human.score);
      human.draw();
      human.drawOverlay('40 LINES!', `完成時間：${Math.floor(sprintAccumulator / 1000)}s`, '#a6e3a1');
      document.getElementById('start-btn').textContent = '再衝一次';
    }

    function gameLoop(time = 0) {
      if (!isMatchRunning) return;

      const deltaTime = time - lastTime;
      lastTime = time;

      // 限時競速倒數計時
      if (currentMode === 'blitz') {
        blitzAccumulator += deltaTime;
        if (blitzAccumulator >= 1000) {
          blitzTimeLeft--;
          blitzAccumulator -= 1000;
          document.getElementById('blitz-timer').textContent = `剩餘時間：${blitzTimeLeft}s`;
          if (blitzTimeLeft <= 0) {
            finishBlitzMatch();
            return;
          }
        }
      }

      if (currentMode === 'sprint') {
        sprintAccumulator += deltaTime;
        document.getElementById('blitz-timer').textContent =
          `用時：${Math.floor(sprintAccumulator / 1000)}s`;
      }

      // 更新玩家
      if (!human.isOver) {
        human.dropCounter += deltaTime;
        human.timeSpeedCounter += deltaTime;
        if (human.timeSpeedCounter > 18000) {
          human.dropInterval = Math.max(110, human.dropInterval - 35);
          human.timeSpeedCounter = 0;
        }
        if (human.dropCounter > human.dropInterval) {
          human.drop();
        }
        human.draw();
      }

      // 更新電腦 AI（非單人模式時）
      if ((currentMode === 'battle' || currentMode === 'blitz') && !cpu.isOver) {
        cpu.dropCounter += deltaTime;
        cpu.timeSpeedCounter += deltaTime;
        if (cpu.timeSpeedCounter > 18000) {
          cpu.dropInterval = Math.max(110, cpu.dropInterval - 35);
          cpu.timeSpeedCounter = 0;
        }
        cpu.stepAI(deltaTime);
        if (cpu.dropCounter > cpu.dropInterval) {
          cpu.drop();
        }
        cpu.draw();
      }

      if (isMatchRunning) animationId = requestAnimationFrame(gameLoop);
    }

    function startGame() {
      if (animationId) cancelAnimationFrame(animationId);

      onModeChange();
      document.getElementById('game-mode').disabled = true;

      // 設定 AI 反應速度
      const diff = document.getElementById('ai-difficulty').value;
      if (diff === 'easy') cpu.aiMoveDelay = 280;
      else if (diff === 'normal') cpu.aiMoveDelay = 140;
      else cpu.aiMoveDelay = 65;

      blitzTimeLeft = 120;
      blitzAccumulator = 0;
      sprintAccumulator = 0;
      matchRecorded = false;
      document.getElementById('blitz-timer').textContent =
        currentMode === 'sprint' ? '用時：0s' : '剩餘時間：120s';

      human.reset();
      if (currentMode === 'battle' || currentMode === 'blitz') {
        cpu.reset();
      }

      isMatchRunning = true;
      lastTime = performance.now();
      document.getElementById('start-btn').textContent = '重新開始';
      gameLoop(lastTime);
    }

    // 鍵盤操作監聽
    document.addEventListener('keydown', e => {
      if (!isMatchRunning || human.isOver) return;

      if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'ArrowLeft') {
        human.move(-1);
      } else if (e.code === 'ArrowRight') {
        human.move(1);
      } else if (e.code === 'ArrowDown') {
        human.drop();
        human.score += 1;
        human.updateUI();
      } else if (e.code === 'ArrowUp') {
        human.rotateClockwise(); // 向右順時針旋轉 90 度
      } else if (e.code === 'Space') {
        human.hardDrop();
      }
      human.draw();
    });

    // 初始畫面繪製
    human.draw();
    cpu.draw();

    document.getElementById('game-mode').addEventListener('change', onModeChange);
    document.getElementById('start-btn').addEventListener('click', startGame);

    ArcadeFeatures.bindSkin(document.getElementById('skin-select'), skin => {
      skin.blocks.forEach((color, index) => {
        if (index > 0) COLORS[index] = color;
      });
      human.draw();
      cpu.draw();
    });
    ArcadeFeatures.bindSoundToggle(document.getElementById('sound-toggle'));
    onModeChange();