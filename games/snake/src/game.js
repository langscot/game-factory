// Snake. One file, no dependencies, no build step — this is what a small game looks like here.
//
// The rules live in `step()`, which knows nothing about the canvas. The renderer reads state
// and draws it. That separation is not ceremony: it is what makes the game testable by reading
// it, and what stops a rendering tweak changing how the game plays.

const GRID = 21;             // cells per side
const START_MS = 145;        // ms per move at score 0
const MIN_MS = 70;           // fastest it ever gets
const SPEEDUP = 4;           // ms shaved per food eaten
const BEST_KEY = "snake.best";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");

let cell = 24; // pixel size of one cell, recalculated on resize
let state;

function fresh() {
  const mid = Math.floor(GRID / 2);
  return {
    snake: [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }],
    dir: { x: 1, y: 0 },
    queue: [],
    food: null,
    score: 0,
    best: Number(localStorage.getItem(BEST_KEY) || 0),
    alive: true,
    paused: false,
    started: false,
    ateAt: 0,
  };
}

function emptyCells(s) {
  const taken = new Set(s.snake.map((c) => `${c.x},${c.y}`));
  const free = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!taken.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free;
}

function placeFood(s) {
  const free = emptyCells(s);
  s.food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

// One tick of the game. Returns true if the world changed in a way worth drawing.
function step(s) {
  if (!s.alive || s.paused || !s.started) return false;

  if (s.queue.length) {
    const next = s.queue.shift();
    // Ignore a turn into your own neck.
    if (next.x !== -s.dir.x || next.y !== -s.dir.y) s.dir = next;
  }

  const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
  const hitSelf = s.snake.some((c) => c.x === head.x && c.y === head.y);
  if (hitWall || hitSelf) {
    s.alive = false;
    if (s.score > s.best) {
      s.best = s.score;
      localStorage.setItem(BEST_KEY, String(s.best));
    }
    return true;
  }

  s.snake.unshift(head);

  if (s.food && head.x === s.food.x && head.y === s.food.y) {
    s.score += 1;
    s.ateAt = performance.now();
    placeFood(s);
  } else {
    s.snake.pop();
  }

  return true;
}

const tickMs = (s) => Math.max(MIN_MS, START_MS - s.score * SPEEDUP);

// ── drawing ────────────────────────────────────────────────────────────────

function resize() {
  const side = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.72, 640);
  cell = Math.floor(side / GRID);
  const px = cell * GRID;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.width = `${px}px`;
  canvas.style.height = `${px}px`;
  canvas.width = Math.floor(px * dpr);
  canvas.height = Math.floor(px * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(now) {
  const s = state;
  const size = cell * GRID;

  ctx.fillStyle = "#131b16";
  ctx.fillRect(0, 0, size, size);

  // A grid you can barely see, so the board reads as a board.
  ctx.strokeStyle = "rgba(160,255,180,0.07)";
  ctx.lineWidth = 1;
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cell + 0.5, 0);
    ctx.lineTo(i * cell + 0.5, size);
    ctx.moveTo(0, i * cell + 0.5);
    ctx.lineTo(size, i * cell + 0.5);
    ctx.stroke();
  }

  if (s.food) {
    const pulse = 1 + 0.12 * Math.sin((now - s.ateAt) / 220);
    const cx = s.food.x * cell + cell / 2;
    const cy = s.food.y * cell + cell / 2;
    ctx.shadowColor = "rgba(255,120,90,0.8)";
    ctx.shadowBlur = cell * 0.7;
    ctx.fillStyle = "#ff7a5c";
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.28 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Body first so the head lands on top.
  for (let i = s.snake.length - 1; i >= 1; i--) {
    const seg = s.snake[i];
    const fade = 1 - (i / s.snake.length) * 0.55;
    ctx.fillStyle = `rgba(126,231,151,${0.55 + fade * 0.35})`;
    roundRect(seg.x * cell + 1.5, seg.y * cell + 1.5, cell - 3, cell - 3, cell * 0.3);
    ctx.fill();
  }

  const head = s.snake[0];
  ctx.fillStyle = "#b9f6c4";
  roundRect(head.x * cell + 1, head.y * cell + 1, cell - 2, cell - 2, cell * 0.34);
  ctx.fill();

  // Eyes, looking where the snake is going.
  const hx = head.x * cell + cell / 2;
  const hy = head.y * cell + cell / 2;
  const off = cell * 0.17;
  const eye = Math.max(1.5, cell * 0.09);
  const look = { x: s.dir.x * off * 0.55, y: s.dir.y * off * 0.55 };
  const across = { x: s.dir.y * off, y: -s.dir.x * off };

  ctx.fillStyle = "#0e1410";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(hx + look.x + across.x * side, hy + look.y + across.y * side, eye, 0, Math.PI * 2);
    ctx.fill();
  }

  if (!s.started || !s.alive) {
    ctx.fillStyle = "rgba(8,12,10,0.68)";
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = "#e6f2e8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `500 ${Math.round(cell * 1.05)}px ui-rounded, -apple-system, system-ui, sans-serif`;
    ctx.fillText(s.alive ? "Snake" : "Dead", size / 2, size / 2 - cell * 0.7);
    ctx.fillStyle = "#8fa595";
    ctx.font = `${Math.round(cell * 0.62)}px ui-rounded, -apple-system, system-ui, sans-serif`;
    ctx.fillText(
      s.alive ? "press space" : `score ${s.score} · space to retry`,
      size / 2,
      size / 2 + cell * 0.2,
    );
  }

  scoreEl.textContent = s.score;
  bestEl.textContent = s.best;
}

function reset() {
  state = fresh();
  placeFood(state);
  draw(performance.now());
}

// ── loop ───────────────────────────────────────────────────────────────────

let last = 0;
let acc = 0;

function frame(now) {
  const delta = Math.min(now - last, 250);
  last = now;

  if (state.started && state.alive && !state.paused) {
    acc += delta;
    while (acc >= tickMs(state)) {
      acc -= tickMs(state);
      step(state);
      if (!state.alive) {
        acc = 0;
        break;
      }
    }
  }

  draw(now);
  requestAnimationFrame(frame);
}

// ── input ──────────────────────────────────────────────────────────────────

function turn(x, y) {
  if (!state.alive || !state.started) return;
  const lastDir = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
  if (lastDir.x === -x && lastDir.y === -y) return; // 180° is not a move
  if (lastDir.x === x && lastDir.y === y) return;   // already going that way
  if (state.queue.length < 2) state.queue.push({ x, y });
}

addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  const dirs = {
    arrowup: [0, -1], w: [0, -1],
    arrowdown: [0, 1], s: [0, 1],
    arrowleft: [-1, 0], a: [-1, 0],
    arrowright: [1, 0], d: [1, 0],
  };
  if (dirs[k]) {
    e.preventDefault();
    turn(...dirs[k]);
    return;
  }
  if (k === " " || k === "enter") {
    e.preventDefault();
    if (!state.started || !state.alive) {
      state.started = true;
      state.alive = true;
      acc = 0;
    }
  }
  if (k === "p" && state.started) state.paused = !state.paused;
});

// Touch: the first swipe is also the start.
let touch = null;
canvas.addEventListener("pointerdown", (e) => { touch = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener("pointerup", (e) => {
  if (!touch) return;
  const dx = e.clientX - touch.x;
  const dy = e.clientY - touch.y;
  touch = null;
  if (Math.hypot(dx, dy) < 18) return;

  if (!state.started || !state.alive) {
    state.started = true;
    state.alive = true;
    acc = 0;
  }
  if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
  else turn(0, dy > 0 ? 1 : -1);
});

// Nobody should come back to a burning CPU.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) state.paused = true;
});

addEventListener("resize", () => {
  resize();
  draw(performance.now());
});

resize();
reset();
requestAnimationFrame((t) => { last = t; frame(t); });
