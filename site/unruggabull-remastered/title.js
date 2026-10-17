// Unruggabull: RugCo Alley Remastered, the title: the RugCo Empire painting from the 2025 gallery with a slow
// push-in, firelight and rising embers, the 2025 tagline, the wordmark and a menu (Play, Leaderboard, Gallery,
// Credits, and a link to the 2025 original). The painting and type are drawn on #title-art; the menu is buttons.
window.UnrugTitle = (function () {
  const $ = id => document.getElementById(id);
  const titleEl = $('title'), art = $('title-art'), actx = art.getContext('2d'), menu = $('menu'), best = $('best');
  const items = Array.from(menu.children);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const poster = new Image();
  poster.src = 'art/poster.webp';
  let W = 0, H = 0, dpr = 1, safe = { l: 0, r: 0, t: 0, b: 0 }, x0 = 0;
  const embers = [];

  function layout(w, h, d, s) {
    W = w; H = h; dpr = d; safe = s;
    art.width = Math.round(W * dpr); art.height = Math.round(H * dpr);
    x0 = safe.l + 0.11 * H;
    const fs = 0.062 * H;
    menu.style.fontSize = fs + 'px';
    menu.style.left = (x0 + 1.2 * fs) + 'px';
    menu.style.top = (0.49 * H) + 'px';
    best.style.fontSize = (0.042 * H) + 'px';
    best.style.right = (safe.r + 0.06 * H) + 'px';
    best.style.bottom = (safe.b + 0.04 * H) + 'px';
  }

  function posterBox(t) {
    const z = RM ? 1.02 : 1 + 0.05 * (0.5 - 0.5 * Math.cos(t / 16000 * 6.283));
    const ph = H * z, pw = poster.naturalWidth ? poster.naturalWidth / poster.naturalHeight * ph : 0.95 * ph;
    return { x: W - pw + (ph - H) * 0.3, y: (H - ph) * 0.35, w: pw, h: ph };
  }

  function draw(t) {
    const c = actx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#0b0606'; c.fillRect(0, 0, W, H);
    const p = posterBox(t);
    if (poster.complete && poster.naturalWidth) c.drawImage(poster, p.x, p.y, p.w, p.h);
    const g = c.createLinearGradient(p.x, 0, p.x + p.w * 0.5, 0);
    g.addColorStop(0, '#0b0606'); g.addColorStop(1, 'rgba(11,6,6,0)');
    c.fillStyle = g; c.fillRect(p.x - 1, 0, p.w * 0.5 + 1, H);
    // firelight
    c.save(); c.globalCompositeOperation = 'lighter';
    const fl = RM ? 0.08 : 0.07 + 0.05 * Math.abs(Math.sin(t / 111) * Math.sin(t / 189 + 1));
    const rg = c.createRadialGradient(p.x + p.w * 0.55, H * 0.32, 0, p.x + p.w * 0.55, H * 0.32, H * 0.75);
    rg.addColorStop(0, 'rgba(255,110,30,' + fl + ')'); rg.addColorStop(1, 'rgba(255,110,30,0)');
    c.fillStyle = rg; c.fillRect(0, 0, W, H);
    c.restore();
    // embers rising off the fire
    if (!RM) {
      const px = Math.max(1, Math.round(H / 300));
      if (Math.random() < 0.5) embers.push({ x: p.x + Math.random() * (W - p.x), y: H + 2, v: 0.8 + Math.random() * 0.9, dx: (Math.random() - 0.5) * 0.5, a: 0.7 + Math.random() * 0.3, s: (1 + Math.floor(Math.random() * 2)) * px, c: Math.random() < 0.5 ? '#ff6a00' : '#c22a00', life: 4 + Math.random(), age: 0 });
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i]; e.age += 1 / 60; e.y -= e.v * px; e.x += e.dx * px;
        if (e.age > e.life || e.y < -4) { embers.splice(i, 1); continue; }
        c.globalAlpha = e.a * (1 - e.age / e.life); c.fillStyle = e.c; c.fillRect(Math.round(e.x), Math.round(e.y), e.s, e.s);
      }
      c.globalAlpha = 1;
    }
    // the tagline, the wordmark and the subtitle
    const room = p.x + p.w * 0.3 - x0;
    c.save();
    c.font = LOOK.pix(0.055 * H); lookSpacing(c, 0.004 * H); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const tag = 'ONE BULL WAS NOT LIKE THE REST, HE WAS...';
    const tw = c.measureText(tag).width;
    if (tw > room) c.font = LOOK.pix(0.055 * H * room / tw);
    lookOutlined(c, tag, x0, H * 0.2, '#dcc6b4', '#0b0606', 3);
    c.restore();
    lookLogo(c, 'UNRUGGABULL', x0, H * 0.36, lookFitLogo(c, 'UNRUGGABULL', room, H * 0.15), 'left');
    c.save();
    const ss = 0.05 * H;
    c.font = LOOK.pix(ss); lookSpacing(c, ss * 0.16); c.textAlign = 'left';
    c.shadowColor = 'rgba(255,106,26,0.85)'; c.shadowBlur = ss * 0.5;
    lookOutlined(c, 'RUGCO ALLEY · REMASTERED', x0, H * 0.44, '#ffe9cf', 'rgba(16,6,4,0.9)', ss * 0.14);
    c.restore();
  }

  // ---------- the menu ----------
  function select(el, focus) {
    items.forEach(i => i.classList.toggle('on', i === el));
    if (focus) el.focus({ preventScroll: true });
  }
  items.forEach(el => {
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !el.classList.contains('on')) { select(el, false); UnrugSfx.move(); } });
    el.addEventListener('focus', () => select(el, false));
  });
  addEventListener('keydown', e => {
    if (titleEl.hidden || anyCardOpen()) return;
    const i = items.findIndex(el => el.classList.contains('on'));
    // Up/Down or W/S move the blaster; Enter (or Space) picks
    const k = e.key.toLowerCase();
    const down = k === 'arrowdown' || k === 's', up = k === 'arrowup' || k === 'w';
    if (down || up) {
      e.preventDefault();
      select(items[(i + (down ? 1 : items.length - 1)) % items.length], true);
      UnrugSfx.move();
    }
  });
  const anyCardOpen = () => Array.from(document.querySelectorAll('.card-wrap')).some(c => !c.hidden && c.id !== 'rotate');

  // The title music starts on the first tap or key (browsers need one first).
  let music = false;
  function startMusic() {
    if (music || titleEl.hidden || starting) return;
    music = true;
    UnrugSound.init();
    titleMusic.currentTime = 0;
    titleMusic.volume = 0;
    titleMusic.play();
    titleMusic.fadeTo(0.5, 1.4);
  }
  document.addEventListener('pointerdown', startMusic);
  document.addEventListener('keydown', startMusic);

  // Play: "Let's go!", then the alley fades in on the controls screen, as in 2025. On a phone it goes full screen.
  let starting = false;
  function play() {
    if (starting) return;
    starting = true;
    UnrugSound.init();
    if (window.usingTouch && window.usingTouch() && window.unrugEnterFull) window.unrugEnterFull();
    // the title music fades under "Let's go!" instead of stopping dead
    UnrugSfx.pick();
    titleMusic.fadeTo(0, 1.2);
    setTimeout(() => { titleMusic.pause(); titleMusic.currentTime = 0; }, 1300);
    letsGoSound.currentTime = 0;
    letsGoSound.play();
    $('home').hidden = true;
    $('title-edge').hidden = true;
    setTimeout(() => {
      titleEl.style.opacity = 0;
      $('gameCanvas').style.opacity = 1;
      setTimeout(() => {
        titleEl.hidden = true;
        window.startGame();
      }, 700);
    }, 1000);
  }

  // ---------- cards ----------
  let lastFocus = null;
  function openCard(id, focusId) {
    lastFocus = document.activeElement;
    $(id).hidden = false;
    $(focusId).focus({ preventScroll: true });
  }
  function closeCard(id) {
    if (!$(id).hidden) UnrugSfx.back();
    $(id).hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  for (const [id, btn] of [['board', 'close-board'], ['gallery', 'close-gallery'], ['credits', 'close-credits']]) {
    $(btn).addEventListener('click', () => closeCard(id));
    $(id).addEventListener('click', e => { if (e.target === $(id)) closeCard(id); });
  }
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    for (const id of ['board', 'gallery', 'credits']) if (!$(id).hidden) closeCard(id);
  });

  // Leaderboard: the online board, or this device's clears when it can't be reached (end.js).
  function showBoard() {
    UnrugRun.loadTitleBoard($('board-list'));
    openCard('board', 'close-board');
  }

  // Gallery: the paintings phones got instead of the game in 2025, and the 2025 title.
  const GALLERY = [
    ['art/gallery-rugco-empire.webp', 'The bull with a bottle in front of the burning RugCo Empire sign'],
    ['art/gallery-he-was-unruggabull.webp', 'The bull in a field of bulls at sunset: one bull was not like the rest, he was Unruggabull'],
    ['art/gallery-saves-the-day.webp', 'The bull with a blaster carrying a cow out of a burning city'],
    ['art/gallery-board-game.webp', 'Unruggabull: the board game, a family playing it at a table'],
    ['art/title.webp', 'The 2025 title screen: the bull aims his blaster, a herd of bulls behind him']
  ];
  let gi = 0;
  function showPicture(i, quiet) {
    if (!quiet) UnrugSfx.page(i > gi ? 0.3 : -0.3);
    gi = (i + GALLERY.length) % GALLERY.length;
    const img = $('gallery-img');
    img.src = GALLERY[gi][0]; img.alt = GALLERY[gi][1];
    $('gallery-count').textContent = (gi + 1) + ' / ' + GALLERY.length;
  }
  $('gallery-prev').addEventListener('click', () => showPicture(gi - 1));
  $('gallery-next').addEventListener('click', () => showPicture(gi + 1));
  addEventListener('keydown', e => {
    if ($('gallery').hidden) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') showPicture(gi - 1);
    if (k === 'arrowright' || k === 'd') showPicture(gi + 1);
  });
  let swipeX = null;
  $('gallery-img').addEventListener('pointerdown', e => { swipeX = e.clientX; });
  $('gallery-img').addEventListener('pointerup', e => {
    if (swipeX !== null && Math.abs(e.clientX - swipeX) > 40) showPicture(gi + (e.clientX < swipeX ? 1 : -1));
    swipeX = null;
  });

  menu.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    if (act !== 'play') UnrugSfx.pick();
    if (act === 'play') play();
    else if (act === 'board') showBoard();
    else if (act === 'gallery') { showPicture(gi, true); openCard('gallery', 'gallery-next'); }
    else if (act === 'credits') openCard('credits', 'close-credits');
  });

  // The fastest clear on this device, bottom right.
  function showBest() {
    const b = UnrugRun.best();
    best.hidden = !b;
    if (b) best.textContent = 'Your fastest clear   ' + b;
  }
  showBest();

  return { layout, draw, showBest, visible: () => !titleEl.hidden };
})();
