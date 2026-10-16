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
  ctx4.fillStyle = "#964B00";
  platforms2.forEach((p) => {
    ctx4.fillRect(p.x, p.y, p.width, p.height);
    ctx4.strokeStyle = "#fff8";
    ctx4.strokeRect(p.x, p.y, p.width, p.height);
  });
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
function drawCarpshits() {
  carpshits.forEach((carpshit) => {
    if (!carpshit.alive && !carpshit.falling && !carpshit.onFloor) return;
    const frameToDraw = carpshit.alive ? carpshit.frame : 3;
    const yDraw = !carpshit.alive && carpshit.onFloor ? carpshit.y + 12 : carpshit.y;
    ctx2.drawImage(carpshitSprite, frameToDraw * 64, 0, 64, 64, carpshit.x, yDraw, 64, 64);
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
    const frameToDraw = carpshit.alive ? carpshit.frame : 3;
    const yDraw = !carpshit.alive && carpshit.onFloor ? carpshit.y + 12 : carpshit.y;
    ctx2.drawImage(carpshitSprite, frameToDraw * 64, 0, 64, 64, carpshit.x, yDraw, 64, 64);
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
  carpshit.alive = false;
  carpshit.frame = 3;
  carpshit.falling = true;
  carpshit.vy = 0;
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
  carpshit.alive = false;
  carpshit.frame = 3;
  carpshit.falling = true;
  carpshit.vy = 0;
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
  if (inputFire() && !player.firing) {
    if (player.blasterEnergy > 0) {
      player.blasterEnergy--;
      spawnPlayerBullet(player);
    } else {
      player.blasterEmptyFlashEndTime = now + BLASTER_EMPTY_FLASH_DURATION;
      blasterEmptySound.currentTime = 0;
      blasterEmptySound.play();
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
var congratsImage = new Image();
congratsImage.src = "art/congrats.webp";
function showControlsScreen(ctx4, canvas4) {
  ctx4.save();
  ctx4.fillStyle = "rgba(0,0,0,0.85)";
  ctx4.fillRect(0, 0, canvas4.width, canvas4.height);
  const titleFont = canvas4.width > 900 ? "bold 56px Arial" : "bold 40px Arial";
  const textFont = canvas4.width > 900 ? "32px Arial" : "24px Arial";
  ctx4.font = titleFont;
  ctx4.fillStyle = "#fff";
  ctx4.textAlign = "center";
  ctx4.fillText("Controls", canvas4.width / 2, 120);
  ctx4.font = textFont;
  let y = 210;
  const lineHeight = 48;
  // on a phone, the touch controls (phone.js)
  const touch = window.usingTouch && window.usingTouch();
  ctx4.fillText(touch ? "Move: the pad on the left" : "Move: A / D", canvas4.width / 2, y);
  y += lineHeight;
  ctx4.fillText(touch ? "Jump: up on the pad \u00b7 Crouch: down" : "Jump: Space \u00b7 Crouch: C", canvas4.width / 2, y);
  y += lineHeight;
  ctx4.fillText(touch ? "Fire: tap the right side" : "Fire: F, J, or Enter", canvas4.width / 2, y);
  y += lineHeight;
  ctx4.fillText(touch ? "Tap to start!" : "Press any key to start!", canvas4.width / 2, y + 20);
  ctx4.restore();
}
function drawKillCounter(ctx4, killCount2, canvasWidth) {
  ctx4.save();
  ctx4.font = "28px Arial";
  ctx4.fillStyle = "#fff";
  ctx4.textAlign = "center";
  ctx4.fillText(`Unrugged: ${killCount2}`, canvasWidth / 2, 40);
  ctx4.restore();
}
function drawDifficulty(ctx4, difficultyLevel2, canvasWidth) {
  ctx4.save();
  ctx4.font = "24px Arial";
  ctx4.fillStyle = "#0ff";
  ctx4.textAlign = "center";
  ctx4.fillText(`Difficulty: ${difficultyLevel2}`, canvasWidth / 2, 70);
  ctx4.restore();
}
function drawGameOver(ctx4, canvas4) {
  ctx4.save();
  ctx4.font = "bold 45px Arial";
  ctx4.textAlign = "center";
  ctx4.shadowColor = "#000";
  ctx4.shadowBlur = 12;
  ctx4.lineWidth = 8;
  ctx4.strokeStyle = "#fff";
  ctx4.strokeText("Game over! You got rugged!", canvas4.width / 2, canvas4.height / 2);
  ctx4.fillStyle = "#f44";
  ctx4.shadowBlur = 0;
  ctx4.fillText("Game over! You got rugged!", canvas4.width / 2, canvas4.height / 2);
  ctx4.restore();
}
function drawCongrats(ctx4, canvas4) {
  const now = gameNow();
  const start = getCongratsStartTime();
  const fadeDuration = 2e3;
  const alpha = Math.min((now - start) / fadeDuration, 1);
  ctx4.save();
  ctx4.globalAlpha = alpha;
  ctx4.drawImage(congratsImage, 0, 0, canvas4.width, canvas4.height);
  ctx4.restore();
}
function drawRestartButton(ctx4, canvas4, restartButton2, isHover) {
  const { x, y, width, height } = restartButton2;
  ctx4.save();
  ctx4.font = "bold 32px Arial";
  ctx4.textAlign = "center";
  ctx4.textBaseline = "middle";
  let grad = ctx4.createLinearGradient(x, y, x, y + height);
  grad.addColorStop(0, isHover ? "#ffe066" : "#ffd700");
  grad.addColorStop(1, isHover ? "#ffb300" : "#ff9900");
  ctx4.fillStyle = grad;
  ctx4.strokeStyle = isHover ? "#fffbe6" : "#fff8";
  ctx4.lineWidth = isHover ? 5 : 3;
  ctx4.shadowColor = isHover ? "#fffbe6" : "#000a";
  ctx4.shadowBlur = isHover ? 18 : 8;
  const radius = 18;
  ctx4.beginPath();
  ctx4.moveTo(x + radius, y);
  ctx4.lineTo(x + width - radius, y);
  ctx4.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx4.lineTo(x + width, y + height - radius);
  ctx4.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx4.lineTo(x + radius, y + height);
  ctx4.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx4.lineTo(x, y + radius);
  ctx4.quadraticCurveTo(x, y, x + radius, y);
  ctx4.closePath();
  ctx4.fill();
  ctx4.stroke();
  ctx4.shadowColor = isHover ? "#fffbe6" : "transparent";
  ctx4.shadowBlur = isHover ? 16 : 0;
  ctx4.fillStyle = isHover ? "#222" : "#fff";
  ctx4.fillText("Restart", x + width / 2, y + height / 2);
  ctx4.restore();
}

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
function renderGame(ctx4, canvas4, bullets2, player2, restartButton2, isRestartHover2) {
  const now = gameNow();
  if (getFightBanner && getFightBanner()) {
    const elapsed = now - getFightBannerStartTime();
    const DURATION = 1e3;
    if (elapsed < DURATION) {
      ctx4.save();
      ctx4.font = "bold 72px Arial";
      ctx4.fillStyle = "#ff0";
      ctx4.textAlign = "center";
      ctx4.shadowColor = "#000";
      ctx4.shadowBlur = 12;
      ctx4.fillText("FIGHT!", canvas4.width / 2, canvas4.height / 2 - 50);
      ctx4.restore();
      return;
    } else {
      setFightBanner(false);
    }
  }
  if (getWaveBanner && getWaveBanner()) {
    const elapsedWave = now - getWaveBannerStartTime();
    const DURATION_WAVE = 1e3;
    const levelConfig3 = levels_default[getCurrentLevelKey()];
    const maxWaves = levelConfig3.bossTriggerDifficulty - 1;
    if (elapsedWave < DURATION_WAVE && difficultyLevel <= maxWaves) {
      ctx4.save();
      ctx4.font = "bold 72px Arial";
      ctx4.fillStyle = "#fff";
      ctx4.textAlign = "center";
      ctx4.shadowColor = "#000";
      ctx4.shadowBlur = 12;
      ctx4.fillText(`Wave ${difficultyLevel}/${maxWaves}`, canvas4.width / 2, canvas4.height / 2 - 50);
      ctx4.restore();
    } else {
      setWaveBanner(false);
    }
  }
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
  ctx4.clearRect(0, 0, canvas4.width, canvas4.height);
  const levelConfig2 = levels_default[getCurrentLevelKey()];
  const floorY2 = levelConfig2.floorY;
  levelConfig2.background(ctx4, canvas4);
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
    showControlsScreen(ctx4, canvas4);
    shouldReturn = true;
  } else {
    {
      const iconSize = 32;
      const iconX = 20;
      const iconY = 20;
      ctx4.save();
      ctx4.drawImage(heartIcon, iconX, iconY, iconSize, iconSize);
      ctx4.restore();
      const barX = iconX + iconSize + 4;
      const barHeight = 12;
      const barY = iconY + (iconSize - barHeight) / 2;
      const barWidth = 200;
      ctx4.save();
      ctx4.fillStyle = "#222";
      ctx4.fillRect(barX, barY, barWidth, barHeight);
      const healthRatio = player2.health / PLAYER_START_HEALTH;
      ctx4.fillStyle = "#f44";
      ctx4.fillRect(barX, barY, barWidth * healthRatio, barHeight);
      ctx4.restore();
    }
    {
      const iconSize = 32;
      const iconX = 20;
      const barX = iconX + iconSize + 4;
      const barY = 60;
      const barWidth = 200;
      const barHeight = 12;
      const iconY = barY - (iconSize - barHeight) / 2;
      ctx4.save();
      ctx4.drawImage(blasterIcon, iconX, iconY, iconSize, iconSize);
      ctx4.restore();
      ctx4.save();
      ctx4.fillStyle = "#222";
      ctx4.fillRect(barX, barY, barWidth, barHeight);
      const ratio = player2.blasterEnergy / player2.blasterMaxEnergy;
      ctx4.fillStyle = "#0ff";
      ctx4.fillRect(barX, barY, barWidth * ratio, barHeight);
      if (player2.blasterEmptyFlashEndTime > now) {
        ctx4.globalAlpha = (player2.blasterEmptyFlashEndTime - now) / BLASTER_EMPTY_FLASH_DURATION;
        ctx4.fillStyle = "red";
        ctx4.fillRect(barX, barY, barWidth, barHeight);
      }
      ctx4.restore();
    }
    if (!getBossHold() && !getBossPause() && !getBossTransition() && !getBossActive()) {
      drawKillCounter(ctx4, killCount, canvas4.width);
      if (showDifficulty) drawDifficulty(ctx4, difficultyLevel, canvas4.width);
    }
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
        const blinkInterval = 200;
        const blinkOn = Math.floor(now / blinkInterval) % 2 === 0;
        alpha *= blinkOn ? 0.5 : 1;
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
        if (shouldMirror) {
          ctx4.translate(frameWidth, 0);
          ctx4.scale(-1, 1);
          ctx4.drawImage(
            img,
            frameData.frame * frameWidth,
            srcY,
            frameWidth,
            srcH,
            0,
            0,
            frameWidth,
            frameHeight
          );
        } else {
          ctx4.drawImage(
            img,
            frameData.frame * frameWidth,
            srcY,
            frameWidth,
            srcH,
            0,
            0,
            frameWidth,
            frameHeight
          );
        }
      }
      ctx4.restore();
    }
    if (player2.muzzleFlashTimer > 0) {
      ctx4.save();
      ctx4.fillStyle = "yellow";
      ctx4.globalAlpha = 0.85;
      const direction = player2.facing;
      const muzzleOffsetX = direction === 1 ? player2.width - 6 : -6;
      const muzzleOffsetY = player2.crouching ? player2.height / 2 : player2.height / 2 + 5;
      const muzzleX = player2.x + muzzleOffsetX;
      const muzzleY = player2.crouching ? player2.feetY - player2.height + muzzleOffsetY : player2.y + muzzleOffsetY;
      ctx4.beginPath();
      ctx4.ellipse(muzzleX, muzzleY, 14, 7, 0, 0, 2 * Math.PI);
      ctx4.fill();
      ctx4.globalAlpha = 1;
      ctx4.restore();
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
    if (gameState === "congrats") {
      ctx4.save();
      ctx4.globalAlpha = 0.6;
      ctx4.fillStyle = "#000";
      ctx4.fillRect(0, 0, canvas4.width, canvas4.height);
      ctx4.globalAlpha = 1;
      ctx4.restore();
      drawCongrats(ctx4, canvas4);
      ctx4.save();
      ctx4.font = "bold 28px Arial";
      ctx4.fillStyle = "#fff";
      ctx4.textAlign = "center";
      const healthPercent = Math.round(player2.health / PLAYER_START_HEALTH * 100);
      ctx4.fillText(`Health: ${healthPercent}%`, canvas4.width / 2, canvas4.height / 2 - 30);
      const stopTime = getGameStopTime() || now;
      const elapsedMs = stopTime - getGameStartTime();
      const elapsedSec = (elapsedMs / 1e3).toFixed(1);
      ctx4.fillText(`Time: ${elapsedSec}s`, canvas4.width / 2, canvas4.height / 2);
      ctx4.restore();
      restartButton2.x = Math.round(canvas4.width / 2 - restartButton2.width / 2);
      restartButton2.y = Math.round(canvas4.height / 2 + 20);
      if (typeof window !== "undefined" && window._lastMousePos) {
        const { x: mx, y: my } = window._lastMousePos;
        const over = mx >= restartButton2.x && mx <= restartButton2.x + restartButton2.width && my >= restartButton2.y && my <= restartButton2.y + restartButton2.height;
        if (typeof window.isRestartHover !== "undefined") {
          window.isRestartHover = over;
        }
      }
      drawRestartButton(ctx4, canvas4, restartButton2, typeof window.isRestartHover !== "undefined" ? window.isRestartHover : isRestartHover2);
      return;
    }
    if (gameState.includes("over")) {
      ctx4.save();
      ctx4.globalAlpha = 0.6;
      ctx4.fillStyle = "#000";
      ctx4.fillRect(0, 0, canvas4.width, canvas4.height);
      ctx4.globalAlpha = 1;
      ctx4.restore();
      drawGameOver(ctx4, canvas4);
      restartButton2.x = Math.round(canvas4.width / 2 - restartButton2.width / 2);
      restartButton2.y = Math.round(canvas4.height / 2 + 40);
      drawRestartButton(ctx4, canvas4, restartButton2, isRestartHover2);
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
  if (getWaveBanner && getWaveBanner()) {
    const now2 = gameNow();
    const elapsedWave = now2 - getWaveBannerStartTime();
    const DURATION_WAVE = 1e3;
    const levelConfig3 = levels_default[getCurrentLevelKey()];
    const maxWaves = levelConfig3.bossTriggerDifficulty - 1;
    if (elapsedWave < DURATION_WAVE && difficultyLevel <= maxWaves) {
      ctx4.save();
      ctx4.font = "bold 72px Arial";
      ctx4.fillStyle = "#fff";
      ctx4.textAlign = "center";
      ctx4.shadowColor = "#000";
      ctx4.shadowBlur = 12;
      ctx4.fillText(`Wave ${difficultyLevel}/${maxWaves}`, canvas4.width / 2, canvas4.height / 2 - 50);
      ctx4.restore();
    } else {
      setWaveBanner(false);
    }
  }
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
    acc += Math.min(250, Math.max(0, ts - last));
    last = ts;
    let steps = 0;
    while (acc >= STEP_MS && steps < 8) {
      acc -= STEP_MS;
      steps++;
      gameClock += STEP_MS;
      runGameTimers();
      if (window.beforeGameStep) window.beforeGameStep();
      updateGame(bullets2, canvas4);
      if (!LOOP_STATES.includes(gameState)) break;
    }
    if (steps > 0) renderGame(ctx4, canvas4, bullets2, player, restartButton2, isRestartHover2);
    if (LOOP_STATES.includes(gameState)) requestAnimationFrame(tick);
    else loopRunning = false;
  };
  tick(last);
}
function beginGame(canvas4, ctx4, bullets2, restartButton2, isRestartHover2) {
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

// from the 2025 game: src/uiController.js
var isRestartHover = false;
var restartButton = {
  x: 0,
  y: 0,
  width: 200,
  height: 60
};
function setupRestartUI(canvas4, ctx4, bullets2) {
  window._lastMousePos = { x: 0, y: 0 };
  window.isRestartHover = isRestartHover;
  canvas4.addEventListener("click", function(e) {
    if (!gameState.includes("over") && gameState !== "congrats") return;
    const rect = canvas4.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * canvas4.width / rect.width;
    const my = (e.clientY - rect.top) * canvas4.height / rect.height;
    if (mx >= restartButton.x && mx <= restartButton.x + restartButton.width && my >= restartButton.y && my <= restartButton.y + restartButton.height) {
      if (gameState === "congrats") {
        window.location.reload();
        return;
      }
      isRestartHover = false;
      beginGame(canvas4, ctx4, bullets2, restartButton, isRestartHover);
    }
  });
  canvas4.addEventListener("mousemove", function(e) {
    if (!gameState.includes("over") && gameState !== "congrats") return;
    const rect = canvas4.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * canvas4.width / rect.width;
    const my = (e.clientY - rect.top) * canvas4.height / rect.height;
    window._lastMousePos = { x: mx, y: my };
    isRestartHover = mx >= restartButton.x && mx <= restartButton.x + restartButton.width && my >= restartButton.y && my <= restartButton.y + restartButton.height;
    window.isRestartHover = isRestartHover;
    if (gameState.includes("over") || gameState === "congrats") {
      renderGame(ctx4, canvas4, bullets2, player, restartButton, isRestartHover);
    }
  });
}


// from the 2025 game: src/game.js (its dev tools are left out of the remaster)
var canvas3 = document.getElementById("gameCanvas");
var ctx3 = canvas3.getContext("2d");
var bullets = [];
window.bullets = bullets;
var DEBUG_HITBOXES = false;
var showDifficulty = false;
setupRestartUI(canvas3, ctx3, bullets);
window.startGame = () => beginGame(canvas3, ctx3, bullets, restartButton, isRestartHover);
