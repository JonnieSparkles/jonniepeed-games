// The leaderboard this copy posts to (scores/games.json; docs/games/unruggabull-remastered/README.md).
const BOARD = 1;

// from the 2025 game: src/physics.js
var PLATFORM_WIDTH = 120;
var PLATFORM_HEIGHT = 16;
var platforms = [];
function generatePlatforms() {
  const levelConfig2 = levels_default[getCurrentLevelKey()];
  const levelPlatforms = levelConfig2.platforms || [];
  platforms.length = 0;
  levelPlatforms.forEach((p) => platforms.push(p));
}
function handlePhysics(player2, platforms2, canvas4) {
  const levelConfig2 = levels_default[getCurrentLevelKey()];
  player2.vy += GRAVITY;
  player2.x += player2.vx;
  player2.feetY += player2.vy;
  player2.y = player2.feetY - PLAYER_HEIGHT;
  let onPlatform = false;
  if (player2.vy >= 0) {
    for (const p of platforms2) {
      if (player2.feetY <= p.y + player2.vy && player2.feetY + player2.vy >= p.y && player2.x + PLAYER_WIDTH > p.x && player2.x < p.x + p.width) {
        player2.feetY = p.y;
        player2.vy = 0;
        player2.jumping = false;
        player2.grounded = true;
        player2.y = player2.feetY - PLAYER_HEIGHT;
        onPlatform = true;
        break;
      }
    }
  }
  if (!onPlatform) {
    const floorY2 = levelConfig2.floorY;
    if (player2.feetY >= floorY2) {
      player2.feetY = floorY2;
      player2.vy = 0;
      player2.jumping = false;
      player2.grounded = true;
      player2.y = player2.feetY - PLAYER_HEIGHT;
    } else {
      player2.grounded = false;
    }
  }
  if (levelConfig2.wrapHorizontal) {
    if (player2.x + PLAYER_WIDTH < 0) {
      player2.x = canvas4.width;
    } else if (player2.x > canvas4.width) {
      player2.x = -PLAYER_WIDTH;
    }
  } else {
    if (player2.x < 0) {
      player2.x = 0;
    } else if (player2.x + PLAYER_WIDTH > canvas4.width) {
      player2.x = canvas4.width - PLAYER_WIDTH;
    }
  }
  if (player2.vx !== 0) {
    player2.frame = (player2.frame + 1) % 40;
  } else {
    player2.frame = 0;
  }
}
function drawPlatforms(ctx4, platforms2) {
  lookPlatforms(ctx4, platforms2);
}

// from the 2025 game: src/levels/rugcoAlley/config.js
var config_default = {
  key: "rugcoAlley",
  name: "RUGCO ALLEY",
  background: drawRugcoBackground,
  boss: rugfather_default,
  music: "sound/alley-theme.mp3",
  floorY: 520,
  wrapHorizontal: false,
  bossTriggerDifficulty: 6,
  phaseChangeKillCount: 15,
  platforms: [
    { x: 200, y: 450, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT },
    { x: 450, y: 270, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT },
    { x: 320, y: 300, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT },
    { x: 400, y: 400, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT }
  ]
};

// from the 2025 game: src/levels/index.js
var levels = {
  rugcoAlley: config_default
};
var levels_default = levels;

// from the 2025 game: src/enemies/carpshits.js
var canvas2 = document.getElementById("gameCanvas");
var ctx2 = canvas2.getContext("2d");
var carpshitSprite = new Image();
carpshitSprite.src = "art/carpshit.webp";
var CARPSHIT_SPRITE_WIDTH = 64;
var CARPSHIT_SPRITE_HEIGHT = 50;
var levelConfig = levels_default[getCurrentLevelKey()];
var floorY = levelConfig.floorY;
var upperSpawnMinY = canvas2.height * 0.1;
var upperSpawnMaxY = canvas2.height * 0.6;
var lowerSpawnMinY = canvas2.height * 0.6;
var lowerSpawnMaxY = floorY - 48;
var NUM_CARPSHITS = 3;
var carpshits = Array.from({ length: NUM_CARPSHITS }, () => ({
  x: canvas2.width + 48 + Math.random() * 200,
  y: upperSpawnMinY + Math.random() * (upperSpawnMaxY - upperSpawnMinY),
  vx: -getUpperSpeed(),
  alive: true,
  frame: 0,
  frameTimer: 0,
  falling: false,
  vy: 0,
  onFloor: false,
  respawnTimer: 0,
  damage: 1
  // Default damage for carpshits
}));
var NUM_LOWER_CARPSHITS = 2;
var lowerCarpshits = Array.from({ length: NUM_LOWER_CARPSHITS }, () => ({
  x: canvas2.width + 48 + Math.random() * 200,
  y: lowerSpawnMinY + Math.random() * (lowerSpawnMaxY - lowerSpawnMinY),
  vx: -getLowerSpeed(),
  alive: true,
  frame: 0,
  frameTimer: 0,
  falling: false,
  vy: 0,
  onFloor: false,
  respawnTimer: 0,
  damage: 1
  // Default damage for lower carpshits
}));
function getUpperSpeed() {
  const base = 1.5 + Math.random();
  return base * (1 + (difficultyLevel - 1) * 0.15);
}
function getLowerSpeed() {
  const base = 1 + Math.random() * 1.2;
  return base * (1 + (difficultyLevel - 1) * 0.15);
}
function getRespawnDelay() {
  const base = Math.max(500, 2e3 - (difficultyLevel - 1) * 300);
  return base + Math.random() * base;
}
var nextUpperSpawn = gameNow() + getRespawnDelay();
var nextLowerSpawn = gameNow() + getRespawnDelay();
var floorClearInterval = 5e3;
var nextUpperClear = gameNow() + floorClearInterval;
var nextLowerClear = gameNow() + floorClearInterval;
function getCarpshitHitbox(carpshit) {
  const y = !carpshit.alive && carpshit.onFloor ? carpshit.y + 12 : carpshit.y;
  return {
    x: carpshit.x,
    y,
    width: CARPSHIT_SPRITE_WIDTH,
    height: CARPSHIT_SPRITE_HEIGHT
  };
}
function spawnCarpshit() {
  let fromLeft = false;
  if (difficultyLevel >= 2) fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -48 - Math.random() * 200 : canvas2.width + 48 + Math.random() * 200;
  const speed = getUpperSpeed();
  const vx = fromLeft ? speed : -speed;
  carpshits.push({
    x,
    y: upperSpawnMinY + Math.random() * (upperSpawnMaxY - upperSpawnMinY),
    swoop: difficultyLevel >= 4 && Math.random() < 0.3,
    swoopStart: gameNow(),
    swoopAmplitude: (upperSpawnMaxY - upperSpawnMinY) / 2,
    swoopBaseY: (upperSpawnMaxY + upperSpawnMinY) / 2,
    swoopPeriod: 1500,
    vx,
    alive: true,
    frame: 0,
    frameTimer: 0,
    falling: false,
    vy: 0,
    onFloor: false,
    respawnTimer: 0
  });
}
function spawnLowerCarpshit() {
  let fromLeft = false;
  if (difficultyLevel >= 2) fromLeft = Math.random() < 0.5;
  const x = fromLeft ? -48 - Math.random() * 200 : canvas2.width + 48 + Math.random() * 200;
  const speed = getLowerSpeed();
  const vx = fromLeft ? speed : -speed;
  lowerCarpshits.push({
    x,
    y: lowerSpawnMinY + Math.random() * (lowerSpawnMaxY - lowerSpawnMinY),
    swoop: difficultyLevel >= 4 && Math.random() < 0.3,
    swoopStart: gameNow(),
    swoopAmplitude: (lowerSpawnMaxY - lowerSpawnMinY) / 2,
    swoopBaseY: (lowerSpawnMaxY + lowerSpawnMinY) / 2,
    swoopPeriod: 1500,
    vx,
    alive: true,
    frame: 0,
    frameTimer: 0,
    falling: false,
    vy: 0,
    onFloor: false,
    respawnTimer: 0
  });
}
function updateCarpshits() {
  carpshits.forEach((carpshit) => {
    if (carpshit.falling) {
      carpshit.vy += 0.7;
      carpshit.y += carpshit.vy;
      const thresholdY = floorY - 48;
      if (carpshit.y >= thresholdY) {
        carpshit.y = thresholdY;
        carpshit.falling = false;
        carpshit.onFloor = true;
        carpshit.respawnTimer = gameNow();
      }
      return;
    }
    if (!carpshit.alive) return;
    if (carpshit.alive) {
      carpshit.x += carpshit.vx;
      carpshit.frameTimer++;
      if (carpshit.frameTimer > 8) {
        carpshit.frame = (carpshit.frame + 1) % 3;
        carpshit.frameTimer = 0;
      }
      if (carpshit.vx < 0 && carpshit.x < -48) {
        carpshit.x = canvas2.width + 48;
      } else if (carpshit.vx > 0 && carpshit.x > canvas2.width + 48) {
        carpshit.x = -48;
      }
    }
    if (carpshit.swoop) {
      const t = gameNow() - carpshit.swoopStart;
      carpshit.y = carpshit.swoopBaseY + Math.sin(t / carpshit.swoopPeriod * 2 * Math.PI) * carpshit.swoopAmplitude;
    }
  });
  const now = gameNow();
  if (now >= nextUpperClear) {
    for (let i = carpshits.length - 1; i >= 0; i--) {
      const c = carpshits[i];
      if (!c.alive && c.onFloor) carpshits.splice(i, 1);
    }
    nextUpperClear = now + floorClearInterval;
  }
  if (!getCarpshitsDuringBoss() && now >= nextUpperSpawn) {
    spawnCarpshit();
    nextUpperSpawn = now + getRespawnDelay();
  }
}
// drawn through fx.js: shadows, tilt, the swoop warning, and torn apart when unrugged
function drawCarpshits() {
  carpshits.forEach((carpshit) => {
    if (!carpshit.alive && !carpshit.falling && !carpshit.onFloor) return;
    fxDrawCarpshit(ctx2, carpshit);
  });
}
function updateLowerCarpshits() {
  lowerCarpshits.forEach((carpshit) => {
    if (carpshit.falling) {
      carpshit.vy += 0.7;
      carpshit.y += carpshit.vy;
      const thresholdY = floorY - 48;
      if (carpshit.y >= thresholdY) {
        carpshit.y = thresholdY;
        carpshit.falling = false;
        carpshit.onFloor = true;
        carpshit.respawnTimer = gameNow();
      }
      return;
    }
    if (!carpshit.alive) return;
    if (carpshit.alive) {
      carpshit.x += carpshit.vx;
      carpshit.frameTimer++;
      if (carpshit.frameTimer > 8) {
        carpshit.frame = (carpshit.frame + 1) % 3;
        carpshit.frameTimer = 0;
      }
      if (carpshit.vx < 0 && carpshit.x < -48) {
        carpshit.x = canvas2.width + 48;
      } else if (carpshit.vx > 0 && carpshit.x > canvas2.width + 48) {
        carpshit.x = -48;
      }
    }
    if (carpshit.swoop) {
      const t = gameNow() - carpshit.swoopStart;
      carpshit.y = carpshit.swoopBaseY + Math.sin(t / carpshit.swoopPeriod * 2 * Math.PI) * carpshit.swoopAmplitude;
    }
  });
  const nowL = gameNow();
  if (nowL >= nextLowerClear) {
    for (let i = lowerCarpshits.length - 1; i >= 0; i--) {
      const c = lowerCarpshits[i];
      if (!c.alive && c.onFloor) lowerCarpshits.splice(i, 1);
    }
    nextLowerClear = nowL + floorClearInterval;
  }
  if (!getCarpshitsDuringBoss() && nowL >= nextLowerSpawn) {
    spawnLowerCarpshit();
    nextLowerSpawn = nowL + getRespawnDelay();
  }
}
function drawLowerCarpshits() {
  lowerCarpshits.forEach((carpshit) => {
    if (!carpshit.alive && !carpshit.falling && !carpshit.onFloor) return;
    fxDrawCarpshit(ctx2, carpshit);
  });
}

// from the 2025 game: src/collision.js
function checkBulletcarpshitCollisions(bullets2, carpshits2, onKill) {
  for (let i = bullets2.length - 1; i >= 0; i--) {
    const bullet = bullets2[i];
    const isBossProjectile = bullet.type === "boss";
    if (isBossProjectile) continue;
    for (let j = carpshits2.length - 1; j >= 0; j--) {
      const carpshit = carpshits2[j];
      if (!carpshit.alive) continue;
      const { x: cx, y: cy, width: cw, height: ch } = getCarpshitHitbox(carpshit);
      if (bullet.x > cx && bullet.x < cx + cw && bullet.y > cy && bullet.y < cy + ch) {
        onKill(bullets2, i, carpshit);
        break;
      }
    }
  }
}
function checkBulletLowercarpshitCollisions(bullets2, carpshits2, onKill) {
  checkBulletcarpshitCollisions(bullets2, carpshits2, onKill);
}
function checkPlayercarpshitCollisions(player2, carpshits2, onHit) {
  if (!player2 || typeof onHit !== "function") return;
  for (let j = carpshits2.length - 1; j >= 0; j--) {
    const carpshit = carpshits2[j];
    if (!carpshit.alive) continue;
    const { x: hx, y: hy, width: hw, height: hh } = getHitbox(player2);
    const { x: cx, y: cy, width: cw, height: ch } = getCarpshitHitbox(carpshit);
    if (hx + hw > cx && hx < cx + cw && hy + hh > cy && hy < cy + ch) {
      onHit(carpshit);
    }
  }
}

// from the 2025 game: src/callbacks.js
function handleBulletKill(bullets2, index, carpshit) {
  if (bullets2[index]) lookAddSparks(bullets2[index].x, bullets2[index].y);
  carpshit.tearFrame = carpshit.frame;
  carpshit.killedAt = gameNow();
  carpshit.alive = false;
  carpshit.frame = 3;
  carpshit.falling = true;
  carpshit.vy = 0;
  carpshitDeathSound.pan = ((carpshit.x + 32) / 480 - 1) * 0.7;
  carpshitDeathSound.currentTime = 0;
  carpshitDeathSound.play();
  bullets2.splice(index, 1);
  incrementKillCount();
  if (getKillCount() === nextPhaseKillCount) {
    setFlashActive(true);
    setFlashEndTime(gameNow() + FLASH_DURATION);
    const levelConfig2 = levels_default[getCurrentLevelKey()];
    const maxWaves = levelConfig2.bossTriggerDifficulty - 1;
    if (difficultyLevel + 1 < levelConfig2.bossTriggerDifficulty) {
      const sound = difficultyIncreaseSounds[Math.floor(Math.random() * difficultyIncreaseSounds.length)];
      sound.currentTime = 0;
      sound.play();
      UnrugSfx.sting();
      increaseDifficulty();
    } else {
      setDifficultyLevel(difficultyLevel + 1);
      setNextPhaseKillCount(nextPhaseKillCount + PHASE_CHANGE_KILL_COUNT);
    }
    setWaveBanner(true);
    setWaveBannerStartTime(gameNow());
  }
}
function handlePlayerHit(carpshit) {
  if (player.invulnerable) return;
  const damage = typeof carpshit.damage === "number" ? carpshit.damage : 1;
  player.health -= damage;
  player.invulnerable = true;
  player.invulnerableUntil = gameNow() + 1500;
  if (player.health <= 0) {
    player.sprite = "dead";
    player.width = 128;
  }
  fxBullHit(carpshit.x + 32);
  carpshit.tearFrame = carpshit.frame;
  carpshit.killedAt = gameNow();
  carpshit.alive = false;
  carpshit.frame = 3;
  carpshit.falling = true;
  carpshit.vy = 0;
  carpshitDeathSound.pan = ((carpshit.x + 32) / 480 - 1) * 0.7;
  carpshitDeathSound.currentTime = 0;
  carpshitDeathSound.play();
  const duration = FLASH_DURATION;
  setFlashActive(true);
  setFlashEndTime(gameNow() + duration);
  setFlashColor("rgba(255,0,0,0.5)");
  playPlayerHitSound();
  setPlayerHitFlashActive(true);
  setPlayerHitFlashEndTime(gameNow() + duration);
  player.sprite = "hit";
  player.hitHoldUntil = gameNow() + duration;
  if (player.health <= 0) {
    if (!gameState.includes("over") && gameState !== "dying") {
      gameOverSound.currentTime = 0;
      gameOverSound.play();
      setGameState("dying");
      setDyingStartTime(null);
    }
  }
}
function handleCarpetHit(projectiles2, index, carpet) {
  if (player.invulnerable) return;
  const damage = typeof carpet.damage === "number" ? carpet.damage : 1;
  player.health -= damage;
  player.invulnerable = true;
  player.invulnerableUntil = gameNow() + INVULNERABLE_TIME;
  if (player.health <= 0) {
    player.sprite = "dead";
    player.width = 128;
  }
  fxBullHit(carpet.x);
  carpet.hit = true;
  carpet.vx = 0;
  carpet.vy = 0;
  gameTimeout(() => {
    const idx = projectiles2.indexOf(carpet);
    if (idx >= 0) projectiles2.splice(idx, 1);
  }, 500);
  setFlashActive(true);
  setFlashColor("rgba(255,0,0,0.5)");
  setFlashEndTime(gameNow() + FLASH_DURATION);
  playPlayerHitSound();
  setPlayerHitFlashActive(true);
  setPlayerHitFlashEndTime(gameNow() + FLASH_DURATION);
  player.sprite = "hit";
  player.hitHoldUntil = gameNow() + FLASH_DURATION;
  if (player.health <= 0 && !gameState.includes("over") && gameState !== "dying") {
    gameOverSound.currentTime = 0;
    gameOverSound.play();
    setGameState("dying");
    setDyingStartTime(null);
  }
}


// from the 2025 game: src/update.js
function updateGame(bullets2, canvas4) {
  const now = gameNow();
  if (player.invulnerable && player.invulnerableUntil != null && now > player.invulnerableUntil) {
    player.invulnerable = false;
    player.invulnerableUntil = null;
  }
  const bossEntity = getCurrentBoss && getCurrentBoss();
  if (bossEntity && bossEntity.dying) {
    if (!updateGame._defeatSceneStarted) {
      launchRugfatherDefeatScene();
      setGameStopTime(now);
      updateGame._defeatSceneStarted = true;
    }
    updateRugfatherDefeatScene(now);
    return;
  }
  const levelConfig2 = levels_default[getCurrentLevelKey()];
  if (getBossTriggered() && !getBossBattleStarted()) {
    updateBossIntro(now);
    return;
  }
  if (gameState === "dying") {
    player.sprite = "dead";
    player.width = 128;
    player.invulnerable = false;
    player.invulnerableUntil = null;
    player.hitHoldUntil = null;
    const floorY2 = levelConfig2.floorY;
    if (player.feetY < floorY2) {
      player.vy += 1.2;
      player.feetY += player.vy;
      if (player.feetY > floorY2) {
        player.feetY = floorY2;
        player.vy = 0;
        if (!getDyingStartTime()) setDyingStartTime(gameNow());
      }
    } else {
      if (!getDyingStartTime()) setDyingStartTime(gameNow());
      if (gameNow() - getDyingStartTime() > 1e3) {
        setGameState("gameover");
      }
    }
    return;
  }
  if (gameState !== "playing") return;
  if (player.blasterEnergy < player.blasterMaxEnergy) {
    const rechargeElapsed = now - player.blasterLastRechargeTime;
    const chargesToAdd = Math.floor(rechargeElapsed / BLASTER_RECHARGE_INTERVAL);
    if (chargesToAdd > 0) {
      player.blasterEnergy = Math.min(player.blasterEnergy + chargesToAdd, player.blasterMaxEnergy);
      player.blasterLastRechargeTime += chargesToAdd * BLASTER_RECHARGE_INTERVAL;
    }
  }
  if (player.invulnerable && player.invulnerableUntil != null && now > player.invulnerableUntil) {
    player.invulnerable = false;
    player.invulnerableUntil = null;
  }
  if (!getBossHold() && !getBossTransition() && !getBossActive() && !getBossTriggered() && difficultyLevel >= levelConfig2.bossTriggerDifficulty) {
    if (player.health === PLAYER_START_HEALTH) {
      flawlessVictorySound.currentTime = 0;
      flawlessVictorySound.play();
    }
    setBossHold(true);
    setBossTriggered(true);
    startBossIntro();
    setBossHoldStartTime(now);
    bgMusic.pause();
    setFlashActive(true);
    setFlashEndTime(now + FLASH_DURATION);
    setScreenShake(true);
    setScreenShakeStartTime(now);
    player.shockedFrame = 0;
    player.shockedFrameTimer = 0;
  }
  if (getBossHold()) {
    const floorY2 = levelConfig2.floorY;
    if (player.feetY < floorY2) {
      player.vy += 0.7;
      player.feetY += player.vy;
      if (player.feetY >= floorY2) {
        player.feetY = floorY2;
        player.vy = 0;
        player.grounded = true;
      }
      player.y = player.feetY - player.height;
    }
    const centerX = Math.round(canvas4.width / 2 - player.width / 2);
    const walkSpeed = 4;
    if (Math.abs(player.x - centerX) > 2) {
      player.x += player.x < centerX ? walkSpeed : -walkSpeed;
      player.facing = player.x < centerX ? 1 : -1;
      player.shockedFrame = 0;
      player.shockedFrameTimer = 0;
      player.frame = (player.frame + 1) % 40;
    } else {
      player.x = centerX;
      player.shockedFrame = 0;
      player.shockedFrameTimer = 0;
      if (!getBossPause()) {
        setBossPause(true);
        setBossPauseStartTime(now);
      }
      if (getBossPause()) {
        if (now - getBossPauseStartTime() < void 0) {
          return;
        } else {
          setBossPause(false);
        }
      }
    }
    const elapsedHold = now - getBossHoldStartTime();
    if (elapsedHold > void 0) {
      setBossHold(false);
      setBossTransition(true);
      setBossTransitionStartTime(now);
      setBlinkingOut(true);
      setBlinkingOutStartTime(now);
      garageDoorSound.currentTime = 0;
      garageDoorSound.play();
      setBossShockedStartTime(now + 300);
    }
    return;
  }
  if (getBlinkingOut()) {
    if (gameNow() - getBlinkingOutStartTime() > void 0) {
      clearEntities(carpshits, lowerCarpshits, platforms, bullets2);
      setBlinkingOut(false);
    }
  }
  if (getBossTransition()) {
    const centerX = Math.round(canvas4.width / 2 - player.width / 2);
    const walkSpeed = 4;
    if (Math.abs(player.x - centerX) > 2) {
      player.x += player.x < centerX ? walkSpeed : -walkSpeed;
      player.facing = player.x < centerX ? 1 : -1;
      player.shockedFrame = 0;
      player.shockedFrameTimer = 0;
      player.frame = (player.frame + 1) % 40;
    } else {
      player.x = centerX;
      if (now >= getBossShockedStartTime()) {
        player.shockedFrameTimer++;
        if (player.shockedFrameTimer > 10) {
          player.shockedFrame = (player.shockedFrame + 1) % 4;
          player.shockedFrameTimer = 0;
        }
      } else {
        player.shockedFrame = 0;
        player.shockedFrameTimer = 0;
      }
    }
    const elapsed = now - getBossTransitionStartTime();
    const framesToCycle = 6;
    const transitionDuration = 13e3;
    const interval = transitionDuration / framesToCycle;
    if (elapsed > interval * framesToCycle) {
      setBossTransition(false);
      setBossActive(true);
      if (gameState !== "congrats") {
        setCurrentBoss(levels_default[getCurrentLevelKey()].boss);
        getCurrentBoss().spawn();
      }
      const levelConfig3 = levels_default[getCurrentLevelKey()];
      bgMusic.src = levelConfig3.music;
      bgMusic.currentTime = 0;
      bgMusic.play();
      setAutoRunLeft(false);
    }
    return;
  }
  if (getCurrentBoss()) {
    getCurrentBoss().update();
  }
  if (getCurrentBoss() && !getBossBattleStarted()) {
    if (getAutoRunLeft()) {
      const safeX = 32;
      player.x -= player.speed;
      player.facing = -1;
      player.frame = (player.frame + 1) % 40;
      if (player.x <= safeX) {
        player.x = safeX;
        setAutoRunLeft(false);
      }
    }
    return;
  }
  updatePlayerInput();
  handlePhysics(player, platforms, canvas4);
  fxBullStep(player);
  if (inputFire() && !player.firing) {
    if (player.blasterEnergy > 0) {
      player.blasterEnergy--;
      spawnPlayerBullet(player);
    } else {
      player.blasterEmptyFlashEndTime = now + BLASTER_EMPTY_FLASH_DURATION;
      // the 2025 buzz, behind a trigger click and sagging as it fades (audio.js)
      UnrugSfx.empty();
    }
    player.firing = true;
  } else if (!inputFire()) {
    player.firing = false;
  }
  if (player.hitHoldUntil && now < player.hitHoldUntil) {
    player.sprite = "hit";
  } else {
    if (player.health <= 0) {
      player.sprite = "dead";
      player.width = 128;
    } else {
      if (player.width !== 64) player.width = 64;
      if (player.firing) {
        if (player.crouching) {
          player.sprite = "crouchFire";
        } else {
          player.sprite = "fire";
        }
      } else if (!player.grounded && !player.crouching) {
        player.sprite = "jump";
      } else if (player.crouching) {
        if (player.vx !== 0) {
          player.sprite = "crouch";
        } else {
          player.sprite = "crouchIdle";
        }
      } else if (player.vx !== 0) {
        player.sprite = "walk";
      } else {
        player.sprite = "idle";
      }
    }
  }
  updateProjectiles(canvas4.width);
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.type === "boss" && typeof p.getHitbox === "function") {
      const projHitbox = p.getHitbox();
      for (let j = projectiles.length - 1; j >= 0; j--) {
        const b = projectiles[j];
        if (b.type === "player") {
          if (b.x > projHitbox.x && b.x < projHitbox.x + projHitbox.width && b.y > projHitbox.y && b.y < projHitbox.y + projHitbox.height) {
            projectiles.splice(j, 1);
            p.hp -= 1;
            if (p.hp > 0) {
              p.flashEndTime = gameNow() + FLASH_DURATION;
              p.jolt = -Math.sign(p.vx) * 9;
              UnrugSfx.tick();
            } else {
              p.hit = true;
              p.vx = 0;
              p.vy = 0;
              gameTimeout(() => {
                const idx2 = projectiles.indexOf(p);
                if (idx2 >= 0) projectiles.splice(idx2, 1);
              }, 500);
            }
            break;
          }
        }
      }
    }
  }
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (typeof p.getHitbox === "function") {
      const projHitbox = p.getHitbox();
      const playerHitbox = getHitbox(player);
      if (projHitbox.x < playerHitbox.x + playerHitbox.width && projHitbox.x + projHitbox.width > playerHitbox.x && projHitbox.y < playerHitbox.y + playerHitbox.height && projHitbox.y + projHitbox.height > playerHitbox.y) {
        handleCarpetHit(projectiles, i, p);
      }
    }
  }
  if (getCurrentBoss()) {
    const boss = getCurrentBoss();
    boss.update();
    if (!boss.dying) {
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const bullet = projectiles[i];
        const isBossProjectile = bullet.type === "boss";
        if (!isBossProjectile && checkBossBulletCollision(bullet)) {
          boss.hit(1);
          projectiles.splice(i, 1);
        }
      }
    }
  }
  const bossEntityCollision = getCurrentBoss();
  if (bossEntityCollision && getBossBattleStarted() && !bossEntityCollision.dying) {
    const bossHitbox = bossEntityCollision.getHitbox();
    const playerHitbox = getHitbox(player);
    if (playerHitbox.x < bossHitbox.x + bossHitbox.width && playerHitbox.x + playerHitbox.width > bossHitbox.x && playerHitbox.y < bossHitbox.y + bossHitbox.height && playerHitbox.y + playerHitbox.height > bossHitbox.y) {
      if (!player.invulnerable) {
        player.health--;
        player.invulnerable = true;
        player.invulnerableUntil = gameNow() + INVULNERABLE_TIME;
        fxBullHit(bossHitbox.x + bossHitbox.width / 2);
        setFlashActive(true);
        setFlashColor("rgba(255,0,0,0.5)");
        setFlashEndTime(gameNow() + FLASH_DURATION);
        playPlayerHitSound();
        setPlayerHitFlashActive(true);
        setPlayerHitFlashEndTime(gameNow() + FLASH_DURATION);
        if (player.health <= 0 && getGameState() !== "dying") {
          setGameState("dying");
          setDyingStartTime(null);
        }
      }
    }
  }
  if (!getBossTransition() && !getBossActive() || getCarpshitsDuringBoss()) {
    updateCarpshits();
    checkBulletcarpshitCollisions(projectiles, carpshits, handleBulletKill);
    updateLowerCarpshits();
    checkBulletLowercarpshitCollisions(projectiles, lowerCarpshits, handleBulletKill);
    checkPlayercarpshitCollisions(player, carpshits, handlePlayerHit);
    checkPlayercarpshitCollisions(player, lowerCarpshits, handlePlayerHit);
  }
}

// from the 2025 game: src/ui.js

// from the 2025 game: src/assets.js
var playerMasterSprite = new Image();
playerMasterSprite.src = "art/bull.webp";
var deadSprite = new Image();
deadSprite.src = "art/bull-dead.webp";
var carpshitSprite2 = new Image();
carpshitSprite2.src = "art/carpshit.webp";
var blasterIcon = new Image();
blasterIcon.src = "art/blaster-icon.webp";
var heartIcon = new Image();
heartIcon.src = "art/heart-icon.webp";


// from the 2025 game: src/playerSprites.js
var PLAYER_SPRITES = {
  idle: { image: playerMasterSprite, animated: false, frame: 0, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  walk: { image: playerMasterSprite, animated: true, frameSequence: [
    { frame: 0, mirror: false },
    { frame: 1, mirror: false },
    { frame: 2, mirror: false },
    { frame: 3, mirror: false }
  ], frameDuration: 100, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  crouch: { image: playerMasterSprite, animated: true, frameSequence: [
    { frame: 5, mirror: false },
    { frame: 6, mirror: false },
    { frame: 7, mirror: false },
    { frame: 8, mirror: false }
  ], frameDuration: 100, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  crouchIdle: { image: playerMasterSprite, animated: false, frame: 5, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  jump: { image: playerMasterSprite, animated: false, frame: 4, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  shocked: { image: playerMasterSprite, animated: true, frameSequence: [
    { frame: 13, mirror: false },
    { frame: 14, mirror: false },
    { frame: 15, mirror: false },
    { frame: 16, mirror: false }
  ], frameDuration: 150, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  hit: { image: playerMasterSprite, animated: false, frame: 17, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  walkForward: { image: playerMasterSprite, animated: true, frameSequence: [
    { frame: 9, mirror: false },
    { frame: 10, mirror: false },
    { frame: 11, mirror: false },
    { frame: 12, mirror: false }
  ], frameDuration: 100, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  lookForward: { image: playerMasterSprite, animated: false, frame: 13, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  dead: { image: deadSprite, animated: false, frame: 0, offsetY: 0, frameWidth: 128, frameHeight: 96 },
  fire: { image: playerMasterSprite, animated: false, frame: 3, offsetY: 0, frameWidth: 64, frameHeight: 96 },
  crouchFire: { image: playerMasterSprite, animated: false, frame: 8, offsetY: 0, frameWidth: 64, frameHeight: 96 }
};

// from the 2025 game: src/render.js
// The 2025 renderGame drew the HUD under the sprites and froze the screen under "FIGHT!". The remaster draws
// the scene, then the HUD and banners on top of it, steady while the screen shakes.
function renderGame(ctx4, canvas4, bullets2, player2, restartButton2, isRestartHover2) {
  renderScene(ctx4, canvas4, bullets2, player2, restartButton2, isRestartHover2);
  if (gameState !== "controls") fxGrit(ctx4);
  fxScreenFlash(ctx4);
  if (gameState === "controls" || gameState === "congrats" || gameState.includes("over")) return;
  const now = gameNow();
  const maxWaves = levels_default[getCurrentLevelKey()].bossTriggerDifficulty - 1;
  const showCount = !getBossHold() && !getBossPause() && !getBossTransition() && !getBossActive();
  lookHud(ctx4, player2, killCount, difficultyLevel, maxWaves, showCount, now);
  if (getBossActive() && getCurrentBoss() && getBossBattleStarted() && !__bossState.dying) lookBossBar(ctx4, __bossState.hp, MAX_HP);
  if (getWaveBanner && getWaveBanner()) {
    const elapsed = now - getWaveBannerStartTime();
    if (elapsed < 1e3 && difficultyLevel <= maxWaves) lookBanner(ctx4, "WAVE " + difficultyLevel + "/" + maxWaves, elapsed);
    else setWaveBanner(false);
  }
  if (getFightBanner && getFightBanner()) {
    const elapsed = now - getFightBannerStartTime();
    if (elapsed < 1e3) lookBanner(ctx4, "FIGHT!", elapsed);
    else setFightBanner(false);
  }
}
function renderScene(ctx4, canvas4, bullets2, player2, restartButton2, isRestartHover2) {
  const now = gameNow();
  ctx4.save();
  let shouldReturn = false;
  let shaking = false;
  if (getScreenShake()) {
    const elapsedShake = now - getScreenShakeStartTime();
    if (elapsedShake > SCREEN_SHAKE_DURATION) {
      setScreenShake(false);
    } else {
      shaking = true;
      ctx4.save();
      const magnitude = getScreenShakeMagnitude();
      const dx = (Math.random() * 2 - 1) * magnitude;
      const dy = (Math.random() * 2 - 1) * magnitude;
      ctx4.translate(dx, dy);
    }
  }
  const fxs = fxShakeOffset();
  if (fxs) {
    if (!shaking) { shaking = true; ctx4.save(); }
    ctx4.translate(fxs.x, fxs.y);
  }
  ctx4.clearRect(0, 0, canvas4.width, canvas4.height);
  const levelConfig2 = levels_default[getCurrentLevelKey()];
  const floorY2 = levelConfig2.floorY;
  levelConfig2.background(ctx4, canvas4);
  fxFirelight(ctx4, now);
  fxGarageGlow(ctx4, now);
  if (flashActive) {
    const flashNow = gameNow();
    const timeLeft = flashEndTime - flashNow;
    if (timeLeft > 0) {
      const alpha = timeLeft / FLASH_DURATION;
      const color = flashColor || "rgba(255,255,255,0.8)";
      ctx4.save();
      ctx4.globalAlpha = alpha;
      ctx4.fillStyle = color;
      ctx4.fillRect(0, 0, canvas4.width, canvas4.height);
      ctx4.restore();
    } else {
      setFlashActive(false);
      setFlashColor("rgba(255,255,255,0.8)");
    }
  }
  if (gameState === "controls") {
    lookControlsScreen(ctx4, window.usingTouch && window.usingTouch());
    shouldReturn = true;
  } else {
    if (!getBossTransition() && !getBossActive()) {
      if (getBlinkingOut()) {
        const elapsed = gameNow() - getBlinkingOutStartTime();
        const blink = Math.floor(elapsed / 80) % 2 === 0;
        ctx4.save();
        ctx4.globalAlpha = blink ? 0.2 + 0.8 * (1 - elapsed / BLINK_OUT_DURATION) : 0.1;
        drawPlatforms(ctx4, platforms);
        ctx4.globalAlpha = 1;
        ctx4.restore();
      } else {
        drawPlatforms(ctx4, platforms);
      }
    }
    const spriteState = player2.sprite || "idle";
    let spriteInfo = PLAYER_SPRITES[spriteState];
    if (!spriteInfo) {
      console.warn(`Unknown player sprite state: "${spriteState}"; defaulting to idle.`);
      spriteInfo = PLAYER_SPRITES["idle"];
    }
    {
      const img = spriteInfo.image;
      const frameWidth = spriteInfo.frameWidth || player2.width;
      const frameHeight = spriteInfo.frameHeight || player2.height;
      const t = gameNow();
      let frameData;
      if (spriteInfo.frameSequence) {
        frameData = spriteInfo.frameSequence[Math.floor(t / spriteInfo.frameDuration) % spriteInfo.frameSequence.length];
        if (typeof frameData === "number") {
          frameData = { frame: frameData, mirror: false };
        }
      } else if (spriteInfo.animated) {
        frameData = { frame: Math.floor(t / spriteInfo.frameDuration) % (spriteInfo.frameCount || 1), mirror: false };
      } else {
        frameData = { frame: spriteInfo.frame || 0, mirror: false };
      }
      const offsetY = spriteInfo.offsetY || 0;
      let srcY = 0;
      let srcH = frameHeight;
      let destY = player2.feetY - frameHeight + offsetY;
      if (spriteState === "crouch") {
        srcY = img.height - frameHeight;
        srcH = frameHeight;
        destY = player2.feetY - frameHeight + offsetY;
      }
      if (player2.grounded) {
        ctx4.save();
        ctx4.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx4.beginPath();
        ctx4.ellipse(
          player2.x + player2.width / 2,
          player2.feetY - 5,
          player2.width / 2.5,
          8,
          0,
          0,
          2 * Math.PI
        );
        ctx4.fill();
        ctx4.restore();
      }
      ctx4.save();
      let alpha = player2.opacity !== void 0 ? player2.opacity : 1;
      if (player2.invulnerable && spriteState !== "dead") {
        // a quicker blink than 2025's slow half-fade (fx.js)
        alpha *= fxBullAlpha(now);
      }
      ctx4.globalAlpha = alpha;
      const scale = player2.scale !== void 0 ? player2.scale : 1;
      ctx4.translate(player2.x + frameWidth * (1 - scale) / 2, destY + frameHeight * (1 - scale) / 2);
      ctx4.scale(scale, scale);
      if (spriteState === "dead") {
        ctx4.drawImage(
          img,
          0,
          0,
          frameWidth,
          frameHeight,
          0,
          0,
          frameWidth,
          frameHeight
        );
      } else {
        const shouldMirror = frameData.mirror || player2.facing < 0 && spriteState !== "walkForward";
        // squash and stretch, the fire kick, the white frame on a hit and the rim light (fx.js)
        fxDrawBull(ctx4, img, frameData.frame, srcY, frameWidth, frameHeight, shouldMirror, player2, now);
      }
      ctx4.restore();
    }
    if (player2.muzzleFlashTimer > 0) {
      const direction = player2.facing;
      const muzzleOffsetX = direction === 1 ? player2.width - 6 : -6;
      const muzzleOffsetY = player2.crouching ? player2.height / 2 : player2.height / 2 + 5;
      const muzzleX = player2.x + muzzleOffsetX;
      const muzzleY = player2.crouching ? player2.feetY - player2.height + muzzleOffsetY : player2.y + muzzleOffsetY;
      lookMuzzle(ctx4, muzzleX - direction * 3, muzzleY);
      fxMuzzleStar(ctx4, muzzleX, muzzleY, direction);
    }
    if (DEBUG_HITBOXES) {
      ctx4.save();
      const { x: hx, y: hy, width: hw, height: hh } = getHitbox(player2);
      ctx4.strokeStyle = "lime";
      ctx4.lineWidth = 2;
      ctx4.strokeRect(hx, hy, hw, hh);
      ctx4.restore();
      ctx4.save();
      ctx4.strokeStyle = "red";
      ctx4.lineWidth = 2;
      carpshits.forEach((carpshit) => {
        if (!carpshit.alive && !carpshit.falling && !carpshit.onFloor) return;
        if (getBlinkingOut()) {
          const elapsed = gameNow() - getBlinkingOutStartTime();
          if (Math.floor(elapsed / 80) % 2 === 0) return;
        }
        const { x: cx, y: cy, width: cw, height: ch } = getCarpshitHitbox(carpshit);
        ctx4.strokeRect(cx, cy, cw, ch);
      });
      lowerCarpshits.forEach((carpshit) => {
        if (!carpshit.alive && !carpshit.falling && !carpshit.onFloor) return;
        if (getBlinkingOut()) {
          const elapsed = gameNow() - getBlinkingOutStartTime();
          if (Math.floor(elapsed / 80) % 2 === 0) return;
        }
        const { x: cx, y: cy, width: cw, height: ch } = getCarpshitHitbox(carpshit);
        ctx4.strokeRect(cx, cy, cw, ch);
      });
      ctx4.restore();
    }
    projectiles.forEach((p) => {
      if (p.type === "player") p.draw(ctx4, DEBUG_HITBOXES);
    });
    if (!getBossTransition() && !getBossActive()) {
      if (getBlinkingOut()) {
        const elapsed = gameNow() - getBlinkingOutStartTime();
        const blink = Math.floor(elapsed / 80) % 2 === 0;
        ctx4.save();
        ctx4.globalAlpha = blink ? 0.2 + 0.8 * (1 - elapsed / BLINK_OUT_DURATION) : 0.1;
        drawCarpshits(ctx4);
        drawLowerCarpshits(ctx4);
        ctx4.globalAlpha = 1;
        ctx4.restore();
      } else {
        drawCarpshits(ctx4);
        drawLowerCarpshits(ctx4);
      }
    }
    if (!(getBossActive() && getCurrentBoss())) fxDrawWorld(ctx4);
    lookDrawSparks(ctx4);
    if (gameState === "congrats") {
      ctx4.save();
      ctx4.globalAlpha = 0.6;
      ctx4.fillStyle = "#000";
      ctx4.fillRect(0, 0, canvas4.width, canvas4.height);
      ctx4.globalAlpha = 1;
      ctx4.restore();
      // the congratulations art, the run's numbers and the buttons are the end card (end.js)
      if (shaking) ctx4.restore();
      ctx4.restore();
      return;
    }
    if (gameState.includes("over")) {
      ctx4.save();
      ctx4.globalAlpha = 0.6;
      ctx4.fillStyle = "#000";
      ctx4.fillRect(0, 0, canvas4.width, canvas4.height);
      ctx4.globalAlpha = 1;
      ctx4.restore();
      lookGameOver(ctx4);
      // Retry and Title are the end card's buttons (end.js)
      if (shaking) ctx4.restore();
      ctx4.restore();
      return;
    }
    if (getBossActive() && getCurrentBoss()) {
      getCurrentBoss().draw(ctx4);
      if (getCarpshitsDuringBoss()) {
        drawCarpshits(ctx4);
        drawLowerCarpshits(ctx4);
      }
      projectiles.forEach((p) => {
        if (p.type === "boss") p.draw(ctx4, DEBUG_HITBOXES);
      });
      fxDrawWorld(ctx4);
      lookDrawSparks(ctx4);
      if (DEBUG_HITBOXES) {
        const bossHitbox = getCurrentBoss().getHitbox();
        ctx4.save();
        ctx4.strokeStyle = "orange";
        ctx4.lineWidth = 2;
        ctx4.strokeRect(bossHitbox.x, bossHitbox.y, bossHitbox.width, bossHitbox.height);
        ctx4.restore();
        const { x: hx, y: hy, width: hw, height: hh } = getHitbox(player2);
        ctx4.save();
        ctx4.strokeStyle = "lime";
        ctx4.lineWidth = 2;
        ctx4.strokeRect(hx, hy, hw, hh);
        ctx4.restore();
      }
      shouldReturn = true;
    }
  }
  if (shouldReturn) {
    if (shaking) ctx4.restore();
    ctx4.restore();
    return;
  }
  if (shaking) ctx4.restore();
  ctx4.restore();
}

// from the 2025 game: src/controller.js
function resetGame(canvas4, bullets2) {
  setBossTriggered(false);
  setBossExit(false);
  setBossExitDoorClosing(false);
  setBossActive(false);
  setCurrentBoss(null);
  setBossBattleStarted(false);
  setBossTransition(false);
  setBossHold(false);
  setBossPause(false);
  setBlinkingOut(false);
  setCarpshitsDuringBoss(false);
  player.x = 50;
  player.width = PLAYER_WIDTH;
  player.height = PLAYER_HEIGHT;
  const levelConfig2 = levels_default[getCurrentLevelKey()];
  player.feetY = levelConfig2.floorY;
  player.vx = 0;
  player.vy = 0;
  player.jumping = false;
  player.grounded = true;
  player.firing = false;
  player.facing = 1;
  player.health = PLAYER_START_HEALTH;
  player.invulnerable = false;
  player.invulnerableUntil = null;
  player.blasterEnergy = BLASTER_MAX_ENERGY;
  player.blasterMaxEnergy = BLASTER_MAX_ENERGY;
  player.blasterLastRechargeTime = gameNow();
  player.blasterEmptyFlashEndTime = 0;
  resetKillCount();
  setPhaseChangeKillCount(levelConfig2.phaseChangeKillCount);
  carpshits.length = 0;
  for (let i = 0; i < NUM_CARPSHITS; i++) {
    carpshits.push({
      x: canvas4.width + 48 + Math.random() * 200,
      y: 80 + Math.random() * 180,
      vx: -(1.5 + Math.random()),
      alive: true,
      frame: 0,
      frameTimer: 0,
      falling: false,
      vy: 0,
      onFloor: false,
      respawnTimer: 0
    });
  }
  lowerCarpshits.length = 0;
  for (let i = 0; i < NUM_LOWER_CARPSHITS; i++) {
    lowerCarpshits.push({
      x: canvas4.width + 48 + Math.random() * 200,
      y: 300 + Math.random() * 40,
      vx: -(1 + Math.random()),
      alive: true,
      frame: 0,
      frameTimer: 0,
      falling: false,
      vy: 0,
      onFloor: false,
      respawnTimer: 0
    });
  }
  clearEntities(bullets2);
  setDyingStartTime(null);
  setGameState("playing");
  setGameStartTime(gameNow());
  setGameStopTime(0);
  setCongratsStartTime(0);
  setDifficultyLevel(1);
  setWaveBanner(false);
  setWaveBannerStartTime(0);
  if (typeof updateGame !== "undefined") updateGame._defeatSceneStarted = false;
  Object.assign(player, {
    x: 50,
    feetY: levelConfig2.floorY,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    frame: 0,
    speed: player.speed,
    vx: 0,
    vy: 0,
    jumping: false,
    grounded: true,
    firing: false,
    facing: 1,
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
    blasterEnergy: BLASTER_MAX_ENERGY,
    blasterMaxEnergy: BLASTER_MAX_ENERGY,
    blasterLastRechargeTime: gameNow(),
    blasterEmptyFlashEndTime: 0
  });
}
// The 2025 loop updated and drew once per screen refresh. This one steps the game at a fixed 60 a second
// (the speed it was tuned at) whatever the screen's rate, draws once per refresh, and stops stepping while
// the game is paused (phone.js).
var LOOP_STATES = ["playing", "dying", "bossExit", "bossExitDoorClosing", "congrats"];
var loopRunning = false;
var gamePaused = false;
function gameLoop(canvas4, ctx4, bullets2, restartButton2, isRestartHover2) {
  if (!LOOP_STATES.includes(gameState) || loopRunning) return;
  loopRunning = true;
  let last = performance.now(), acc = STEP_MS;
  const tick = (ts) => {
    if (!LOOP_STATES.includes(gameState)) { loopRunning = false; return; }
    if (gamePaused) { last = ts; requestAnimationFrame(tick); return; }
    let dt = Math.min(250, Math.max(0, ts - last));
    last = ts;
    // hit-stop and slow motion (fx.js) spend real time without moving the game clock as far
    if (fxTime.hold > 0) { const use = Math.min(dt, fxTime.hold); fxTime.hold -= use; dt -= use; }
    if (fxTime.slow > 0 && dt > 0) { const use = Math.min(dt, fxTime.slow); fxTime.slow -= use; dt -= use * (1 - fxTime.rate); }
    acc += dt;
    let steps = 0;
    while (acc >= STEP_MS && steps < 8) {
      acc -= STEP_MS;
      steps++;
      gameClock += STEP_MS;
      runGameTimers();
      if (window.beforeGameStep) window.beforeGameStep();
      updateGame(bullets2, canvas4);
      fxStep();
      if (!LOOP_STATES.includes(gameState)) break;
      if (fxTime.hold > 0) { acc = 0; break; }
    }
    if (steps > 0) renderGame(ctx4, canvas4, bullets2, player, restartButton2, isRestartHover2);
    if (LOOP_STATES.includes(gameState)) requestAnimationFrame(tick);
    else loopRunning = false;
  };
  tick(last);
}
function beginGame(canvas4, ctx4, bullets2, restartButton2, isRestartHover2) {
  // A retry after a clear or mid-fight starts clean: the 2025 restart left the garage open, the music fast and the
  // last fight's timers and shots around.
  setBackgroundFlickerMode("default");
  bgMusic.playbackRate = 1;
  clearEntities(projectiles, tweens, gameTimers, lookSparks);
  fxReset();
  UnrugSfx.reset();
  UnrugSfx.crackle(1, 1.5);
  setScreenShake(false);
  setFightBanner(false);
  __bossState.dying = false;
  __bossState.active = false;
  resetGame(canvas4, bullets2);
  setupControls();
  generatePlatforms();
  const levelConfig2 = levels_default[getCurrentLevelKey()];
  bgMusic.src = levelConfig2.music;
  bgMusic.currentTime = 0;
  bgMusic.play();
  function controlsScreenHandler(e) {
    if (gameState === "controls") {
      setGameState("playing");
      setGameStartTime(gameNow());
      if (window.UnrugRun) UnrugRun.begin();
      setWaveBanner(true);
      setWaveBannerStartTime(gameNow());
      gameLoop(canvas4, ctx4, bullets2, restartButton2, isRestartHover2);
      document.removeEventListener("keydown", controlsScreenHandler);
      canvas4.removeEventListener("click", controlsScreenHandler);
      document.removeEventListener("pointerdown", controlsScreenHandler);
    }
  }
  document.addEventListener("keydown", controlsScreenHandler);
  canvas4.addEventListener("click", controlsScreenHandler);
  document.addEventListener("pointerdown", controlsScreenHandler);
  if (carpshitSprite2.complete) {
    setGameState("controls");
    renderGame(ctx4, canvas4, bullets2, player, restartButton2, isRestartHover2);
  } else {
    carpshitSprite2.onload = function() {
      setGameState("controls");
      renderGame(ctx4, canvas4, bullets2, player, restartButton2, isRestartHover2);
    };
  }
  carpshits.forEach((c) => c.respawnTimer = 0);
  lowerCarpshits.forEach((c) => c.respawnTimer = 0);
}

// from the 2025 game: src/uiController.js (its canvas Restart button is now the end card's Retry, end.js)
var isRestartHover = false;
var restartButton = {
  x: 0,
  y: 0,
  width: 200,
  height: 60
};


// from the 2025 game: src/game.js (its dev tools are left out of the remaster)
var canvas3 = document.getElementById("gameCanvas");
var ctx3 = canvas3.getContext("2d");
var bullets = [];
window.bullets = bullets;
var DEBUG_HITBOXES = false;
var showDifficulty = false;
window.startGame = () => beginGame(canvas3, ctx3, bullets, restartButton, isRestartHover);
