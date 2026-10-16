// The game clock. The 2025 game read performance.now() and stepped once per screen refresh, so a 120 Hz
// phone ran it twice as fast and time kept running while it was paused. Here the loop steps the game
// 60 times a second and this clock only moves when it does.
var STEP_MS = 1000 / 60;
var gameClock = 0;
function gameNow() {
  return gameClock;
}
var gameTimers = [];
function gameTimeout(fn, ms) {
  gameTimers.push({ at: gameClock + (ms || 0), fn });
}
function runGameTimers() {
  for (let i = 0; i < gameTimers.length; i++) {
    if (gameTimers[i].at <= gameClock) {
      const t = gameTimers.splice(i, 1)[0];
      i--;
      t.fn();
    }
  }
}

// from the 2025 game: src/input.js
// Keys as in 2025 (A/D, Space, C, F/J/Enter), plus W to jump, S to crouch and the arrow keys. The touch controls (phone.js) fill touchKeys.
var keys = {};
var touchKeys = { left: false, right: false, crouch: false, jump: false, fire: false };
var inputRight = () => keys["d"] || keys["D"] || keys["ArrowRight"] || touchKeys.right;
var inputLeft = () => keys["a"] || keys["A"] || keys["ArrowLeft"] || touchKeys.left;
var inputJump = () => keys[" "] || keys["w"] || keys["W"] || keys["ArrowUp"] || touchKeys.jump;
var inputCrouch = () => keys["c"] || keys["C"] || keys["s"] || keys["S"] || keys["ArrowDown"] || touchKeys.crouch;
var inputFire = () => keys["f"] || keys["F"] || keys["j"] || keys["J"] || keys["Enter"] || touchKeys.fire;
var controlsReady = false;
function setupControls() {
  if (controlsReady) return;
  controlsReady = true;
  const controlledKeys = ["a", "A", "d", "D", "j", "J", "f", "F", "Enter", " ", "c", "C", "w", "W", "s", "S", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
  document.addEventListener("keydown", (e) => {
    if (controlledKeys.includes(e.key)) {
      e.preventDefault();
      keys[e.key] = true;
    }
  });
  document.addEventListener("keyup", (e) => {
    if (controlledKeys.includes(e.key)) {
      e.preventDefault();
      keys[e.key] = false;
    }
  });
}

// from the 2025 game: src/constants/player.js
var PLAYER_WIDTH = 64;
var PLAYER_HEIGHT = 96;
var MOVE_SPEED = 4;
var CROUCH_SPEED = 2.5;
var JUMP_FORCE = -12;
var PLAYER_START_HEALTH = 20;

// from the 2025 game: src/constants/blaster.js
var BLASTER_MAX_ENERGY = 30;
var BLASTER_RECHARGE_INTERVAL = 600;
var BLASTER_EMPTY_FLASH_DURATION = 150;

// from the 2025 game: src/player.js
var player = {
  x: 50,
  feetY: 380,
  // 300 (ground) + 80 (height)
  width: PLAYER_WIDTH,
  height: PLAYER_HEIGHT,
  frame: 0,
  speed: MOVE_SPEED,
  vx: 0,
  vy: 0,
  jumping: false,
  grounded: true,
  firing: false,
  facing: 1,
  // 1 for right, -1 for left
  health: PLAYER_START_HEALTH,
  crouching: false,
  muzzleFlashTimer: 0,
  shockedFrame: 0,
  shockedFrameTimer: 0,
  controlEnabled: true,
  sprite: "idle",
  invulnerable: false,
  invulnerableUntil: null,
  hitHoldUntil: 0,
  scale: 1,
  opacity: 1,
  // Blaster energy system
  blasterEnergy: BLASTER_MAX_ENERGY,
  blasterMaxEnergy: BLASTER_MAX_ENERGY,
  blasterLastRechargeTime: 0,
  blasterEmptyFlashEndTime: 0
};
function handleMovement() {
  let isWalking = false;
  const normalSpeed = MOVE_SPEED;
  const crouchSpeed = CROUCH_SPEED;
  player.speed = player.crouching ? crouchSpeed : normalSpeed;
  if (inputRight()) {
    player.vx = player.speed;
    isWalking = true;
    player.facing = 1;
  } else if (inputLeft()) {
    player.vx = -player.speed;
    isWalking = true;
    player.facing = -1;
  } else {
    player.vx = 0;
  }
}
function handleJumping() {
  if (inputJump() && player.grounded) {
    player.vy = JUMP_FORCE;
    player.jumping = true;
    player.grounded = false;
    jumpSound.currentTime = 0;
    jumpSound.play();
  }
}
function handleCrouch() {
  if (inputCrouch() && player.grounded && !player.crouching) {
    player.crouching = true;
    player.height = 80;
    player.y = player.feetY - player.height;
  }
  if (!inputCrouch() && player.crouching) {
    player.crouching = false;
    player.height = 96;
    player.y = player.feetY - player.height;
  }
  if (!player.grounded && player.crouching) {
    player.crouching = false;
    player.height = 96;
    player.y = player.feetY - player.height;
  }
}
function updatePlayerInput() {
  if (!player.controlEnabled) return;
  handleMovement();
  handleJumping();
  handleCrouch();
  if (player.muzzleFlashTimer > 0) player.muzzleFlashTimer--;
}
function getHitbox(player2) {
  if (!player2.grounded && !player2.crouching) {
    const height = 84;
    const topY = player2.feetY - height;
    return { x: player2.x, y: topY, width: player2.width, height };
  } else {
    return { x: player2.x, y: player2.feetY - player2.height, width: player2.width, height: player2.height };
  }
}


// from the 2025 game: src/constants/timing.js
var FLASH_DURATION = 400;
var INVULNERABLE_TIME = 1500;

// from the 2025 game: src/state.js
var gameState = "start";
function setGameState(s) {
  const prev = gameState;
  gameState = s;
  if (prev !== s && window.onGameState) window.onGameState(s, prev);
}
function getGameState() {
  return gameState;
}
var dyingStartTime = null;
function setDyingStartTime(t) {
  dyingStartTime = t;
}
function getDyingStartTime() {
  return dyingStartTime;
}
var killCount = 0;
function resetKillCount() {
  killCount = 0;
}
function incrementKillCount() {
  killCount++;
}
function getKillCount() {
  return killCount;
}
var flashActive = false;
var flashEndTime = 0;
var flashColor = "rgba(255,255,255,0.8)";
function setFlashActive(val) {
  flashActive = val;
}
function setFlashEndTime(val) {
  flashEndTime = val;
}
function setFlashColor(color) {
  flashColor = color;
}
var PHASE_CHANGE_KILL_COUNT = 15;
var difficultyLevel = 1;
var nextPhaseKillCount = PHASE_CHANGE_KILL_COUNT;
function increaseDifficulty() {
  difficultyLevel++;
  nextPhaseKillCount += PHASE_CHANGE_KILL_COUNT;
}
function decreaseDifficulty() {
  if (difficultyLevel > 1) {
    difficultyLevel--;
    nextPhaseKillCount = Math.max(PHASE_CHANGE_KILL_COUNT, nextPhaseKillCount - PHASE_CHANGE_KILL_COUNT);
  }
}
function setPhaseChangeKillCount(val) {
  PHASE_CHANGE_KILL_COUNT = val;
  setNextPhaseKillCount(killCount + PHASE_CHANGE_KILL_COUNT);
}
function setDifficultyLevel(val) {
  difficultyLevel = val;
}
function setNextPhaseKillCount(val) {
  nextPhaseKillCount = val;
}
var currentLevelKey = "rugcoAlley";
function getCurrentLevelKey() {
  return currentLevelKey;
}
var bossActive = false;
var currentBoss = null;
var fightBannerActive = false;
var fightBannerStartTime = 0;
var bossTransition = false;
var bossTransitionStartTime = 0;
var screenShake = false;
var screenShakeStartTime = 0;
var SCREEN_SHAKE_DURATION = 1e3;
var DEFAULT_SCREEN_SHAKE_MAGNITUDE = 10;
var screenShakeMagnitude = DEFAULT_SCREEN_SHAKE_MAGNITUDE;
function setScreenShakeMagnitude(val) {
  screenShakeMagnitude = val;
}
function getScreenShakeMagnitude() {
  return screenShakeMagnitude;
}
var bossHold = false;
var bossHoldStartTime = 0;
var bossPause = false;
var bossPauseStartTime = 0;
var blinkingOut = false;
var blinkingOutStartTime = 0;
var carpshitsDuringBoss = false;
function setCarpshitsDuringBoss(val) {
  carpshitsDuringBoss = val;
}
function getCarpshitsDuringBoss() {
  return carpshitsDuringBoss;
}
function setBossActive(val) {
  bossActive = val;
}
function getBossActive() {
  return bossActive;
}
function setCurrentBoss(boss) {
  currentBoss = boss;
}
function getCurrentBoss() {
  return currentBoss;
}
function setBossTransition(val) {
  bossTransition = val;
}
function getBossTransition() {
  return bossTransition;
}
function setBossTransitionStartTime(val) {
  bossTransitionStartTime = val;
}
function getBossTransitionStartTime() {
  return bossTransitionStartTime;
}
function setScreenShake(val) {
  screenShake = val;
}
function getScreenShake() {
  return screenShake;
}
function setScreenShakeStartTime(val) {
  screenShakeStartTime = val;
}
function getScreenShakeStartTime() {
  return screenShakeStartTime;
}
function setBossHold(val) {
  bossHold = val;
}
function getBossHold() {
  return bossHold;
}
function setBossHoldStartTime(val) {
  bossHoldStartTime = val;
}
function getBossHoldStartTime() {
  return bossHoldStartTime;
}
function setBossPause(val) {
  bossPause = val;
}
function getBossPause() {
  return bossPause;
}
function setBossPauseStartTime(val) {
  bossPauseStartTime = val;
}
function getBossPauseStartTime() {
  return bossPauseStartTime;
}
function setBlinkingOut(val) {
  blinkingOut = val;
}
function getBlinkingOut() {
  return blinkingOut;
}
function setBlinkingOutStartTime(val) {
  blinkingOutStartTime = val;
}
function getBlinkingOutStartTime() {
  return blinkingOutStartTime;
}
var bossTriggered = false;
function setBossTriggered(val) {
  bossTriggered = val;
}
function getBossTriggered() {
  return bossTriggered;
}
var bossExit = false;
function setBossExit(val) {
  bossExit = val;
}
var bossExitDoorClosing = false;
var bossExitDoorStartTime = 0;
function setBossExitDoorClosing(val) {
  bossExitDoorClosing = val;
}
function getBossExitDoorClosing() {
  return bossExitDoorClosing;
}
function setBossExitDoorStartTime(val) {
  bossExitDoorStartTime = val;
}
function getBossExitDoorStartTime() {
  return bossExitDoorStartTime;
}
var congratsStartTime = 0;
function setCongratsStartTime(val) {
  congratsStartTime = val;
}
function getCongratsStartTime() {
  return congratsStartTime;
}
var gameStartTime = 0;
function setGameStartTime(val) {
  gameStartTime = val;
}
function getGameStartTime() {
  return gameStartTime;
}
var gameStopTime = 0;
function setGameStopTime(val) {
  gameStopTime = val;
}
function getGameStopTime() {
  return gameStopTime;
}
var bossShockedStartTime = 0;
function setBossShockedStartTime(val) {
  bossShockedStartTime = val;
}
function getBossShockedStartTime() {
  return bossShockedStartTime;
}
var autoRunLeft = false;
function setAutoRunLeft(val) {
  autoRunLeft = val;
}
function getAutoRunLeft() {
  return autoRunLeft;
}
var bossBattleStarted = false;
function setBossBattleStarted(val) {
  bossBattleStarted = val;
}
function getBossBattleStarted() {
  return bossBattleStarted;
}
function setFightBanner(val) {
  fightBannerActive = val;
}
function getFightBanner() {
  return fightBannerActive;
}
function setFightBannerStartTime(val) {
  fightBannerStartTime = val;
}
function getFightBannerStartTime() {
  return fightBannerStartTime;
}
var waveBannerActive = false;
var waveBannerStartTime = 0;
function setWaveBanner(val) {
  waveBannerActive = val;
}
function getWaveBanner() {
  return waveBannerActive;
}
function setWaveBannerStartTime(val) {
  waveBannerStartTime = val;
}
function getWaveBannerStartTime() {
  return waveBannerStartTime;
}
function playPlayerHitSound() {
  playerHitSound.currentTime = 0;
  playerHitSound.play();
}
var playerHitFlashActive = false;
var playerHitFlashEndTime = 0;
function setPlayerHitFlashActive(val) {
  playerHitFlashActive = val;
}
function setPlayerHitFlashEndTime(val) {
  playerHitFlashEndTime = val;
}
var backgroundFlickerMode = "default";
function setBackgroundFlickerMode(mode) {
  backgroundFlickerMode = mode;
}
function getBackgroundFlickerMode() {
  return backgroundFlickerMode;
}

// from the 2025 game: src/levels/rugcoAlley/background.js
var getBackgroundFlickerMode2 = getBackgroundFlickerMode;
var bgSprite = new Image();
bgSprite.src = "art/alley.webp";
var TOTAL_FRAMES = 10;
var FIRST_FLICKER_FRAMES = 2;
var TRANSITION_FRAMES = TOTAL_FRAMES - FIRST_FLICKER_FRAMES;
var OPEN_TRANSITION_DURATION = 13e3;
var CLOSE_TRANSITION_DURATION = 6e3;
var embers = [];
function spawnEmber(phase, canvas4) {
  let count = phase === 1 ? 0.1 : phase === 2 ? 0.2 : 0.4;
  if (Math.random() > count) return;
  const color = Math.random() < 0.5 ? "#ff6a00" : "#c22a00";
  embers.push({
    x: Math.floor(Math.random() * canvas4.width),
    y: -2,
    vy: 0.8 + Math.random() * (phase === 3 ? 1.2 : 0.6),
    // moderate fall
    vx: 0,
    // no drift
    alpha: 0.7 + Math.random() * 0.3,
    // vibrant
    size: 1 + Math.floor(Math.random() * 2),
    // 1-2px, more pixel-like
    color,
    life: 4e3 + Math.random() * 1e3,
    born: gameNow(),
    phase
  });
}
function drawAndUpdateEmbers(ctx4, canvas4, phase, now) {
  spawnEmber(phase, canvas4);
  if (embers.length > 200) embers.splice(0, embers.length - 200);
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    const age = now - e.born;
    if (age > e.life || e.y > canvas4.height + 2) {
      embers.splice(i, 1);
      continue;
    }
    const fade = 1 - age / e.life;
    const flicker = 0.8 + 0.2 * Math.sin(now / 60 + e.x * 0.5);
    ctx4.save();
    ctx4.globalAlpha = e.alpha * fade * flicker;
    ctx4.fillStyle = e.color;
    ctx4.fillRect(Math.round(e.x), Math.round(e.y), e.size, e.size);
    ctx4.restore();
    e.y += e.vy;
    e.x += e.vx;
  }
}
function drawRugcoBackground(ctx4, canvas4) {
  const now = gameNow();
  let phase = 1;
  try {
    const bossActive2 = getBossBattleStarted && getBossBattleStarted();
    if (bossActive2 && getCurrentBoss && getCurrentBoss()) {
      phase = getCurrentBoss().phase || 1;
    }
  } catch (e) {
  }
  if (getBossExitDoorClosing()) {
    const elapsed = now - getBossExitDoorStartTime();
    const framesToCycle = TOTAL_FRAMES;
    const transitionDuration = CLOSE_TRANSITION_DURATION;
    const interval = transitionDuration / framesToCycle;
    let idx = Math.floor(elapsed / interval);
    if (idx >= framesToCycle) idx = framesToCycle - 1;
    const frameIndex2 = framesToCycle - 1 - idx;
    ctx4.drawImage(
      bgSprite,
      frameIndex2 * canvas4.width,
      0,
      canvas4.width,
      canvas4.height,
      0,
      0,
      canvas4.width,
      canvas4.height
    );
    drawAndUpdateEmbers(ctx4, canvas4, phase, now);
    if (elapsed > transitionDuration) {
      setBossExitDoorClosing(false);
      setGameState("congrats");
      setCongratsStartTime(gameNow());
      setBossActive(false);
      setCurrentBoss(null);
    }
    return;
  }
  if (getBossTransition()) {
    const elapsed = now - getBossTransitionStartTime();
    const initialHold = 2e3;
    if (elapsed < initialHold) {
      const flickerInterval2 = 1e3 / 1.5;
      const fiIdx = Math.floor(now / flickerInterval2) % FIRST_FLICKER_FRAMES;
      ctx4.drawImage(
        bgSprite,
        fiIdx * canvas4.width,
        0,
        canvas4.width,
        canvas4.height,
        0,
        0,
        canvas4.width,
        canvas4.height
      );
      drawAndUpdateEmbers(ctx4, canvas4, phase, now);
      return;
    } else {
      const framesToCycle = TRANSITION_FRAMES;
      const transitionDuration = OPEN_TRANSITION_DURATION;
      const cycleDuration = transitionDuration - initialHold;
      const interval = cycleDuration / framesToCycle;
      let idx = Math.floor((elapsed - initialHold) / interval);
      if (idx >= framesToCycle) idx = framesToCycle - 1;
      const frameIndex2 = FIRST_FLICKER_FRAMES + idx;
      ctx4.drawImage(
        bgSprite,
        frameIndex2 * canvas4.width,
        0,
        canvas4.width,
        canvas4.height,
        0,
        0,
        canvas4.width,
        canvas4.height
      );
      drawAndUpdateEmbers(ctx4, canvas4, phase, now);
      return;
    }
  }
  const flickerMode = getBackgroundFlickerMode2();
  if (flickerMode === "doorOpenFlicker") {
    const lastA = FIRST_FLICKER_FRAMES + TRANSITION_FRAMES - 2;
    const lastB = FIRST_FLICKER_FRAMES + TRANSITION_FRAMES - 1;
    const flickerInterval2 = 500;
    const frameFlip = Math.floor(now / flickerInterval2) % 2;
    const frameIndex2 = frameFlip === 0 ? lastA : lastB;
    ctx4.drawImage(
      bgSprite,
      frameIndex2 * canvas4.width,
      0,
      canvas4.width,
      canvas4.height,
      0,
      0,
      canvas4.width,
      canvas4.height
    );
    drawAndUpdateEmbers(ctx4, canvas4, phase, now);
    return;
  }
  if (getBossPause()) {
    const flickerInterval2 = 1e3 / 1.5;
    const frameIndex2 = Math.floor(now / flickerInterval2) % 2;
    ctx4.drawImage(
      bgSprite,
      frameIndex2 * canvas4.width,
      0,
      canvas4.width,
      canvas4.height,
      0,
      0,
      canvas4.width,
      canvas4.height
    );
    drawAndUpdateEmbers(ctx4, canvas4, phase, now);
    return;
  }
  const flickerInterval = 1e3 / 1.5;
  const frameIndex = Math.floor(now / flickerInterval) % 2;
  ctx4.drawImage(
    bgSprite,
    frameIndex * canvas4.width,
    0,
    canvas4.width,
    canvas4.height,
    0,
    0,
    canvas4.width,
    canvas4.height
  );
  drawAndUpdateEmbers(ctx4, canvas4, phase, now);
}


// from the 2025 game: src/projectiles/playerBullets.js
var PlayerBullet = class {
  constructor(player2) {
    this.type = "player";
    const direction = player2.facing;
    const offsetX = direction === 1 ? player2.width - 6 : -6;
    const offsetY = player2.crouching ? player2.height / 2 : player2.height / 2 + 5;
    this.x = player2.x + offsetX;
    this.y = player2.crouching ? player2.feetY - player2.height + offsetY : player2.y + offsetY;
    this.vx = 10 * direction;
    this.vy = 0;
    player2.muzzleFlashTimer = 3;
    fireSound.currentTime = 0;
    fireSound.play();
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
  draw(ctx4) {
    lookShot(ctx4, this);
  }
};

// from the 2025 game: src/projectiles/rugfatherCarpets.js
var flameCarpetImg = new Image();
flameCarpetImg.src = "art/flaming-carpet.webp";
var PROJECTILE_HP = 2;
var PROJECTILE_SPEED = 5;
var PROJECTILE_DAMAGE = 1;
var SUMMON_GROW_DURATION = 300;
var RugfatherCarpet = class {
  constructor(x, y) {
    this.type = "boss";
    this.x = x;
    this.y = y;
    this.vx = -PROJECTILE_SPEED;
    this.vy = 0;
    this.sprite = flameCarpetImg;
    this.width = 128;
    this.height = 128;
    this.damage = PROJECTILE_DAMAGE;
    this.frameTimer = 0;
    this.hit = false;
    this.hp = PROJECTILE_HP;
    this.flashEndTime = 0;
    this.spawnTime = gameNow();
    this.scaleDuration = SUMMON_GROW_DURATION;
    this.trail = [{ x, y, time: gameNow() }];
    UnrugSound.play(fireSwooshUrl);
  }
  update() {
    const now = gameNow();
    const t = Math.min(1, (now - this.spawnTime) / this.scaleDuration);
    if (t < 1) {
      return;
    }
    this.x += this.vx;
    this.y += this.vy;
    this.trail.push({ x: this.x, y: this.y, time: now });
    this.trail = this.trail.filter((point) => now - point.time < 300);
  }
  /**
   * Get current scale from 0.25 to 1 over duration
   */
  getScale() {
    const now = gameNow();
    const t = Math.min(1, (now - this.spawnTime) / this.scaleDuration);
    return 0.25 + 0.75 * t;
  }
  /**
   * Get the collision hitbox for the carpet.
   */
  getHitbox() {
    const baseW = 70;
    const baseH = 50;
    const scale = this.getScale();
    const w = baseW * scale;
    const h = baseH * scale;
    return {
      x: this.x - w / 2,
      y: this.y - h / 2,
      width: w,
      height: h
    };
  }
  draw(ctx4, debug) {
    const now = gameNow();
    const flashActive2 = now < this.flashEndTime;
    const frameW = this.width;
    const frameH = this.height;
    const scale = this.getScale();
    let frame = 0;
    if (this.hit) {
      frame = 3;
    } else {
      this.frameTimer++;
      frame = Math.floor(this.frameTimer / 6) % 3;
    }
    const nowTrail = gameNow();
    for (const point of this.trail) {
      const age = nowTrail - point.time;
      const fade = 1 - age / 300;
      const flickerX = (Math.random() - 0.5) * 6 * fade;
      const flickerY = (Math.random() - 0.5) * 6 * fade;
      let color, radius, alpha;
      if (fade > 0.7) {
        color = "rgba(255,255,180,1)";
        radius = 13 * fade;
        alpha = 0.25 * fade;
      } else if (fade > 0.4) {
        color = "rgba(255,180,40,1)";
        radius = 10 * fade;
        alpha = 0.18 * fade;
      } else {
        color = "rgba(255,60,0,1)";
        radius = 7 * fade;
        alpha = 0.1 * fade;
      }
      ctx4.save();
      ctx4.globalAlpha = alpha;
      ctx4.beginPath();
      ctx4.arc(point.x + flickerX, point.y + flickerY, Math.max(radius * 1.5, 1), 0, 2 * Math.PI);
      ctx4.fillStyle = color;
      ctx4.shadowColor = color;
      ctx4.shadowBlur = 16;
      ctx4.fill();
      ctx4.restore();
      ctx4.save();
      ctx4.globalAlpha = alpha * 1.5;
      ctx4.beginPath();
      ctx4.arc(point.x + flickerX, point.y + flickerY, Math.max(radius * 0.7, 1), 0, 2 * Math.PI);
      ctx4.fillStyle = color;
      ctx4.shadowColor = color;
      ctx4.shadowBlur = 4;
      ctx4.fill();
      ctx4.restore();
    }
    ctx4.save();
    if (flashActive2) ctx4.filter = "brightness(2)";
    ctx4.translate(this.x, this.y);
    const sx = this.vx > 0 ? -scale : scale;
    ctx4.scale(sx, scale);
    ctx4.drawImage(
      this.sprite,
      frame * frameW,
      0,
      frameW,
      frameH,
      -frameW / 2,
      -frameH / 2,
      frameW,
      frameH
    );
    ctx4.filter = "none";
    ctx4.restore();
    if (debug) {
      const hb = this.getHitbox();
      ctx4.save();
      ctx4.strokeStyle = "orange";
      ctx4.lineWidth = 2;
      ctx4.strokeRect(hb.x, hb.y, hb.width, hb.height);
      ctx4.restore();
    }
  }
};

// from the 2025 game: src/projectiles/index.js
var projectiles = [];
function updateProjectiles(canvasWidth) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.update();
    if (p.x < 0 || p.x > canvasWidth) {
      projectiles.splice(i, 1);
    }
  }
}
function spawnPlayerBullet(player2) {
  projectiles.push(new PlayerBullet(player2));
}
function spawnRugfatherCarpet(x, y) {
  projectiles.push(new RugfatherCarpet(x, y));
}


// from the 2025 game: src/constants/physics.js
var GRAVITY = 0.6;

// from the 2025 game: src/utils/sceneUtils.js
function clearEntities(...arrays) {
  arrays.forEach((arr) => {
    if (Array.isArray(arr)) {
      arr.length = 0;
    }
  });
}
