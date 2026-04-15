// ============================================================
//  Dungeon Master — game.js
//  Fetches maze JSON from Node.js server, renders on canvas,
//  handles player movement + star rating system.
// ============================================================

const cv      = document.getElementById('cv');
const ctx     = cv.getContext('2d');
const msgBox  = document.getElementById('dm-msg-box');
const sMv     = document.getElementById('s-mv');
const sOpt    = document.getElementById('s-opt');
const sRat    = document.getElementById('s-rat');
const sTm     = document.getElementById('s-tm');
const dmStars = document.getElementById('dm-stars');
const dmLbl   = document.getElementById('dm-rating-label');
const dmBreak = document.getElementById('dm-rating-breakdown');
const winPanel= document.getElementById('dm-win-panel');
const loading = document.getElementById('dm-loading');

// ── Game state ────────────────────────────────────────────────
let maze      = null;
let player    = { r: 0, c: 0 };
let visited   = new Set();
let moves     = 0;
let startTime = null;
let timerInt  = null;
let gameWon   = false;
let solveAnim = null;
let showPath  = false;
let hintCell  = null;
let CELL      = 32;

// ── Star Rating ───────────────────────────────────────────────
// 3 stars : moves <= optimal * 1.15
// 2 stars : moves <= optimal * 1.70
// 1 star  : finished but used too many moves
function calcRating(userMoves, optimal) {
  const ratio = userMoves / optimal;
  if (ratio <= 1.15) return { stars: 3, label: 'PERFECT! Optimal path!',    remark: `${userMoves} moves vs optimal ${optimal} — flawless navigation!` };
  if (ratio <= 1.70) return { stars: 2, label: 'GOOD! Near optimal.',        remark: `${userMoves} moves vs optimal ${optimal} — minor backtracking, solid run!` };
  return             { stars: 1, label: 'COMPLETE! Try fewer moves.',        remark: `${userMoves} moves vs optimal ${optimal} — lots of exploring. Try again!` };
}

function starsHTML(n) {
  const c3 = '#FFD700', c2 = '#FFD700', c1 = '#ff8833', off = '#1a4480';
  const cols = [0, c1, c2, c3];
  let s = '';
  for (let i = 1; i <= 3; i++)
    s += `<span style="color:${i <= n ? cols[n] : off}">${i <= n ? '★' : '☆'}</span>`;
  return s;
}

// ── Fetch maze from Node.js server ───────────────────────────
async function newMaze() {
  clearInterval(timerInt);
  clearTimeout(solveAnim);
  gameWon = false; showPath = false; hintCell = null;
  visited = new Set(); moves = 0;
  sMv.textContent = '0'; sTm.textContent = '0s';
  sOpt.textContent = '-'; sRat.textContent = '-';
  startTime = null;
  dmStars.innerHTML = '☆☆☆';
  dmLbl.textContent = 'Complete the maze!';
  dmBreak.textContent = '';
  winPanel.className = '';
  winPanel.innerHTML = '';
  msgBox.textContent = 'Generating maze...';
  loading.classList.add('show');

  const N = parseInt(document.getElementById('sz').value);

  try {
    const res  = await fetch(`/api/maze?size=${N}`);
    const data = await res.json();
    maze = data;

    // Fit canvas to screen
    const maxPx = Math.min(window.innerWidth * 0.58, 540);
    CELL = Math.max(8, Math.floor(maxPx / data.G));
    cv.width  = data.G * CELL;
    cv.height = data.G * CELL;

    player = { r: data.startR, c: data.startC };
    visited.add(key(player.r, player.c));
    sOpt.textContent = data.bfsSol.steps;

    loading.classList.remove('show');
    draw();
    msgBox.textContent = `Ready! Reach EXIT. Optimal = ${data.bfsSol.steps} moves.`;
  } catch (err) {
    loading.classList.remove('show');
    msgBox.textContent = 'ERROR: Make sure server.js is running! (npm start)';
    console.error(err);
  }
}

const key = (r, c) => `${r},${c}`;

// ── Canvas draw ───────────────────────────────────────────────
function draw() {
  if (!maze) return;
  const { grid, G, startR, startC, exitR, exitC, bfsSol } = maze;

  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#000820';
  ctx.fillRect(0, 0, cv.width, cv.height);

  for (let r = 0; r < G; r++) {
    for (let c = 0; c < G; c++) {
      const x = c * CELL, y = r * CELL;

      if (grid[r][c] === 1) {
        // Wall
        ctx.fillStyle = '#0d2a80';
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeStyle = '#1a6fff';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      } else {
        // Floor
        ctx.fillStyle = '#000820';
        ctx.fillRect(x, y, CELL, CELL);

        if (visited.has(key(r, c))) {
          ctx.fillStyle = '#ff6b9d12';
          ctx.fillRect(x, y, CELL, CELL);
        }
        if (showPath && bfsSol.path.some(([pr, pc]) => pr === r && pc === c)) {
          ctx.fillStyle = '#00ffff1c';
          ctx.fillRect(x, y, CELL, CELL);
        }
        if (hintCell && hintCell[0] === r && hintCell[1] === c) {
          ctx.fillStyle = '#ffff0035';
          ctx.fillRect(x, y, CELL, CELL);
        }
      }
    }
  }

  // Pac-Man dots on unvisited path cells
  for (let r = 1; r < G - 1; r += 2) {
    for (let c = 1; c < G - 1; c += 2) {
      if (!visited.has(key(r, c)) && !(r === startR && c === startC) && !(r === exitR && c === exitC)) {
        ctx.beginPath();
        ctx.arc(c * CELL + CELL / 2, r * CELL + CELL / 2, CELL * 0.07, 0, Math.PI * 2);
        ctx.fillStyle = '#1a3a6a';
        ctx.fill();
      }
    }
  }

  drawMarker(startC, startR, '#00ff88', 'S');
  drawMarker(exitC,  exitR,  '#ff3355', 'E');

  // Player (Pac-Man)
  if (!gameWon) {
    const px = player.c * CELL + CELL / 2;
    const py = player.r * CELL + CELL / 2;
    const pr = CELL * 0.38;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, pr, 0.28 * Math.PI, 1.72 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    // Eye
    ctx.beginPath();
    ctx.arc(px + pr * 0.28, py - pr * 0.33, pr * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#000820';
    ctx.fill();
  }
}

function drawMarker(col, row, color, label) {
  const x = col * CELL, y = row * CELL;
  ctx.fillStyle  = color + '28';
  ctx.fillRect(x, y, CELL, CELL);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.strokeRect(x + 1, y + 1, CELL - 2, CELL - 2);
  if (CELL >= 14) {
    ctx.fillStyle      = color;
    ctx.font           = `bold ${Math.max(8, CELL * 0.38)}px monospace`;
    ctx.textAlign      = 'center';
    ctx.textBaseline   = 'middle';
    ctx.fillText(label, x + CELL / 2, y + CELL / 2);
  }
}

// ── Player movement ───────────────────────────────────────────
function tryMove(dr, dc) {
  if (!maze || gameWon) return;
  const { grid, G, exitR, exitC } = maze;
  const nr = player.r + dr;
  const nc = player.c + dc;
  const wr = player.r + Math.round(dr / 2);
  const wc = player.c + Math.round(dc / 2);

  if (nr >= 0 && nr < G && nc >= 0 && nc < G &&
      grid[nr][nc] === 0 && grid[wr][wc] === 0) {

    player.r = nr; player.c = nc;
    moves++;
    sMv.textContent = moves;

    const opt = maze.bfsSol.steps;
    if (opt > 0) {
      sRat.textContent = (moves / opt).toFixed(2) + 'x';
      // Live star update
      const { stars, label } = calcRating(moves, opt);
      dmStars.innerHTML = starsHTML(stars);
      dmLbl.textContent = label;
    }

    if (!startTime) {
      startTime = Date.now();
      timerInt  = setInterval(() => {
        sTm.textContent = Math.floor((Date.now() - startTime) / 1000) + 's';
      }, 500);
    }

    visited.add(key(nr, nc));
    hintCell = null;
    draw();
    if (nr === exitR && nc === exitC) winGame();

  } else {
    msgBox.textContent = 'WALL! Try another direction.';
  }
}

// ── Win screen ────────────────────────────────────────────────
function winGame() {
  gameWon = true;
  clearInterval(timerInt);
  const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const opt = maze.bfsSol.steps;
  const { stars, label, remark } = calcRating(moves, opt);

  dmStars.innerHTML = starsHTML(stars);
  dmLbl.textContent = label;
  dmBreak.textContent = `${moves} used / ${opt} optimal = ${(moves / opt).toFixed(2)}x`;

  winPanel.className = 'show';
  winPanel.innerHTML = `
    <h2>MAZE COMPLETE!</h2>
    <div class="win-stars">${starsHTML(stars)}</div>
    <div class="win-stats">
      Your moves:&nbsp;&nbsp;<strong style="color:#FFD700">${moves}</strong><br>
      Optimal path:&nbsp;<strong style="color:#00ff88">${opt} moves</strong><br>
      Efficiency:&nbsp;&nbsp;<strong style="color:#FFD700">${(moves / opt).toFixed(2)}x optimal</strong><br>
      Time taken:&nbsp;&nbsp;<strong style="color:#FFD700">${elapsed}s</strong>
    </div>
    <div class="win-remark">${remark}</div>
    <button class="db primary" onclick="newMaze()" style="display:inline-block;padding:8px 14px;">&#9654; NEW MAZE</button>
  `;
  draw();
}

// ── Auto-solve (DFS animation) ────────────────────────────────
function autoSolve() {
  if (!maze) return;
  clearTimeout(solveAnim);
  showPath = false; hintCell = null;
  const sol = maze.dfsSol;
  if (!sol.found) { msgBox.textContent = 'No solution found!'; return; }
  msgBox.textContent = 'DFS auto-solving...';
  if (!startTime) {
    startTime = Date.now();
    timerInt = setInterval(() => { sTm.textContent = Math.floor((Date.now()-startTime)/1000)+'s'; }, 500);
  }
  let i = 0;
  function step() {
    if (i >= sol.path.length) { winGame(); return; }
    player.r = sol.path[i][0];
    player.c = sol.path[i][1];
    visited.add(key(player.r, player.c));
    moves++; sMv.textContent = moves;
    const opt = maze.bfsSol.steps;
    if (opt > 0) sRat.textContent = (moves / opt).toFixed(2) + 'x';
    draw(); i++;
    solveAnim = setTimeout(step, 90);
  }
  step();
}

// ── Hint ──────────────────────────────────────────────────────
function showHint() {
  if (!maze || !maze.bfsSol.found) return;
  const path = maze.bfsSol.path;
  let idx = -1;
  for (let i = 0; i < path.length; i++) {
    if (path[i][0] === player.r && path[i][1] === player.c) { idx = i; break; }
  }
  if (idx >= 0 && idx + 1 < path.length) {
    hintCell = path[idx + 1];
    msgBox.textContent = 'Hint: move toward the yellow highlight!';
  } else {
    showPath = true;
    msgBox.textContent = 'Showing full optimal path in cyan.';
  }
  draw();
}

// ── Button bindings ───────────────────────────────────────────
document.getElementById('b-new').onclick   = newMaze;
document.getElementById('b-solve').onclick = autoSolve;
document.getElementById('b-hint').onclick  = showHint;
document.getElementById('b-show').onclick  = () => {
  showPath = !showPath;
  msgBox.textContent = showPath ? 'Optimal path shown in cyan.' : 'Path hidden.';
  draw();
};
document.getElementById('b-reset').onclick = () => {
  if (!maze) return;
  player = { r: maze.startR, c: maze.startC };
  visited = new Set([key(player.r, player.c)]);
  moves = 0; sMv.textContent = '0'; sRat.textContent = '-';
  clearInterval(timerInt); startTime = null; sTm.textContent = '0s';
  gameWon = false; showPath = false; hintCell = null;
  winPanel.className = ''; winPanel.innerHTML = '';
  dmStars.innerHTML = '☆☆☆'; dmLbl.textContent = 'Complete the maze!';
  dmBreak.textContent = '';
  draw(); msgBox.textContent = 'Position reset!';
};

// D-pad
const dpad = { bu: [-2,0], bd: [2,0], bl: [0,-2], br: [0,2] };
for (const [id, delta] of Object.entries(dpad)) {
  const btn = document.getElementById(id);
  btn.addEventListener('mousedown', () => btn.classList.add('act'));
  btn.addEventListener('mouseup',   () => btn.classList.remove('act'));
  btn.addEventListener('mouseleave',() => btn.classList.remove('act'));
  btn.onclick = () => tryMove(...delta);
}

// Keyboard
document.addEventListener('keydown', e => {
  const map = {
    ArrowUp:[-2,0], ArrowDown:[2,0], ArrowLeft:[0,-2], ArrowRight:[0,2],
    w:[-2,0], s:[2,0], a:[0,-2], d:[0,2],
    W:[-2,0], S:[2,0], A:[0,-2], D:[0,2]
  };
  if (map[e.key]) {
    e.preventDefault();
    tryMove(...map[e.key]);
    const bmap = { ArrowUp:'bu', ArrowDown:'bd', ArrowLeft:'bl', ArrowRight:'br' };
    if (bmap[e.key]) {
      const b = document.getElementById(bmap[e.key]);
      b.classList.add('act');
      setTimeout(() => b.classList.remove('act'), 110);
    }
  }
});

document.getElementById('sz').onchange = newMaze;

// Start on load
newMaze();
