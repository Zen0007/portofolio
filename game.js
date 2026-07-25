/* ============================================================
   Leaderboard Management System
   ============================================================ */

import { existName, getLeaderboard, saveHighScore } from "./api";

// Initial default high scores

// 1. Get scores from localStorage or default values

// 3. Render leaderboard into the HTML list
async function renderLeaderboard() {
  const listEl = document.getElementById("leaderboardList");
  if (!listEl) return;

  const scores = await getLeaderboard();

  console.log(scores, "-------------");

  // Clear existing list elements before rendering
  listEl.innerHTML = "";

  // 1. Render empty state if no scores exist
  if (!scores || scores.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "leaderboard__item leaderboard__item--empty";
    emptyLi.style.justifyContent = "center";
    emptyLi.style.opacity = "0.6";
    emptyLi.innerHTML = `<span class="leaderboard__name">NO SCORES YET</span>`;
    listEl.appendChild(emptyLi);
    return;
  }

  // 2. Iterate through `scores` array (NOT leaderboardElement)
  scores.forEach((entry, index) => {
    const rank = index + 1;
    const li = document.createElement("li");
    li.className = `leaderboard__item leaderboard__item--${rank}`;

    li.innerHTML = `
      <span class="leaderboard__rank">${rank}</span>
      <span class="leaderboard__name">${entry.name}</span>
      <span class="leaderboard__score">${entry.score}</span>
    `;

    listEl.appendChild(li);
  });
}
/* ============================================================
   BRICK BREAKER — Brutalist Edition (Vanilla JS, no deps)
   Siap di-embed ke Bento Grid portofolio.
   Class `BrickBreaker` menerima options.onGameOver(finalScore, playerName).
   ============================================================ */

class BrickBreaker {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onGameOver =
      typeof options.onGameOver === "function" ? options.onGameOver : () => {};

    // Resolusi logikal (rasio 4:5)
    this.W = 480;
    this.H = 600;

    // DPR-aware backing store agar garis tetap tajam di retina
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = this.W * dpr;
    canvas.height = this.H * dpr;
    this.ctx.scale(dpr, dpr);

    // Palet brutalisme: bg putih, stroke hitam, fill neon
    this.PALETTE = {
      bg: "#FFFFFF",
      stroke: "#000000",
      paddle: "#00E5FF",
      ball: "#FF00E5",
      brick: ["#FFE600", "#00FF66", "#00E5FF", "#FF5500", "#FF00E5"],
    };

    // State machine: IDLE | START | PLAYING | GAME_OVER | WIN
    this.state = "IDLE";
    this.playerName = "PLAYER";
    this.score = 0;
    this.lives = 3;

    // Paddle
    this.paddle = { w: 88, h: 14, x: 0, y: this.H - 38, speed: 7 };
    this.paddle.x = (this.W - this.paddle.w) / 2;

    // Ball (kotak — sudut tajam brutalis)
    this.ball = {
      size: 12,
      x: this.W / 2,
      y: this.paddle.y - 12,
      vx: 0,
      vy: 0,
      speed: 5.2,
      stuck: true,
    };

    // Brick grid
    this.cols = 8;
    this.rows = 5;
    this.pad = 4;
    this.brickTop = 64;
    this.brickLeft = 16;
    this.brickW =
      (this.W - this.brickLeft * 2 - this.pad * (this.cols - 1)) / this.cols;
    this.brickH = 22;
    this.bricks = [];
    this._initBricks();

    // Input
    this.keys = { left: false, right: false };
    this.pointerX = null;
    this._bindEvents();

    // Fixed-step loop (frame-rate independent)
    this.acc = 0;
    this.lastTime = performance.now();
    this.STEP = 1000 / 60;
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  /* ---------- Public Methods ---------- */

  setPlayerName(name) {
    this.playerName = name.toUpperCase().substring(0, 10) || "ANON";
    this.state = "START";
  }

  /* ---------- Setup ---------- */

  _initBricks() {
    this.bricks = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.bricks.push({
          x: this.brickLeft + c * (this.brickW + this.pad),
          y: this.brickTop + r * (this.brickH + this.pad),
          w: this.brickW,
          h: this.brickH,
          color: this.PALETTE.brick[r],
          alive: true,
          points: (this.rows - r) * 10, // baris atas paling berharga
        });
      }
    }
  }

  /* ---------- Input ---------- */

  _bindEvents() {
    // Konversi client X → X logikal kanvas
    const toX = (clientX) => {
      const r = this.canvas.getBoundingClientRect();
      return (clientX - r.left) * (this.W / r.width);
    };

    // Mouse (desktop)
    this._onMouseMove = (e) => {
      if (this.state !== "PLAYING") return;
      this.pointerX = toX(e.clientX);
    };
    this.canvas.addEventListener("mousemove", this._onMouseMove);

    // Touch (mobile) — preventDefault agar tidak menggulir halaman
    this._onTouchStart = (e) => {
      e.preventDefault();
      if (e.touches.length) this.pointerX = toX(e.touches[0].clientX);
      this._tap();
    };
    this._onTouchMove = (e) => {
      e.preventDefault();
      if (this.state !== "PLAYING" || !e.touches.length) return;
      this.pointerX = toX(e.touches[0].clientX);
    };
    this.canvas.addEventListener("touchstart", this._onTouchStart, {
      passive: false,
    });
    this.canvas.addEventListener("touchmove", this._onTouchMove, {
      passive: false,
    });

    // Click (desktop)
    this._onClick = () => this._tap();
    this.canvas.addEventListener("click", this._onClick);

    // Keyboard — preventDefault arrow hanya saat game aktif
    this._onKeyDown = (e) => {
      if (this.state !== "PLAYING") return;
      const t = e.target;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") {
        this.keys.left = true;
        e.preventDefault();
      } else if (k === "ArrowRight" || k === "d" || k === "D") {
        this.keys.right = true;
        e.preventDefault();
      } else if (k === " " || k === "Spacebar") {
        e.preventDefault();
        if (this.ball.stuck) this._launch();
      }
    };
    this._onKeyUp = (e) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") this.keys.left = false;
      else if (k === "ArrowRight" || k === "d" || k === "D")
        this.keys.right = false;
    };
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  _tap() {
    if (this.state === "START") {
      this.state = "PLAYING";
      this._launch();
    } else if (this.state === "PLAYING" && this.ball.stuck) {
      this._launch();
    } else if (this.state === "GAME_OVER" || this.state === "WIN") {
      this._reset();
    }
  }

  _launch() {
    // Luncurkan bola ke atas dengan sudut acak ±36° dari vertikal
    this.ball.stuck = false;
    const a = (Math.random() * 0.4 - 0.2) * Math.PI;
    this.ball.vx = this.ball.speed * Math.sin(a);
    this.ball.vy = -this.ball.speed * Math.cos(a);
  }

  _reset() {
    this.score = 0;
    this.lives = 3;
    this.paddle.x = (this.W - this.paddle.w) / 2;
    this.ball.x = this.paddle.x + this.paddle.w / 2;
    this.ball.y = this.paddle.y - this.ball.size - 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.stuck = true;
    this.pointerX = null;
    this.keys.left = false;
    this.keys.right = false;
    this._initBricks();
    this.state = "START";
  }

  /* ---------- Game logic ---------- */

  update() {
    if (this.state !== "PLAYING") return;

    // Paddle: arrow keys diprioritaskan saat ditekan, jika tidak ikut pointer
    const anyKey = this.keys.left || this.keys.right;
    if (!anyKey && this.pointerX !== null) {
      this.paddle.x = this.pointerX - this.paddle.w / 2;
    }
    if (this.keys.left) this.paddle.x -= this.paddle.speed;
    if (this.keys.right) this.paddle.x += this.paddle.speed;
    this.paddle.x = Math.max(
      0,
      Math.min(this.W - this.paddle.w, this.paddle.x),
    );

    // Bola menempel pada paddle antara nyawa
    if (this.ball.stuck) {
      this.ball.x = this.paddle.x + this.paddle.w / 2;
      this.ball.y = this.paddle.y - this.ball.size / 2 - 2;
      return;
    }

    // Gerakkan bola
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
    const h = this.ball.size / 2;

    // Tabrakan dinding (kiri / kanan / atas)
    if (this.ball.x - h < 0) {
      this.ball.x = h;
      this.ball.vx = Math.abs(this.ball.vx);
    } else if (this.ball.x + h > this.W) {
      this.ball.x = this.W - h;
      this.ball.vx = -Math.abs(this.ball.vx);
    }
    if (this.ball.y - h < 0) {
      this.ball.y = h;
      this.ball.vy = Math.abs(this.ball.vy);
    }

    // Bola jatuh di bawah paddle: kurangi nyawa
    if (this.ball.y - h > this.H) {
      this.lives--;
      if (this.lives <= 0) return this._end(false);
      this.ball.stuck = true;
      this.ball.vx = 0;
      this.ball.vy = 0;
      return;
    }

    this._collidePaddle();
    this._collideBricks();

    if (this.bricks.every((b) => !b.alive)) this._end(true);
  }

  /**
   * COLLISION: Bola vs Paddle (AABB vs AABB).
   * Posisi tumbukan horizontal (-1..1) menentukan sudut pantulan,
   * memberi pemain kontrol arah — gaya klasik Breakout.
   */
  _collidePaddle() {
    const p = this.paddle,
      b = this.ball,
      h = b.size / 2;
    // AABB reject
    if (
      b.x + h < p.x ||
      b.x - h > p.x + p.w ||
      b.y + h < p.y ||
      b.y - h > p.y + p.h
    )
      return;
    if (b.vy <= 0) return; // hanya saat bola turun

    // Posisi tumbukan relatif terhadap pusat paddle (-1 kiri .. 0 .. 1 kanan)
    const hit = (b.x - (p.x + p.w / 2)) / (p.w / 2);
    const c = Math.max(-1, Math.min(1, hit));

    // Pantul dengan sudut maks 60° dari vertikal
    const ang = c * (Math.PI / 3);
    const sp = Math.max(b.speed, Math.hypot(b.vx, b.vy));
    b.vx = sp * Math.sin(ang);
    b.vy = -Math.abs(sp * Math.cos(ang));
    b.y = p.y - h - 1; // anti-stick: tempatkan bola tepat di atas paddle
  }

  /**
   * COLLISION: Bola vs Bricks (AABB vs AABB).
   * Untuk setiap brick hidup, hitung overlap pada sumbu X & Y.
   * Overlap yang LEBIH KECIL adalah sumbu yang dilewati bola,
   * sehingga komponen kecepatan tersebut dibalik dan bola didorong keluar.
   * Hanya satu brick diselesaikan per frame agar fisika tetap bersih.
   */
  _collideBricks() {
    const b = this.ball,
      h = b.size / 2;
    for (const br of this.bricks) {
      if (!br.alive) continue;
      // AABB reject
      if (
        b.x + h < br.x ||
        b.x - h > br.x + br.w ||
        b.y + h < br.y ||
        b.y - h > br.y + br.h
      )
        continue;

      // Delta center-to-center & overlap per sumbu
      const dx = b.x - (br.x + br.w / 2);
      const dy = b.y - (br.y + br.h / 2);
      const ox = br.w / 2 + h - Math.abs(dx);
      const oy = br.h / 2 + h - Math.abs(dy);

      if (ox < oy) {
        // Tumbukan samping — balik X, dorong keluar horizontal
        b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
        b.x += dx > 0 ? ox : -ox;
      } else {
        // Tumbukan atas/bawah — balik Y, dorong keluar vertikal
        b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
        b.y += dy > 0 ? oy : -oy;
      }

      br.alive = false;
      this.score += br.points;
      break; // selesaikan satu brick per frame
    }
  }

  _end(won) {
    this.state = won ? "WIN" : "GAME_OVER";
    this.keys.left = false;
    this.keys.right = false;
    // Fire callback untuk integrasi leaderboard / backend
    try {
      this.onGameOver(this.score, this.playerName);
    } catch (e) {
      console.error(e);
    }
  }

  /* ---------- Render ---------- */

  draw() {
    const ctx = this.ctx;

    // Jika state IDLE (sebelum input nama), jangan render apapun selain bg
    if (this.state === "IDLE") {
      ctx.fillStyle = this.PALETTE.bg;
      ctx.fillRect(0, 0, this.W, this.H);
      return;
    }

    // Background
    ctx.fillStyle = this.PALETTE.bg;
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.lineWidth = 3;
    ctx.strokeStyle = this.PALETTE.stroke;

    // Bricks
    for (const br of this.bricks) {
      if (!br.alive) continue;
      ctx.fillStyle = br.color;
      ctx.fillRect(br.x, br.y, br.w, br.h);
      ctx.strokeRect(br.x, br.y, br.w, br.h);
    }

    // Paddle
    const p = this.paddle;
    ctx.fillStyle = this.PALETTE.paddle;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeRect(p.x, p.y, p.w, p.h);

    // Ball (kotak)
    const b = this.ball,
      s = b.size;
    ctx.fillStyle = this.PALETTE.ball;
    ctx.fillRect(b.x - s / 2, b.y - s / 2, s, s);
    ctx.strokeRect(b.x - s / 2, b.y - s / 2, s, s);

    // Hint launch saat bola menempel
    if (this.state === "PLAYING" && this.ball.stuck) {
      ctx.fillStyle = "#000";
      ctx.font = 'bold 11px "Courier New", ui-monospace, monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("CLICK / SPACE TO LAUNCH", this.W / 2, this.paddle.y - 8);
    }

    this._drawHUD();

    if (this.state === "START")
      this._drawOverlay(
        "READY",
        `${this.playerName}`,
        "CLICK TO PLAY",
        "#FF00E5",
        "light",
      );
    else if (this.state === "GAME_OVER")
      this._drawOverlay(
        "GAME OVER",
        `${this.playerName}`,
        `SCORE ${this.score}`,
        "#FFE600",
        "dark",
      );
    else if (this.state === "WIN")
      this._drawOverlay(
        "YOU WIN",
        `${this.playerName}`,
        `SCORE ${this.score}`,
        "#000000",
        "green",
      );
  }

  _drawHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = "#000";
    ctx.font = 'bold 14px "Courier New", ui-monospace, monospace';
    ctx.textBaseline = "top";

    // Player Name di kiri
    ctx.textAlign = "left";
    ctx.fillText(`P1: ${this.playerName}`, 16, 20);

    // Score di tengah
    ctx.textAlign = "center";
    ctx.fillText(
      `SCORE ${String(this.score).padStart(4, "0")}`,
      this.W / 2,
      20,
    );

    // Lives di kanan
    ctx.textAlign = "right";
    ctx.fillText(`LIVES ${this.lives}`, this.W - 16, 20);

    // Garis pemisah HUD
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 48);
    ctx.lineTo(this.W - 16, 48);
    ctx.stroke();
  }

  _drawOverlay(line1, line2, line3, accent, mode) {
    const ctx = this.ctx;
    const bg =
      mode === "dark"
        ? "rgba(0,0,0,0.86)"
        : mode === "green"
          ? "rgba(0,255,102,0.88)"
          : "rgba(255,255,255,0.88)";
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Line 1 (Title)
    ctx.font = 'bold 40px "Courier New", ui-monospace, monospace';
    ctx.fillStyle = mode === "dark" ? accent : "#000";
    ctx.fillText(line1, this.W / 2, this.H / 2 - 50);

    // Line 2 (Player Name or context)
    ctx.font = 'bold 18px "Courier New", ui-monospace, monospace';
    ctx.fillStyle =
      mode === "dark" ? accent : mode === "green" ? "#000" : accent;
    ctx.fillText(line2, this.W / 2, this.H / 2 - 10);

    // Line 3 (Score or Prompt)
    ctx.font = 'bold 22px "Courier New", ui-monospace, monospace';
    ctx.fillStyle = mode === "dark" ? "#FFFFFF" : "#000";
    ctx.fillText(line3, this.W / 2, this.H / 2 + 30);

    // CTA
    ctx.font = 'bold 12px "Courier New", ui-monospace, monospace';
    ctx.fillStyle = mode === "dark" ? "#FFFFFF" : "#000";
    const cta =
      this.state === "START"
        ? "CLICK / TAP TO START"
        : "CLICK / TAP TO RESTART";
    ctx.fillText(cta, this.W / 2, this.H / 2 + 70);

    ctx.font = 'bold 10px "Courier New", ui-monospace, monospace';
    ctx.fillStyle = mode === "dark" ? "#BBBBBB" : "#555";
    ctx.fillText("ARROWS  /  MOUSE  /  TOUCH", this.W / 2, this.H / 2 + 95);
  }

  /* ---------- Loop ---------- */

  _loop(now) {
    const dt = Math.min(100, now - this.lastTime);
    this.lastTime = now;
    this.acc += dt;
    // Fixed-step update: konstan di 60Hz terlepas dari refresh rate display
    while (this.acc >= this.STEP) {
      this.update();
      this.acc -= this.STEP;
    }
    this.draw();
    requestAnimationFrame(this._loop);
  }

  /* ---------- Public API ---------- */

  destroy() {
    // Lepas semua listener saat kartu bento di-unmount
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("touchstart", this._onTouchStart);
    this.canvas.removeEventListener("touchmove", this._onTouchMove);
    this.canvas.removeEventListener("click", this._onClick);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
  }
}

/* ============================================================
   Boot — instantiate & hubungkan callback leaderboard
   ============================================================ */
const lastScoreEl = document.getElementById("lastScore");
const nameModal = document.getElementById("nameModal");
const nameInput = document.getElementById("playerNameInput");
const startBtn = document.getElementById("startGameBtn");

// Init game dalam state IDLE (menunggu input nama)
const game = new BrickBreaker(document.getElementById("brickCanvas"), {
  /**
   * Dipanggil SATU kali saat game berakhir (menang/kalah).
   * Hubungkan ke backend Go/Rust Anda, contoh:
   *
   *   fetch('/api/leaderboard', {
   *     method: 'POST',
   *     headers: { 'Content-Type': 'application/json' },
   *     body: JSON.stringify({ score: finalScore, name: playerName, game: 'brick_breaker' })
   *   });
   */
  async onGameOver(finalScore, playerName) {
    console.log(`[Leaderboard] ${playerName} scored: ${finalScore}`);
    if (lastScoreEl) {
      lastScoreEl.textContent = `LAST: ${String(finalScore).padStart(4, "0")}`;
    }

    // Save score and update leaderoard top 3 automatically
    if (finalScore > 0) {
      await saveHighScore(playerName || "ANON", finalScore);
      await renderLeaderboard(); // Refresh display after saving
    }
  },
});

// Event handler untuk form input nama
const handleStart = async (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // 1. Try to get element
  let errorElement = document.getElementById("nameError");

  // Fallback: If null, auto-create it inside .modal-content
  if (!errorElement) {
    const modalContent = document.querySelector(".modal-content");
    if (modalContent) {
      errorElement = document.createElement("p");
      errorElement.id = "nameError";
      errorElement.className = "name-error";
      // Insert right before the Start button
      const btn = document.getElementById("startGameBtn");
      modalContent.insertBefore(errorElement, btn);
    }
  }

  let name = nameInput ? nameInput.value.trim().toUpperCase() : "ANON";
  if (!name) name = "ANON";

  const isTaken = await existName(name);

  if (isTaken) {
    console.log("Name is taken, updating UI...");
    if (errorElement) {
      errorElement.textContent = `NAME ${name} ALREADY TAKEN ! CHOOSE ANOTHER.`;
      errorElement.classList.add("visible");
    }
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
    return;
  }

  if (errorElement) {
    errorElement.classList.remove("visible");
  }

  game.setPlayerName(name);
  if (nameModal) nameModal.classList.add("hidden");
  if (nameInput) nameInput.blur();
};
// --- FIX YOUR EVENT LISTENERS HERE --- //

if (startBtn) {
  // Pass handleStart directly so 'e' (the click event) is passed properly
  startBtn.addEventListener("click", handleStart);
}

if (nameInput) {
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleStart(e);
    }
  });

  window.addEventListener("load", () => nameInput.focus());
}

window.addEventListener("DOMContentLoaded", async () => {
  await renderLeaderboard();
});
