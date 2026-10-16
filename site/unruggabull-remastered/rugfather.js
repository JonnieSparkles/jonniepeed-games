// from the 2025 game: src/levels/rugcoAlley/rugfatherSprites.js
var bossSpriteSheet = new Image();
bossSpriteSheet.src = "art/rugfather.webp";
var bossDeadSprite = new Image();
bossDeadSprite.src = "art/rugfather-dead.webp";
var RUGFATHER_SPRITES = {
  idle: { image: bossSpriteSheet, animated: false, frame: 3, frameWidth: 256, frameHeight: 256 },
  faceCamera: { image: bossSpriteSheet, animated: false, frame: 1, frameWidth: 256, frameHeight: 256 },
  spin: { image: bossSpriteSheet, animated: true, frameSequence: [
    { frame: 2, mirror: false },
    { frame: 3, mirror: false },
    { frame: 4, mirror: false },
    { frame: 5, mirror: false },
    { frame: 6, mirror: false },
    { frame: 5, mirror: true },
    { frame: 4, mirror: true },
    { frame: 3, mirror: true }
  ], frameDuration: 200, frameWidth: 256, frameHeight: 256 },
  blink: { image: bossSpriteSheet, animated: false, frame: 0, frameWidth: 256, frameHeight: 256 },
  attack: { image: bossSpriteSheet, animated: true, frameSequence: [7, 8, 9, 10, 11], frameDuration: 300, frameWidth: 256, frameHeight: 256 },
  hit: { image: bossSpriteSheet, animated: false, frame: 12, frameWidth: 256, frameHeight: 256 },
  dead: { image: bossDeadSprite, animated: true, frameSequence: [0, 1, 2, 3, 4], frameDuration: 200, frameWidth: 256, frameHeight: 256 }
};

// from the 2025 game: src/levels/rugcoAlley/rugfatherConstants.js
var BLINK_OUT_DURATION = 800;
var MAX_HP = 60;
var NUM_PHASES = 3;
var PHASE_ATTACK_COOLDOWNS = {
  1: 3e3,
  // easy
  2: 2e3,
  // medium
  3: 1e3
  // hard
};
var PHASE1_MOVE_AMPLITUDE = 80;
var PHASE1_MOVE_PERIOD = 5e3;
var PHASE1_JUMP_HEIGHT = 40;
var PHASE1_JUMP_PERIOD = 8e3;
var BLINK_PATTERN = [600, 300, 900, 200, 1200, 150, 1500, 100, 1800];
var BLINK_TOTAL_DURATION = BLINK_PATTERN.reduce((a, b) => a + b, 0);
var BOSS_WIDTH = 256;
var BOSS_HEIGHT = 256;


// from the 2025 game: src/levels/rugcoAlley/rugfatherAI.js
var flameCarpetImg2 = new Image();
flameCarpetImg2.src = "art/flaming-carpet.webp";
var PROJECTILE_SPEED2 = 5;
var ATTACK_FRAMES = RUGFATHER_SPRITES.attack.frameSequence.length;
var FRAME_DURATION = RUGFATHER_SPRITES.attack.frameDuration;
var ATTACK_ANIM_DURATION = ATTACK_FRAMES * FRAME_DURATION;
var SPIN_LAND_X = 128;
function basicAttack(now, state2) {
  if (state2.sprite === "attack") {
    if (state2.attackAnimationStartTime == null) {
      state2.attackAnimationStartTime = now;
      state2.hasSpawnedProjectile = false;
    }
    const elapsed = now - state2.attackAnimationStartTime;
    const frameIndex = Math.floor(elapsed / FRAME_DURATION);
    if (frameIndex >= 3 && !state2.hasSpawnedProjectile) {
      spawnProjectile(state2);
      setScreenShake(true);
      setScreenShakeStartTime(gameNow());
      setScreenShakeMagnitude(
        DEFAULT_SCREEN_SHAKE_MAGNITUDE * 0.75
      );
      gameTimeout(() => {
        setScreenShakeMagnitude(
          DEFAULT_SCREEN_SHAKE_MAGNITUDE
        );
      }, SCREEN_SHAKE_DURATION);
      state2.hasSpawnedProjectile = true;
    }
    if (elapsed >= ATTACK_ANIM_DURATION) {
      state2.sprite = "idle";
      state2.attackAnimationStartTime = null;
      state2.hasSpawnedProjectile = false;
    }
    return;
  }
  if (state2.lastAttackTime == null) {
    state2.lastAttackTime = now;
  }
  if (now - state2.lastAttackTime >= state2.attackCooldown) {
    state2.sprite = "attack";
    state2.lastAttackTime = now;
  }
}
function spinSwitchBehavior(now, state2) {
  const prePause = 800;
  const postPause = 800;
  const arcStart = state2.spinSwitchStartTime + prePause;
  const arcEnd = arcStart + state2.spinSwitchDuration;
  if (!state2.spinSwitchTakeoffPlayed && now >= arcStart) {
    heatThingsUpSfx.currentTime = 0;
    heatThingsUpSfx.play();
    state2.spinSwitchTakeoffPlayed = true;
  }
  if (now < arcStart) {
    state2.sprite = "hit";
    state2.facing = 1;
    return;
  }
  const t = (now - arcStart) / state2.spinSwitchDuration;
  if (t < 1) {
    const lerpX = state2.spinSwitchStartX + (state2.spinSwitchEndX - state2.spinSwitchStartX) * t;
    const y0 = state2.spinSwitchFloorY;
    const amp = state2.spinSwitchAmplitude;
    const arcY = y0 - amp * Math.sin(Math.PI * t);
    state2.x = lerpX;
    state2.y = arcY;
    state2.sprite = "spin";
    state2.facing = 1;
    return;
  }
  if (!state2.spinSwitchLanded) {
    state2.x = state2.spinSwitchEndX;
    state2.y = state2.spinSwitchFloorY;
    state2.sprite = "hit";
    fxBossLand(state2);
    muhahahaSfx.currentTime = 0;
    muhahahaSfx.play();
    state2.spinSwitchLanded = true;
    state2.spinSwitchLandTime = now;
    state2.facing = 1;
    return;
  }
  if (now - state2.spinSwitchLandTime < postPause) {
    state2.sprite = "hit";
    state2.facing = 1;
    return;
  }
  state2.sprite = "idle";
  state2.facing = 1;
  state2.spinSwitchDone = true;
}
function getPhaseBehavior(phase, state2) {
  if (phase === NUM_PHASES && state2.spinSwitchStartTime && !state2.spinSwitchDone) {
    return spinSwitchBehavior;
  }
  return basicAttack;
}
function updateBossAI(now, state2) {
  if (!state2.active) return;
  const behavior = getPhaseBehavior(state2.phase, state2);
  behavior(now, state2);
}
function updatePhaseLogic(state2) {
  const ratio = state2.hp / MAX_HP;
  const oldPhaseIdx = Math.ceil(ratio * NUM_PHASES);
  const newPhase = NUM_PHASES - oldPhaseIdx + 1;
  if (newPhase !== state2.phase) {
    const dramaticPause = 2e3;
    state2.sprite = "hit";
    state2.invulnerable = true;
    // 2025: the music cut dead for the pause. Now it sinks into it and rises out (audio.js).
    UnrugSfx.sink();
    gameTimeout(() => bgMusic.pause(), 550);
    gameTimeout(() => {
      if (state2.sprite === "hit") state2.sprite = "idle";
      bgMusic.play();
      UnrugSfx.rise();
    }, dramaticPause);
    let extraInvuln = 0;
    if (newPhase === NUM_PHASES) {
      const canvas5 = document.getElementById("gameCanvas");
      const floorY2 = levels_default[getCurrentLevelKey()].floorY - BOSS_HEIGHT * state2.scale;
      state2.spinSwitchStartTime = gameNow() + dramaticPause;
      state2.spinSwitchDuration = 2e3;
      state2.spinSwitchDone = false;
      state2.spinSwitchStartX = state2.x;
      state2.spinSwitchEndX = SPIN_LAND_X;
      state2.spinSwitchFloorY = floorY2;
      state2.spinSwitchAmplitude = 200;
      extraInvuln = state2.spinSwitchDuration + 200;
    }
    gameTimeout(() => {
      state2.invulnerable = false;
      state2.invulnFadeIn = true;
      state2.invulnFadeInStart = gameNow();
    }, dramaticPause + extraInvuln);
    state2.phase = newPhase;
    fxBossPhase(state2);
    state2.hasCapturedBaseX = false;
    state2.hasCapturedBaseY = false;
    const cd = PHASE_ATTACK_COOLDOWNS[newPhase] || state2.attackCooldown;
    state2.attackCooldown = cd;
    const canvas4 = document.getElementById("gameCanvas");
    const levelConfig2 = levels_default[getCurrentLevelKey()];
    if (newPhase === 2) {
      challengeMeSfx.currentTime = 0;
      challengeMeSfx.play();
      bgMusic.playbackRate = 1.5;
      setCarpshitsDuringBoss(true);
      for (let i = 0; i < NUM_CARPSHITS; i++) {
        carpshits.push({
          x: canvas4.width + 48 + Math.random() * 200,
          y: canvas4.height * 0.1 + Math.random() * (canvas4.height * 0.6 - canvas4.height * 0.1),
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
      for (let i = 0; i < NUM_LOWER_CARPSHITS; i++) {
        lowerCarpshits.push({
          x: canvas4.width + 48 + Math.random() * 200,
          y: canvas4.height * 0.6 + Math.random() * (levelConfig2.floorY - 48 - canvas4.height * 0.6),
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
    } else if (newPhase === 3) {
      bgMusic.playbackRate = 2;
      setCarpshitsDuringBoss(true);
      for (let i = 0; i < NUM_CARPSHITS; i++) {
        const fromLeft = Math.random() < 0.5;
        const speed = 2 + Math.random();
        const x = fromLeft ? -48 - Math.random() * 200 : canvas4.width + 48 + Math.random() * 200;
        const vx = fromLeft ? speed : -speed;
        carpshits.push({
          x,
          y: canvas4.height * 0.1 + Math.random() * (canvas4.height * 0.6 - canvas4.height * 0.1),
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
      for (let i = 0; i < NUM_LOWER_CARPSHITS; i++) {
        const fromLeft = Math.random() < 0.5;
        const speed = 1.5 + Math.random();
        const x = fromLeft ? -48 - Math.random() * 200 : canvas4.width + 48 + Math.random() * 200;
        const vx = fromLeft ? speed : -speed;
        lowerCarpshits.push({
          x,
          y: canvas4.height * 0.6 + Math.random() * (levelConfig2.floorY - 48 - canvas4.height * 0.6),
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
    } else if (newPhase === 1) {
      bgMusic.playbackRate = 1;
    }
  }
}
function spawnProjectile(state2) {
  let x;
  if (state2.facing < 0) {
    x = state2.x + BOSS_WIDTH * 0.2;
  } else {
    x = state2.x + BOSS_WIDTH * 0.8;
  }
  const y = state2.y + BOSS_HEIGHT * 0.65;
  spawnRugfatherCarpet(x, y);
  const p = projectiles[projectiles.length - 1];
  if (p) p.vx = PROJECTILE_SPEED2 * state2.facing;
}

// from the 2025 game: src/levels/rugcoAlley/rugfather.js
var canvas = document.getElementById("gameCanvas");
var ctx = canvas.getContext("2d");
var bossSpriteSheet2 = new Image();
bossSpriteSheet2.src = "art/rugfather.webp";
var bossDeadSprite2 = new Image();
bossDeadSprite2.src = "art/rugfather-dead.webp";
var BOSS_WIDTH2 = 256;
var BOSS_HEIGHT2 = 256;
var state = {
  x: 0,
  y: 0,
  baseY: null,
  // for vertical movement in phase 1
  hasCapturedBaseY: false,
  baseX: null,
  // for horizontal movement in phase 1
  hasCapturedBaseX: false,
  hp: MAX_HP,
  phase: NUM_PHASES,
  active: false,
  opacity: 1,
  scale: 0.5,
  speedMultiplier: 1,
  dying: false,
  deathStart: 0,
  sprite: "idle",
  lastAttackTime: 0,
  attackCooldown: PHASE_ATTACK_COOLDOWNS[NUM_PHASES],
  attackAnimationStartTime: null,
  hasSpawnedProjectile: false,
  entering: true,
  blinking: false,
  laughPlayed: false,
  bossInPosition: false,
  spinEndTime: 0,
  jumpDone: false,
  helloPlayed: false,
  facing: -1,
  // Boss initially faces left
  invulnerable: false,
  // Add invulnerability flag
  invulnFadeIn: false,
  invulnFadeInStart: 0,
  hitFlashEnd: 0,
  // For hit flash effect
  hitJitterX: 0,
  // For jitter/knockback effect
  hitJitterY: 0
  // For vertical jitter/knockback effect
};
var bossCenterX = () => canvas.width / 2 - BOSS_WIDTH2 / 2;
var bossStartX = () => bossCenterX();
function spawn() {
  state.active = true;
  state.hp = MAX_HP;
  state.phase = 1;
  state.attackCooldown = PHASE_ATTACK_COOLDOWNS[state.phase];
  state.scale = 0.5;
  state.x = bossStartX();
  const finalScale = 1;
  const headY = player.feetY - BOSS_HEIGHT2 * finalScale;
  state.y = headY;
  state.opacity = 1;
  state.entering = true;
  state.blinking = false;
  state.laughPlayed = false;
  state.bossInPosition = false;
  state.spinEndTime = 0;
  state.jumpDone = false;
  state.helloPlayed = false;
  state.facing = -1;
  state.lastAttackTime = gameNow();
  state.attackAnimationStartTime = null;
  state.hasSpawnedProjectile = false;
  setBossBattleStarted(false);
  state.baseY = null;
  state.hasCapturedBaseY = false;
  state.baseX = null;
  state.hasCapturedBaseX = false;
  state.invulnerable = false;
}
function update() {
  if (state.dying) return;
  if (!state.active) return;
  const now = gameNow();
  updateBossAI(now, state);
  if (state.hitJitterX) {
    state.hitJitterX *= 0.8;
    if (state.hitJitterX < 0.5) state.hitJitterX = 0;
  }
  if (state.hitJitterY) {
    state.hitJitterY *= 0.8;
    if (state.hitJitterY < 0.5) state.hitJitterY = 0;
  }
  if (state.phase === 1) {
    if (!state.hasCapturedBaseX) {
      state.baseX = state.x;
      state.hasCapturedBaseX = true;
    }
    const offsetX = PHASE1_MOVE_AMPLITUDE * Math.sin(now / PHASE1_MOVE_PERIOD * 2 * Math.PI);
    state.x = state.baseX + offsetX;
  } else if (state.phase === 2) {
    if (!state.hasCapturedBaseX) {
      state.baseX = state.x;
      state.hasCapturedBaseX = true;
    }
    if (!state.hasCapturedBaseY) {
      state.baseY = state.y;
      state.hasCapturedBaseY = true;
    }
    const offsetX = PHASE1_MOVE_AMPLITUDE * Math.sin(now / PHASE1_MOVE_PERIOD * 2 * Math.PI);
    const offsetY = Math.abs(Math.sin(now / PHASE1_JUMP_PERIOD * 2 * Math.PI)) * PHASE1_JUMP_HEIGHT;
    state.x = state.baseX + offsetX;
    state.y = state.baseY - offsetY;
  } else if (state.phase === 3) {
    if (!state.spinSwitchDone) {
      return;
    }
    if (!state.hasCapturedBaseX) {
      state.baseX = state.x;
      state.hasCapturedBaseX = true;
    }
    if (!state.hasCapturedBaseY) {
      state.baseY = state.y;
      state.hasCapturedBaseY = true;
    }
    const offsetX = PHASE1_MOVE_AMPLITUDE * Math.sin(now / PHASE1_MOVE_PERIOD * 2 * Math.PI);
    const offsetY = Math.abs(Math.sin(now / PHASE1_JUMP_PERIOD * 2 * Math.PI)) * PHASE1_JUMP_HEIGHT;
    state.x = state.baseX + offsetX;
    state.y = state.baseY - offsetY;
  }
}
function draw() {
  if (state.dying) {
    const spriteInfo2 = RUGFATHER_SPRITES.dead;
    const now = gameNow();
    const elapsed = now - state.deathStart;
    const sequence = spriteInfo2.frameSequence;
    const frameDuration = spriteInfo2.frameDuration;
    const holdTime = 2500;
    const animTime = holdTime + sequence.length * frameDuration;
    let frameNum;
    if (elapsed < holdTime) {
      frameNum = sequence[0];
    } else if (elapsed < animTime) {
      const idx = Math.floor((elapsed - holdTime) / frameDuration);
      frameNum = sequence[Math.min(idx, sequence.length - 1)];
    } else {
      const flickerInterval = 500;
      const t = Math.floor((elapsed - animTime) / flickerInterval) % 2;
      const last = sequence.length - 1;
      const prev = Math.max(0, last - 1);
      frameNum = t === 0 ? sequence[last] : sequence[prev];
    }
    const fw2 = spriteInfo2.frameWidth;
    const fh2 = spriteInfo2.frameHeight;
    if (fxRf.defeatAt === state.deathStart && elapsed < 34) {
      // the last hit, held white through the freeze (fx.js)
      ctx.drawImage(fxWhite(bossSpriteSheet2), 3 * 256, 0, 256, 256, state.x, state.y, 256 * state.scale, 256 * state.scale);
      return;
    }
    ctx.save();
    ctx.globalAlpha = Math.max(0, state.opacity);
    ctx.drawImage(
      spriteInfo2.image,
      frameNum * fw2,
      0,
      fw2,
      fh2,
      state.x,
      state.y,
      fw2 * state.scale,
      fh2 * state.scale
    );
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }
  if (!state.active) return;
  if (!isFinite(state.x) || !isFinite(state.y) || !isFinite(state.scale) || !bossSpriteSheet2.complete || bossSpriteSheet2.naturalWidth === 0) {
    return;
  }
  const levelConfig2 = levels_default[getCurrentLevelKey()];
  if (!state.entering) fxRfPool(ctx, state, gameNow());
  const bossFeetY = state.y + BOSS_HEIGHT2 * state.scale;
  if (Math.abs(bossFeetY - levelConfig2.floorY) < 10) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.ellipse(
      state.x + BOSS_WIDTH2 * state.scale / 2,
      levelConfig2.floorY - 5,
      BOSS_WIDTH2 * state.scale / 2.5,
      16,
      0,
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.restore();
  }
  if (state.entering) {
    const spriteState2 = state.sprite || "idle";
    let spriteInfo2 = RUGFATHER_SPRITES[spriteState2];
    if (!spriteInfo2) {
      console.warn(`Unknown boss sprite state: "${spriteState2}"; defaulting to idle.`);
      spriteInfo2 = RUGFATHER_SPRITES.idle;
    }
    const t = gameNow();
    let frameData;
    if (spriteInfo2.frameSequence) {
      frameData = spriteInfo2.frameSequence[Math.floor(t / spriteInfo2.frameDuration) % spriteInfo2.frameSequence.length];
      if (typeof frameData === "number") frameData = { frame: frameData, mirror: false };
    } else {
      frameData = { frame: spriteInfo2.frame || 0, mirror: false };
    }
    const fw2 = spriteInfo2.frameWidth;
    const fh2 = spriteInfo2.frameHeight;
    ctx.save();
    ctx.globalAlpha = state.opacity;
    if (frameData.mirror) {
      ctx.translate(state.x + fw2 * state.scale, state.y);
      ctx.scale(-1, 1);
      ctx.drawImage(
        spriteInfo2.image,
        frameData.frame * fw2,
        0,
        fw2,
        fh2,
        0,
        0,
        fw2 * state.scale,
        fh2 * state.scale
      );
    } else {
      ctx.drawImage(
        spriteInfo2.image,
        frameData.frame * fw2,
        0,
        fw2,
        fh2,
        state.x,
        state.y,
        fw2 * state.scale,
        fh2 * state.scale
      );
    }
    ctx.restore();
    return;
  }
  // 2025: a brighter frame for 150 ms on a hit. Now the first 80 ms are a white frame (fx.js); his standing
  // frame breathes and flickers; a red pulse when the phase changes; a flare in his hand before a throw.
  const now = gameNow();
  const whiteHit = state.hitFlashEnd && now < state.hitFlashEnd - 70;
  if (!whiteHit && state.hitFlashEnd && now < state.hitFlashEnd) ctx.filter = "brightness(1.5) contrast(1.0)";
  let drawAlpha = state.opacity;
  if (state.invulnerable) {
    const flickerSpeed = 80;
    drawAlpha = Math.floor(now / flickerSpeed) % 2 === 0 ? 0.25 : 1;
  } else if (state.invulnFadeIn) {
    const fadeDuration = 400;
    const t = Math.min(1, (now - state.invulnFadeInStart) / fadeDuration);
    drawAlpha = t;
    if (t >= 1) {
      state.invulnFadeIn = false;
      drawAlpha = 1;
    }
  }
  const jitterX = state.hitJitterX ? (Math.random() - 0.5) * state.hitJitterX : 0;
  const jitterY = state.hitJitterY ? (Math.random() - 0.5) * state.hitJitterY : 0;
  const spriteState = state.sprite || "idle";
  const spriteInfo = RUGFATHER_SPRITES[spriteState] || RUGFATHER_SPRITES.idle;
  const fw = spriteInfo.frameWidth;
  const fh = spriteInfo.frameHeight;
  let frame, mirror;
  if (spriteInfo.animated && spriteInfo.frameSequence) {
    let frameData = spriteInfo.frameSequence[Math.floor(now / spriteInfo.frameDuration) % spriteInfo.frameSequence.length];
    if (typeof frameData === "number") frameData = { frame: frameData, mirror: false };
    frame = frameData.frame;
    mirror = frameData.mirror || state.facing > 0;
  } else {
    frame = spriteInfo.frame || 0;
    mirror = state.facing > 0;
  }
  const blit = (image, sx, alpha) => {
    ctx.save();
    ctx.globalAlpha = drawAlpha * alpha;
    if (mirror) {
      ctx.translate(state.x + jitterX + fw * state.scale, state.y + jitterY);
      ctx.scale(-1, 1);
      ctx.drawImage(image, sx, 0, fw, fh, 0, 0, fw * state.scale, fh * state.scale);
    } else {
      ctx.drawImage(image, sx, 0, fw, fh, state.x + jitterX, state.y + jitterY, fw * state.scale, fh * state.scale);
    }
    ctx.restore();
  };
  if (whiteHit) blit(fxWhite(spriteInfo.image), frame * fw, 1);
  else if (spriteState === "idle" && frame === 3) blit(fxRfStanding(spriteInfo.image), 0, 1);
  else blit(spriteInfo.image, frame * fw, 1);
  ctx.filter = "none";
  fxDrawRfPulse(ctx, (image, alpha) => blit(image, frame * fw, alpha), spriteInfo.image);
  fxDrawRfTell(ctx, state);
  // the health bar is drawn over the HUD by renderGame (look.js)
}
function hit(damage = 1) {
  if (!state.active || state.entering || state.invulnerable || state.dying) {
    return;
  }
  state.hp -= damage;
  const prevHp = state.hp + damage;
  const threshold = MAX_HP * 0.75;
  if (prevHp > threshold && state.hp <= threshold) {
    challengeMeSfx.currentTime = 0;
    challengeMeSfx.play();
  }
  state.hitFlashEnd = gameNow() + 150;
  state.hitJitterX = 24;
  state.hitJitterY = 12;
  if (state.hp > 0) {
    fxHitStop(70);
    // a thud on each hit, and his "ouch" and "ow" (unused in 2025) on every fifth
    const n = UnrugSfx.bossHit();
    if (n % 5 === 0 && !(prevHp > threshold && state.hp <= threshold)) {
      const line = n % 10 === 0 ? rugfatherOwSfx : rugfatherOuchSfx;
      line.playbackRate = 1; line.currentTime = 0; line.play();
    }
  }
  if (state.hp < MAX_HP * 0.25) {
    setScreenShake(true);
    setScreenShakeStartTime(gameNow());
  }
  if (state.hp > 0) {
    updatePhaseLogic(state);
    state.speedMultiplier += 0.5;
  } else if (state.hp <= 0 && !state.dying) {
    state.hp = 0;
    state.active = false;
    state.dying = true;
    state.deathStart = gameNow();
    fxBossDefeat(state);
  }
}
function getHitbox2() {
  const width = 100;
  const height = 196;
  const offsetX = (BOSS_WIDTH2 * state.scale - width) / 2;
  const offsetY = (BOSS_HEIGHT2 * state.scale - height) / 2;
  return {
    x: state.x + offsetX,
    y: state.y + offsetY,
    width,
    height
  };
}
function setSprite(name) {
  state.sprite = name;
}
function setPosition(x, y) {
  state.x = x;
  state.y = y;
}
function setOpacity(alpha) {
  state.opacity = alpha;
}
function setScale(scale) {
  state.scale = scale;
}
function setEntering(isEntering) {
  state.entering = isEntering;
}
var rugfatherBoss = {
  spawn,
  update,
  draw,
  hit,
  getHitbox: getHitbox2,
  setSprite,
  setPosition,
  setOpacity,
  setScale,
  setEntering,
  // Expose internal dying state for external checks
  get dying() {
    return state.dying;
  }
};
var rugfather_default = rugfatherBoss;
var __bossState = state;
function checkBossBulletCollision(bullet) {
  if (!state.active) return false;
  const hitbox = getHitbox2();
  return bullet.x > hitbox.x && bullet.x < hitbox.x + hitbox.width && bullet.y > hitbox.y && bullet.y < hitbox.y + hitbox.height;
}


// from the 2025 game: src/levels/rugcoAlley/rugfatherIntroScene.js
var rugfatherIntroTimeline = [
  // 0. Clear all bullets, platforms, and carpshits before intro
  { time: 0, action: "clearEntities" },
  // 1. Screen flicker + stop music
  { time: 0, action: "flashScreen", data: FLASH_DURATION },
  { time: 0, action: "screenShake" },
  { time: 0, action: "stopMusic" },
  { time: 0, action: "setPlayerControl", data: false },
  // 2. Ground + center the player
  { time: 500, action: "movePlayerToFloor" },
  { time: 1500, action: "setPlayerSprite", data: "walk" },
  { time: 1500, action: "playSfx", data: unruggabullVoiceSounds[6] },
  { time: 1500, action: "movePlayerTo", data: { x: 380 }, duration: 1200 },
  { time: 2700, action: "setPlayerSprite", data: "idle" },
  // 3. Garage door starts opening (~13s) + player shocked
  { time: 3e3, action: "playSfx", data: garageDoorSound },
  { time: 3e3, action: "startGarageDoorOpen" },
  { time: 4e3, action: "setPlayerSprite", data: "lookForward" },
  { time: 16e3, action: "setPlayerSprite", data: "shocked" },
  // 4. Boss appears at center after door opens
  { time: 16e3, action: "cycleGarageDoorOpen" },
  { time: 16e3, action: "spawnBoss" },
  { time: 16e3, action: "setBossSprite", data: "blink" },
  { time: 16e3, action: "setBossPosition", data: { x: 400, y: 280 } },
  { time: 16e3, action: "playSfx", data: evilLaughSfx },
  // 5. Boss exits garage spinning and grows
  { time: 19e3, action: "setBossSprite", data: "spin" },
  { time: 19e3, action: "setBossOpacity", data: 0 },
  { time: 19e3, action: "playSfx", data: fireWindsSwoosh, duration: 1e4 },
  { time: 19e3, action: "tweenBossPosition", data: { x: 500, y: "floor" }, duration: 1e4 },
  { time: 19e3, action: "tweenBossScale", data: { scale: 1 }, duration: 1e4 },
  { time: 19e3, action: "tweenBossOpacity", data: { opacity: 1 }, duration: 1500 },
  // 6. Player runs left to battle position
  { time: 2e4, action: "autoRunLeft", data: true },
  { time: 2e4, action: "setPlayerSprite", data: "walk" },
  { time: 2e4, action: "movePlayerTo", data: { x: 200, y: "floor" }, duration: 4e3 },
  { time: 24e3, action: "setPlayerFacing", data: "right" },
  { time: 24e3, action: "setPlayerSprite", data: "idle" },
  { time: 27500, action: "playSfx", data: unruggabullVoiceSounds[7] },
  // 7. Both face off and hold
  { time: 29200, action: "setBossSprite", data: "faceCamera" },
  // 8. Boss speaks
  { time: 29500, action: "playSfx", data: helloUnruggabullSfx },
  // 9. Begin battle after dramatic pause
  { time: 32e3, action: "startMusic" },
  { time: 32e3, action: "startBattle" },
  { time: 32e3, action: "setPlayerControl", data: true },
  { time: 32e3, action: "showFightBanner" }
];

// from the 2025 game: src/levels/rugcoAlley/rugfatherDefeatScene.js
var rugfatherDefeatTimeline = [
  // 0. Freeze player and start cinematic
  { time: 0, action: "setCarpshitsFalling", data: true },
  { time: 0, action: "setPlayerControl", data: false },
  { time: 0, action: "setRugfatherSprite", data: "dead" },
  { time: 0, action: "tweenBossPosition", data: { y: "floor" }, duration: 500 },
  { time: 500, action: "movePlayerToFloor" },
  { time: 500, action: "setPlayerFacing", data: "left" },
  { time: 500, action: "setPlayerSprite", data: "idle" },
  { time: 1200, action: "clearEntities" },
  // 1. Walk to ceter
  { time: 1e3, action: "setPlayerSprite", data: "walk" },
  { time: 1e3, action: "movePlayerTo", data: { x: 450 }, duration: 1500 },
  // 2. Play farewell
  { time: 2500, action: "setRugfatherSprite", data: "dead" },
  { time: 2700, action: "setPlayerSprite", data: "idle" },
  { time: 2800, action: "playSfx", data: unruggabullVoiceSounds[1] },
  // 3. Walk into garage
  { time: 4500, action: "setPlayerSprite", data: "walkForward" },
  { time: 5e3, action: "playSfx", data: rugfatherWeaveRemembersSfx },
  { time: 4500, action: "tweenPlayerPosition", data: { x: 480, y: 400 }, duration: 3e3 },
  { time: 4500, action: "tweenPlayerScale", data: { scale: 0.5 }, duration: 3e3 },
  { time: 4500, action: "fadeOutPlayer", duration: 3e3 },
  // 4. Garage closes
  { time: 5e3, action: "playSfx", data: garageDoorCloseSound },
  { time: 5e3, action: "setBossExitDoorClosing" },
  // 5. End scene
  { time: 1e4, action: "clearEntities" },
  { time: 12e3, action: "transitionTo", data: "congrats" }
];

// from the 2025 game: src/levels/rugcoAlley/rugfatherOrchestrator.js
var timelineStart = 0;
var timelineIndex = 0;
var defeatTimelineStart = 0;
var defeatTimelineIndex = 0;
var defeatTimelineActive = false;
var tweens = [];
function startTween(target, to, duration, now) {
  const from = {};
  for (const key in to) from[key] = target[key];
  tweens.push({ target, from, to, startTime: now, duration });
}
function updateTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    const t = Math.min(1, (now - tw.startTime) / tw.duration);
    for (const key in tw.to) {
      tw.target[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * t;
    }
    if (t >= 1) tweens.splice(i, 1);
  }
}
function completeAllTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    for (const key in tw.to) {
      tw.target[key] = tw.to[key];
    }
    tweens.splice(i, 1);
  }
}
function resolveY(y) {
  if (y === "floor") {
    const levelConfig2 = levels_default[getCurrentLevelKey()];
    return levelConfig2.floorY;
  }
  return y;
}
function startBossIntro() {
  timelineStart = gameNow();
  timelineIndex = 0;
  setAutoRunLeft(true);
  setBackgroundFlickerMode("default");
}
function updateBossIntro(now) {
  const elapsed = now - timelineStart;
  while (timelineIndex < rugfatherIntroTimeline.length && elapsed >= rugfatherIntroTimeline[timelineIndex].time) {
    const event = rugfatherIntroTimeline[timelineIndex];
    handleEvent(event, now);
    timelineIndex++;
  }
  updateTweens(now);
}
function handleEvent(event, now) {
  switch (event.action) {
    case "clearEntities":
      clearEntities(window.bullets, projectiles, platforms, carpshits, lowerCarpshits);
      if (player && typeof player.muzzleFlashTimer === "number") player.muzzleFlashTimer = 0;
      break;
    case "spawnBoss":
      setCurrentBoss(rugfather_default);
      setBossActive(true);
      rugfather_default.spawn();
      clearEntities(platforms, carpshits, lowerCarpshits);
      break;
    case "stopMusic":
      bgMusic.pause();
      bgMusic.currentTime = 0;
      break;
    case "playSfx":
      if (event.data && typeof event.data.play === "function") {
        event.data.currentTime = 0;
        event.data.play();
      }
      break;
    case "startGarageDoorOpen":
      UnrugSfx.garage();
      setBossTransition(true);
      setBossTransitionStartTime(now);
      break;
    case "setPlayerControl":
      player.controlEnabled = !!event.data;
      break;
    case "setPlayerSprite":
      player.sprite = event.data;
      break;
    case "movePlayerToFloor":
      player.feetY = levels_default[getCurrentLevelKey()].floorY;
      player.y = player.feetY - player.height;
      break;
    case "movePlayerTo":
      const targetX = event.data.x !== void 0 ? event.data.x : player.x;
      const targetY = event.data.y !== void 0 ? resolveY(event.data.y) : player.y;
      if (event.duration) {
        const prevSprite = player.sprite;
        startTween(player, { x: targetX, y: targetY }, event.duration, now);
        if (event.data.walk && player.feetY === levels_default[getCurrentLevelKey()].floorY) {
          player.sprite = "walk";
          gameTimeout(() => {
            if (player.sprite === "walk") player.sprite = prevSprite;
          }, event.duration);
        }
      } else {
        player.x = targetX;
        player.y = targetY;
      }
      break;
    case "autoRunLeft":
      setAutoRunLeft(event.data !== false);
      break;
    case "startBattle":
      UnrugSfx.crackle(1, 2);
      rugfather_default.setEntering(false);
      wovenIntoRugSfx.currentTime = 0;
      wovenIntoRugSfx.play();
      completeAllTweens(now);
      setBossBattleStarted(true);
      setAutoRunLeft(false);
      setBossHold(false);
      setBossTransition(false);
      setBossPause(false);
      setBlinkingOut(false);
      break;
    case "tweenBossPosition":
      if (event.data && event.data.y !== void 0) {
        const posX2 = typeof event.data.x === "number" ? event.data.x : __bossState.x;
        let targetY2;
        if (event.data.y === "floor") {
          const floorY2 = levels_default[getCurrentLevelKey()].floorY;
          const scaleEvent = rugfatherIntroTimeline.find((e) => e.time === event.time && e.action === "tweenBossScale");
          let finalScale = scaleEvent && scaleEvent.data && scaleEvent.data.scale ? scaleEvent.data.scale : 1;
          targetY2 = floorY2 - BOSS_HEIGHT2 * finalScale;
        } else if (typeof event.data.y === "number") {
          targetY2 = event.data.y;
        }
        startTween(__bossState, { x: posX2, y: targetY2 }, event.duration || 0, now);
      }
      break;
    case "tweenBossScale":
      if (event.data && event.data.scale !== void 0) {
        startTween(__bossState, { scale: event.data.scale }, event.duration || 0, now);
      }
      break;
    case "setBossPosition":
      let posY;
      if (event.data.y === "floor") {
        const floorY2 = levels_default[getCurrentLevelKey()].floorY;
        posY = floorY2 - BOSS_HEIGHT2 * (event.data.scale || 1);
      } else if (typeof event.data.y === "number") {
        posY = event.data.y;
      }
      const posX = typeof event.data.x === "number" ? event.data.x : __bossState.x;
      rugfather_default.setPosition(posX, posY);
      break;
    case "setBossSprite":
      rugfather_default.setSprite(event.data);
      break;
    case "setBossOpacity":
      rugfather_default.setOpacity(event.data);
      break;
    case "setBossScale":
      rugfather_default.setScale(event.data);
      break;
    case "setPlayerFacing":
      player.facing = event.data === "left" ? -1 : 1;
      break;
    case "setBossFacing":
      const facingDirection = event.data || "right";
      break;
    case "flashScreen":
      setFlashActive(true);
      setFlashEndTime(now + event.data);
      break;
    case "screenShake":
      setScreenShake(true);
      setScreenShakeStartTime(now);
      break;
    case "showFightBanner":
      setFightBanner(true);
      setFightBannerStartTime(now);
      break;
    case "startMusic":
      const levelConfig2 = levels_default[getCurrentLevelKey()];
      bgMusic.src = levelConfig2.music;
      bgMusic.currentTime = 0;
      bgMusic.play();
      break;
    case "cycleGarageDoorOpen":
      setBackgroundFlickerMode("doorOpenFlicker");
      break;
    case "tweenBossOpacity":
      if (event.data && typeof event.data.opacity === "number") {
        startTween(__bossState, { opacity: event.data.opacity }, event.duration || 0, now);
      }
      break;
    case "setCarpshitsFalling":
      [carpshits, lowerCarpshits].forEach((arr) => {
        arr.forEach((c) => {
          c.alive = false;
          c.falling = true;
          c.vy = 0;
        });
      });
      break;
    case "setRugfatherSprite":
      if (getCurrentBoss()) {
        getCurrentBoss().setSprite(event.data);
      }
      break;
    case "tweenPlayerPosition":
      player.sprite = "walkForward";
      startTween(player, { x: event.data.x, feetY: event.data.y }, event.duration, now);
      break;
    case "tweenPlayerScale":
      startTween(player, { scale: event.data.scale }, event.duration, now);
      break;
    case "fadeOutPlayer":
      startTween(player, { opacity: 0 }, event.duration, now);
      break;
    case "playGarageCloseReverse":
      garageDoorCloseSound.currentTime = 0;
      garageDoorCloseSound.play();
      break;
    case "setBossExitDoorClosing":
      setBossExitDoorClosing(true);
      setBossExitDoorStartTime(now);
      break;
    case "transitionTo":
      setGameState(event.data);
      if (event.data === "bossExit") {
        __bossState.dying = false;
      }
      if (event.data === "congrats") {
        setBossActive(false);
        setCurrentBoss(null);
        __bossState.dying = false;
        setCongratsStartTime(gameNow());
      }
      break;
    default:
      break;
  }
}
function skipToBattle() {
  const now = gameNow();
  const lastEvent = rugfatherIntroTimeline[rugfatherIntroTimeline.length - 1];
  timelineStart = now - lastEvent.time;
  timelineIndex = 0;
  updateBossIntro(now);
  tweens.forEach((tw) => tw.startTime = now - tw.duration);
  updateTweens(now);
}
function launchRugfatherDefeatScene() {
  defeatTimelineStart = gameNow();
  defeatTimelineIndex = 0;
  __bossState.deathStart = defeatTimelineStart;
  defeatTimelineActive = true;
}
function updateRugfatherDefeatScene(now) {
  if (!defeatTimelineActive) return;
  const elapsed = now - defeatTimelineStart;
  while (defeatTimelineIndex < rugfatherDefeatTimeline.length && elapsed >= rugfatherDefeatTimeline[defeatTimelineIndex].time) {
    const event = rugfatherDefeatTimeline[defeatTimelineIndex];
    handleEvent(event, now);
    defeatTimelineIndex++;
  }
  updateTweens(now);
}
