// ============================================================
//  Dungeon Master - Node.js Server (Windows Compatible)
//  All C++ algorithms faithfully ported to JavaScript:
//    - Randomized Kruskal's Algorithm (Greedy MST)
//    - Disjoint Set Union (Union-Find) with path compression
//    - DFS Solver (backtracking via explicit stack)
//    - BFS Solver (optimal/shortest path)
//  Run: node server.js
//  Open: http://localhost:8080
// ============================================================

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT    = 8080;
const WEB_DIR = path.join(__dirname, 'web');

// ── MIME types ────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
};

// ============================================================
//  DSU — Disjoint Set Union (Union-Find)
//  Path compression + union by rank
//  Mirrors: include/dsu.h
// ============================================================
class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank   = new Array(n).fill(0);
  }

  // Path compression: flatten tree on every find
  find(x) {
    if (this.parent[x] !== x)
      this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  // Union by rank: smaller tree goes under larger
  unite(a, b) {
    let ra = this.find(a), rb = this.find(b);
    if (ra === rb) return false; // same set = would create cycle
    if (this.rank[ra] < this.rank[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    if (this.rank[ra] === this.rank[rb]) this.rank[ra]++;
    return true;
  }
}

// ============================================================
//  Randomized Kruskal's Algorithm — Maze Generation
//  Mirrors: src/maze.cpp :: MazeEngine::generate()
//
//  The N×N logical grid is stored as a (2N+1)×(2N+1) physical
//  grid where:
//    - Odd (r,c)  = room cell  (passable)
//    - Even (r,c) = wall cell  (initially blocked)
//  We build all possible edges (walls between adjacent rooms),
//  shuffle them randomly, then use DSU to decide which walls
//  to remove — if two rooms are in different components,
//  remove the wall and union them. This builds an MST =
//  perfect maze (connected, no loops, every cell reachable).
// ============================================================
function generateMaze(N) {
  const G    = N * 2 + 1;
  const grid = Array.from({ length: G }, () => new Array(G).fill(1));

  // Carve all room cells
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      grid[r * 2 + 1][c * 2 + 1] = 0;

  // Build edge list (all walls between adjacent rooms)
  const edges = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (c + 1 < N) edges.push([r, c, r,     c + 1]);
      if (r + 1 < N) edges.push([r, c, r + 1, c    ]);
    }
  }

  // Fisher-Yates shuffle
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }

  // Kruskal's: remove wall if cells are in different DSU sets
  const dsu = new DSU(N * N);
  const idx = (r, c) => r * N + c;

  for (const [r1, c1, r2, c2] of edges) {
    if (dsu.unite(idx(r1, c1), idx(r2, c2))) {
      // Wall cell sits between the two room cells
      grid[r1 + r2 + 1][c1 + c2 + 1] = 0;
    }
  }

  return {
    grid,
    G,
    N,
    startR: 1,     startC: 1,
    exitR:  G - 2, exitC:  G - 2,
  };
}

// ============================================================
//  DFS Solver — Depth First Search with backtracking
//  Mirrors: src/maze.cpp :: MazeEngine::solveDFS()
//  Uses an explicit stack (not recursion) to avoid stack overflow
//  on large mazes. Finds A valid path, not necessarily shortest.
//  Used for: animated auto-solver (shows "thinking" visually).
// ============================================================
function solveDFS(maze) {
  const { grid, G, startR, startC, exitR, exitC } = maze;
  const visited = new Set();
  const stack   = [{ r: startR, c: startC, path: [] }];
  const DR = [-2,  2,  0, 0];
  const DC = [ 0,  0, -2, 2];
  const key = (r, c) => r * G + c;

  while (stack.length) {
    const { r, c, path } = stack.pop();
    if (visited.has(key(r, c))) continue;
    visited.add(key(r, c));
    const np = [...path, [r, c]];
    if (r === exitR && c === exitC)
      return { found: true, steps: np.length - 1, path: np };

    for (let d = 0; d < 4; d++) {
      const nr = r + DR[d], nc = c + DC[d];
      if (nr < 0 || nr >= G || nc < 0 || nc >= G) continue;
      if (grid[nr][nc] !== 0 || visited.has(key(nr, nc))) continue;
      const wr = r + DR[d] / 2, wc = c + DC[d] / 2;
      if (grid[wr][wc] === 0)
        stack.push({ r: nr, c: nc, path: np });
    }
  }
  return { found: false, steps: 0, path: [] };
}

// ============================================================
//  BFS Solver — Breadth First Search (OPTIMAL shortest path)
//  Mirrors: src/maze.cpp :: MazeEngine::solveBFS()
//  Explores level by level — guarantees minimum moves.
//  Used for: computing the optimal move count for star rating.
// ============================================================
function solveBFS(maze) {
  const { grid, G, startR, startC, exitR, exitC } = maze;
  const visited = new Set();
  const queue   = [{ r: startR, c: startC, path: [] }];
  const DR = [-2,  2,  0, 0];
  const DC = [ 0,  0, -2, 2];
  const key = (r, c) => r * G + c;

  visited.add(key(startR, startC));

  while (queue.length) {
    const { r, c, path } = queue.shift();
    const np = [...path, [r, c]];
    if (r === exitR && c === exitC)
      return { found: true, steps: np.length - 1, path: np };

    for (let d = 0; d < 4; d++) {
      const nr = r + DR[d], nc = c + DC[d];
      if (nr < 0 || nr >= G || nc < 0 || nc >= G) continue;
      if (grid[nr][nc] !== 0 || visited.has(key(nr, nc))) continue;
      const wr = r + DR[d] / 2, wc = c + DC[d] / 2;
      if (grid[wr][wc] === 0) {
        visited.add(key(nr, nc));
        queue.push({ r: nr, c: nc, path: np });
      }
    }
  }
  return { found: false, steps: 0, path: [] };
}

// ============================================================
//  HTTP Server
// ============================================================
const server = http.createServer((req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── API: generate maze ──────────────────────────────────
  if (pathname === '/api/maze') {
    let N = parseInt(parsed.query.size) || 13;
    if (N < 5)  N = 5;
    if (N > 31) N = 31;

    const maze   = generateMaze(N);
    const dfsSol = solveDFS(maze);
    const bfsSol = solveBFS(maze);

    console.log(`[API] ${N}x${N} maze | DFS=${dfsSol.steps} steps | BFS optimal=${bfsSol.steps} steps`);

    const payload = JSON.stringify({ ...maze, dfsSol, bfsSol });
    res.writeHead(200, {
      'Content-Type':  'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(payload);
    return;
  }

  // ── Static files ────────────────────────────────────────
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(WEB_DIR, filePath);
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('==========================================');
  console.log(' Dungeon Master is running!');
  console.log(` Open: http://localhost:${PORT}`);
  console.log('==========================================');
});
