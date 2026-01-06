// ATA Run: Warsaw Semester Sprint (Canvas runner)
// Controls: Space / ArrowUp jump, R restart

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const ectsEl = document.getElementById("ects");
const bestEl = document.getElementById("best");
const coffeeEl = document.getElementById("coffee");

const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelText = document.getElementById("panelText");
const startBtn = document.getElementById("startBtn");
const boyBtn = document.getElementById("boyBtn");
const girlBtn = document.getElementById("girlBtn");
const characterSection = document.getElementById("characterSection");

const W = canvas.width;
const H = canvas.height;

const groundY = H - 70;

let running = false;
let gameOver = false;

let tPrev = 0;

let best = Number(localStorage.getItem("ataRunBest") || 0);
bestEl.textContent = String(best);

function loadSprite(paths) {
  const img = new Image();
  img.decoding = "async";
  let idx = 0;
  function tryLoad() {
    img.src = paths[idx];
  }
  img.addEventListener("error", () => {
    if (idx < paths.length - 1) {
      idx += 1;
      tryLoad();
    }
  });
  tryLoad();
  return img;
}

const sprites = {
  boy: loadSprite(["assets/boy.png", "assets/boy.svg"]),
  girl: loadSprite(["assets/girl.png", "assets/girl.svg"]),
  ects: loadSprite(["assets/ects.png", "assets/ects.svg"]),
  coffee: loadSprite(["assets/coffee.png", "assets/coffe.png", "assets/coffee.svg"]),
  deadline: loadSprite(["assets/deadline.png", "assets/deadline.svg"]),
  exam: loadSprite(["assets/exam.png", "assets/exam.svg"]),
  bg: loadSprite(["assets/background.png"]),
};

function isReady(img) {
  return img && img.complete && img.naturalWidth > 0;
}

// Player
const player = {
  x: 110,
  y: groundY,
  w: 64,
  h: 70,
  vy: 0,
  onGround: true,
};
let currentCharacter = "boy";
function setCharacter(kind) {
  currentCharacter = kind;
  if (boyBtn && girlBtn) {
    boyBtn.classList.toggle("active", kind === "boy");
    girlBtn.classList.toggle("active", kind === "girl");
  }
}

function chooseCharacter(kind) {
  setCharacter(kind);
  if (gameOver) {
    resetGame();
    startGame();
  } else if (!running) {
    startGame();
  }
}

// World
let speed = 320; // px/s
let distance = 0;
let score = 0;
let ects = 0;
let coffee = 0;

let obstacleTimer = 0;
let pickupTimer = 0;

const obstacles = [];
const pickups = [];

// Helpers
function rand(min, max) { return Math.random() * (max - min) + min; }

function resetGame() {
  running = false;
  gameOver = false;
  speed = 320;
  distance = 0;
  score = 0;
  ects = 0;
  coffee = 0;

  player.y = groundY;
  player.vy = 0;
  player.onGround = true;

  obstacles.length = 0;
  pickups.length = 0;

  obstacleTimer = 0;
  pickupTimer = 0;

  scoreEl.textContent = "0";
  ectsEl.textContent = "0";
  coffeeEl.textContent = "0";
}

function showPanel(title, text, btnText = "Start", opts = { showCharacter: true, showBox: true, theme: null }) {
  panelTitle.textContent = title;
  panelText.innerHTML = text;
  startBtn.textContent = btnText;
  if (characterSection) {
    characterSection.classList.toggle("hidden", !opts.showCharacter);
  }
  panel.classList.toggle("image-only", !opts.showBox);
  panel.classList.toggle("theme-game-over", opts.theme === "game-over");
  panel.classList.remove("hidden");
}

function hidePanel() {
  panel.classList.add("hidden");
}

function startGame() {
  if (gameOver) resetGame();
  running = true;
  hidePanel();
}

function jump() {
  if (!running || gameOver) return;
  if (player.onGround) {
    player.vy = -640;
    player.onGround = false;
  }
}

function spawnObstacle() {
  const kind = Math.random() < 0.55 ? "deadline" : "exam";
  // Keep obstacles smaller than player for fair jumps
  const h = kind === "deadline" ? rand(48, 62) : rand(52, 66);
  const w = kind === "deadline" ? rand(62, 78) : rand(64, 82);
  obstacles.push({
    x: W + 40,
    y: groundY + (player.h - h), // base aligned
    w,
    h,
    kind,
  });
}

function spawnPickup() {
  // ECTS or coffee pickups
  const kind = Math.random() < 0.6 ? "ects" : "coffee";
  const size = kind === "ects" ? { w: 64, h: 64 } : { w: 46, h: 60 };
  pickups.push({
    x: W + 40,
    y: groundY - rand(90, 150),
    w: size.w,
    h: size.h,
    kind,
  });
}

function aabb(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function circleRectCollide(c, r) {
  const cx = c.x, cy = c.y;
  const rx = r.x, ry = r.y, rw = r.w, rh = r.h;
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= c.r * c.r;
}

function endGame() {
  running = false;
  gameOver = true;

  if (score > best) {
    best = score;
    localStorage.setItem("ataRunBest", String(best));
    bestEl.textContent = String(best);
  }

  showPanel(
    "Game Over",
    `You got <b>${ects}</b> ECTS, <b>${coffee}</b> coffee and scored <b>${score}</b>.`,
    "Restart",
    { showCharacter: false, showBox: true, theme: "game-over" }
  );
}

// Drawing
function drawBackground() {
  if (isReady(sprites.bg)) {
    ctx.drawImage(sprites.bg, 0, 0, W, H);
  } else {
    // simple fallback skyline
    ctx.fillStyle = "#0b0f19";
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(W - 120, 80, 26, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,.12)";
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.08)";
    for (let i = 0; i < 14; i++) {
      const bw = 40 + (i % 3) * 18;
      const bx = i * 70 - ((distance * 0.15) % 70);
      const bh = 90 + (i % 4) * 30;
      const by = groundY - bh + 60;
      ctx.fillRect(bx, by, bw, bh);
    }

    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fillRect(0, groundY + 56, W, H - (groundY + 56));

    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 56);
    ctx.lineTo(W, groundY + 56);
    ctx.stroke();
  }
}

function drawPlayer() {
  const sprite = sprites[currentCharacter];
  if (isReady(sprite)) {
    ctx.drawImage(sprite, player.x, player.y, player.w, player.h);
  } else {
    // fallback block
    ctx.fillStyle = "#8bd3ff";
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }
}

function drawObstacles() {
  for (const o of obstacles) {
    const sprite = o.kind === "deadline" ? sprites.deadline : sprites.exam;
    if (isReady(sprite)) {
      ctx.drawImage(sprite, o.x, o.y, o.w, o.h);
    } else {
      ctx.fillStyle = o.kind === "deadline" ? "#ff5c5c" : "#ffb85c";
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }
  }
}

function drawPickups() {
  for (const p of pickups) {
    const sprite = p.kind === "ects" ? sprites.ects : sprites.coffee;
    if (isReady(sprite)) {
      ctx.drawImage(sprite, p.x, p.y, p.w, p.h);
    } else {
      ctx.fillStyle = p.kind === "ects" ? "#ffd35c" : "#b57a52";
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }
  }
}

function drawText() {
  // small watermark
  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("ATA Run • Warsaw", 16, 26);
}

function update(dt) {
  if (!running || gameOver) return;

  // accelerate slowly
  speed += dt * 6;

  distance += speed * dt;
  score = Math.floor(distance / 10) + ects * 100 + coffee * 50;

  scoreEl.textContent = String(score);
  ectsEl.textContent = String(ects);
  coffeeEl.textContent = String(coffee);

  // gravity
  player.vy += 1600 * dt;
  player.y += player.vy * dt;

  if (player.y >= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
  }

  // spawn logic
  obstacleTimer -= dt;
  pickupTimer -= dt;

  if (obstacleTimer <= 0) {
    spawnObstacle();
    obstacleTimer = rand(1.0, 1.6); // slightly wider gap between obstacles
  }

  if (pickupTimer <= 0) {
    if (Math.random() < 0.65) spawnPickup();
    pickupTimer = rand(1.0, 1.8);
  }

  // move obstacles/pickups
  for (const o of obstacles) o.x -= speed * dt;
  for (const p of pickups) p.x -= speed * dt;

  // collisions
  const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };

  for (const o of obstacles) {
    if (aabb(playerBox, o)) {
      endGame();
      return;
    }
  }

  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (aabb(playerBox, p)) {
      if (p.kind === "ects") ects += 1;
      else coffee += 1;
      pickups.splice(i, 1);
    }
  }

  // cleanup
  while (obstacles.length && obstacles[0].x + obstacles[0].w < -40) obstacles.shift();
  while (pickups.length && pickups[0].x + pickups[0].w < -40) pickups.shift();
}

function render() {
  drawBackground();
  drawPlayer();
  drawObstacles();
  drawPickups();
  drawText();

  if (!running && !gameOver) {
    ctx.fillStyle = "rgba(255,255,255,.16)";
    ctx.font = "16px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Press Space to start", W / 2, H / 2);
  }
}

function loop(ts) {
  if (!tPrev) tPrev = ts;
  const dt = Math.min(0.033, (ts - tPrev) / 1000);
  tPrev = ts;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);

// UI / controls
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    if (!running && !gameOver) startGame();
    else jump();
  }
  if (e.code === "KeyR") {
    e.preventDefault();
    resetGame();
    showPanel(
      "Pick your runner",
      "Press <b>Space</b> or click Start. Collect ECTS and coffee. Avoid deadlines and exams.",
      "Start",
      { showCharacter: true, showBox: false, theme: null }
    );
  }
});

startBtn.addEventListener("click", () => {
  if (!running && !gameOver) {
    startGame();
  } else if (gameOver) {
    resetGame();
    startGame();
  }
});

boyBtn.addEventListener("click", (e) => { e.stopPropagation(); chooseCharacter("boy"); });
girlBtn.addEventListener("click", (e) => { e.stopPropagation(); chooseCharacter("girl"); });
setCharacter("boy");

// initial panel
showPanel(
  "Pick your runner",
  "Click <b>Boy</b> or <b>Girl</b> (or press Space) to start. Collect ECTS and coffee. Avoid deadlines and exams.",
  "Start",
  { showCharacter: true, showBox: false, theme: null }
);
