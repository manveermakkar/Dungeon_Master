# 🗡️ DUNGEON MASTER

> A procedurally generated maze game powered by **Kruskal's MST**, **DFS backtracking**, and **BFS optimal pathfinding** — built with vanilla JavaScript and Node.js.

![Dungeon Master](https://img.shields.io/badge/version-1.0.0-FFD700?style=flat-square&labelColor=000820&color=1a6fff)
![Node](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue?style=flat-square)

---

## 📁 Project Structure

```
dungeon-master/
├── package.json
├── server.js          ← Node.js backend (maze generation + solvers)
├── README.md
└── web/
    ├── index.html     ← Game UI
    ├── style.css      ← Retro pixel styling
    └── game.js        ← Canvas rendering + player logic
```

> ⚠️ **Important:** The `web/` folder must exist and contain `index.html`, `style.css`, and `game.js`. The server serves these as static files. See [Setup](#-setup--installation) below.

---

## ✨ Features

- **Procedural maze generation** using Randomized Kruskal's Algorithm (Greedy MST)
- **Disjoint Set Union (Union-Find)** with path compression and union by rank
- **DFS auto-solver** with animated backtracking visualization
- **BFS optimal solver** that computes the shortest possible path
- **Star rating system** based on your move efficiency vs. the optimal path
- **Hint system** — highlights your next optimal move
- 5 difficulty levels: Easy (9×9) → Insane (25×25)
- Keyboard (Arrow / WASD) and D-pad controls
- Retro pixel-art aesthetic with a Pac-Man player character

---

## 🧠 Algorithms Used

| Role | Algorithm |
|---|---|
| Maze Generation | Randomized Kruskal's (MST) |
| Cycle Prevention | Disjoint Set Union (Union-Find) |
| Auto-Solver | DFS with explicit stack (backtracking) |
| Optimal Path | BFS (Breadth-First Search) |

---

## 🖥️ Setup & Installation

### Prerequisites

- [Node.js](https://nodejs.org/) **v18 or higher**
- A terminal (Command Prompt, PowerShell, bash, etc.)

### Steps

**1. Clone or download the project**

```bash
git clone https://github.com/your-username/dungeon-master.git
cd dungeon-master
```

Or simply download and extract the ZIP, then open a terminal in the project folder.

**2. Create the `web/` folder and move frontend files into it**

The server expects frontend files inside a `web/` subdirectory. Run these commands:

```bash
# On macOS / Linux
mkdir web
mv index.html style.css game.js web/

# On Windows (Command Prompt)
mkdir web
move index.html web\
move style.css web\
move game.js web\
```

Your final structure should look like this:

```
dungeon-master/
├── package.json
├── server.js
├── README.md
└── web/
    ├── index.html
    ├── style.css
    └── game.js
```

**3. Install dependencies**

This project has **no npm dependencies** — the server uses only Node.js built-in modules (`http`, `fs`, `path`, `url`). You can skip `npm install`, but running it won't cause any issues:

```bash
npm install
```

**4. Start the server**

```bash
npm start
```

Or directly:

```bash
node server.js
```

You should see:

```
==========================================
 Dungeon Master is running!
 Open: http://localhost:8080
==========================================
```

**5. Open the game**

Open your browser and go to:

```
http://localhost:8080
```

---

## 🎮 How to Play

| Action | Controls |
|---|---|
| Move Up | `↑` Arrow or `W` |
| Move Down | `↓` Arrow or `S` |
| Move Left | `←` Arrow or `A` |
| Move Right | `→` Arrow or `D` |

Use the on-screen buttons for touch/mouse control.

### Button Reference

| Button | Description |
|---|---|
| **NEW MAZE** | Generate a fresh random maze |
| **AUTO SOLVE** | Watch DFS backtracking solve it live |
| **HINT** | Highlights your next optimal move |
| **TOGGLE PATH** | Shows/hides the full BFS optimal path in cyan |
| **RESET POSITION** | Returns you to the start without regenerating |

---

## ⭐ Star Rating System

Your performance is rated against the BFS optimal path:

| Stars | Condition |
|---|---|
| ⭐⭐⭐ | Moves ≤ 115% of optimal |
| ⭐⭐ | Moves ≤ 170% of optimal |
| ⭐ | Finished, but used too many moves |

---

## 🗺️ Legend

| Color | Meaning |
|---|---|
| 🟡 Yellow (Pac-Man) | Your player |
| 🟢 Green `S` | Start position |
| 🔴 Red `E` | Exit / Goal |
| 🔵 Blue | Walls |
| Pink tint | Cells you've visited |
| Cyan tint | BFS optimal path |
| Yellow tint | Hint cell |

---

## ⚙️ Maze Size Options

| Option | Grid Size | Difficulty |
|---|---|---|
| 9×9 | 19×19 physical | Easy |
| 13×13 | 27×27 physical | Medium |
| 17×17 | 35×35 physical | Hard |
| 21×21 | 43×43 physical | Expert |
| 25×25 | 51×51 physical | Insane |

> The physical grid is `(2N+1)×(2N+1)` where odd cells are rooms and even cells are walls.

---

## 🔧 Configuration

You can change the server port by editing the `PORT` constant at the top of `server.js`:

```js
const PORT = 8080; // Change this to any available port
```

To change the allowed maze size range, edit these lines in `server.js`:

```js
if (N < 5)  N = 5;
if (N > 31) N = 31;
```

---

## 🐛 Troubleshooting

**`ERROR: Make sure server.js is running!`** in the browser
→ The game client couldn't reach the API. Make sure `node server.js` is running in your terminal and you're visiting `http://localhost:8080`.

**`Not found` when opening the page**
→ Check that `index.html`, `style.css`, and `game.js` are inside the `web/` folder, not in the root.

**Port already in use**
→ Either stop the other process using port 8080, or change `PORT` in `server.js` to another value like `3000`.

**Blank canvas / maze not rendering**
→ Open browser DevTools (F12) → Console tab and check for errors. Ensure you're on `http://localhost:8080` and not opening `index.html` directly as a file.

---

## 📜 License

ISC — free to use, modify, and share.
