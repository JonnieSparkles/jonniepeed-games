// Stick Army: Campaign's screens (campaign.js is the mode). The title's Campaign button, the map, the briefing, the
// cards between missions (won, lost, "To be continued"), the debrief, the barracks and the fallen, and the small
// cards for loading a tour, starting a new one and copying the save link. They're drawn in the page's 400x720 units
// over the play page, in the look of Arcade's cards (index.html styles them under "Campaign").
// Classic script; load before game.js. campaign.js calls StickArmyCampaignScreens(world, game, camp) once.
var StickArmyCampaignScreens = function (world, game, camp) {
  'use strict';
  var stage = document.getElementById('stage');
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  var STAR = '<svg class="c-star" viewBox="0 0 70 70" aria-hidden="true"><path d="M35 4 L44 26 L67 27 L49 42 L56 65 L35 52 L14 65 L21 42 L3 27 L26 26 Z" fill="#f2c230" stroke="#2e2e33" stroke-width="4" stroke-linejoin="round"/></svg>';
  var NO_STAR = '<svg class="c-bigstar" viewBox="0 0 70 70" aria-hidden="true"><path d="M35 4 L44 26 L67 27 L49 42 L56 65 L35 52 L14 65 L21 42 L3 27 L26 26 Z" fill="none" stroke="#9a968e" stroke-width="3" stroke-dasharray="6 5" stroke-linejoin="round"/></svg>';
  var CHEV = '<svg class="c-chev" viewBox="0 0 16 10" aria-hidden="true"><path d="M2 8 L8 2 L14 8"/></svg>';
  var HOLES = '<span class="c-hole" style="top:142px"></span><span class="c-hole" style="top:352px"></span>';

  // ---------- the pages ----------
  var root = el('<div id="campaign"></div>');
  root.innerHTML =
    '<section class="c-page" id="cMap" aria-labelledby="cMapTitle" hidden>' + HOLES +
      '<button class="c-back" type="button" data-act="title">‹ Quit</button>' +
      '<div class="c-head"><h2 class="c-title" id="cMapTitle">Tour <span class="pen">map</span></h2><span class="c-code" id="cCode"></span></div>' +
      '<svg class="c-route" id="cRoute" viewBox="0 0 400 720" aria-hidden="true"></svg><div id="cOps"></div>' +
      '<div class="c-foot"><div class="c-links"><button class="c-link" type="button" data-act="copy">Copy save link</button>' +
        '<button class="c-link" type="button" data-act="load">Load a code</button><button class="c-link" type="button" data-act="new">New tour</button></div>' +
        '<button class="btn" type="button" id="cMapGo">Briefing</button></div>' +
    '</section>' +
    '<div id="cBrief" hidden><div class="c-veil" data-act="unbrief"></div><section class="c-postit" role="dialog" aria-modal="true" aria-labelledby="cBriefTitle" id="cBriefBody"></section></div>' +
    '<section class="c-page" id="cDebrief" aria-labelledby="cDebriefTitle" hidden>' + HOLES + '<div class="c-body" id="cDebriefBody"></div>' +
      '<div class="c-foot"><span></span><button class="btn" type="button" id="cTake" disabled>Take it</button></div></section>' +
    '<section class="c-page" id="cBarracks" aria-labelledby="cBarracksTitle" hidden>' + HOLES + '<div class="c-body" id="cBarracksBody"></div>' +
      '<div class="c-foot"><button class="c-link" type="button" data-act="fallen" id="cFallenLink">The fallen →</button><button class="btn" type="button" id="cBarracksDone">Done</button></div></section>' +
    '<section class="c-page c-reverse" id="cFallen" aria-labelledby="cFallenTitle" hidden>' + HOLES +
      '<div class="c-body" style="left:24px;right:56px"><div class="c-starrow" style="justify-content:space-between"><h2 class="c-title" id="cFallenTitle">The <span style="color:var(--enemy)">fallen</span></h2>' +
      '<button class="c-link" type="button" data-act="bunks">← Bunks</button></div><ul class="c-fallen" id="cFallenList"></ul></div></section>' +
    '<div class="overlay" id="cCard" hidden><div class="card c-card" role="dialog" aria-modal="true" id="cCardBody"></div></div>';
  stage.appendChild(root);
  var pages = ['cMap', 'cBrief', 'cDebrief', 'cBarracks', 'cFallen', 'cCard'];
  function hide() { pages.forEach(function (id) { $(id).hidden = true; }); }
  function only(ids) { pages.forEach(function (id) { $(id).hidden = ids.indexOf(id) < 0; }); }
  // A Campaign screen is up: the title goes, nothing runs underneath, and the pause button waits for a mission.
  function up() {
    var sc = world.screens();
    sc.title.hidden = sc.pause.hidden = sc.over.hidden = sc.win.hidden = sc.shop.hidden = true; sc.pauseBtn.hidden = true;
    camp.standBy();
    world.fit();
  }
  function focus(id) { var b = $(id); if (b && !b.disabled) b.focus({ preventScroll: true }); }
  function fig(r, i) {
    var c = document.createElement('canvas');
    world.drawSquadFig(c, { r: { type: r.type, rank: Math.min(r.stripes || 0, 5), hp: 1e3, hurt: 0 }, bed: false }, i);
    return c;
  }

  // ---------- the map ----------
  // The ten operations down the page, a winding pencil route with the forks side by side, every name to the right
  // of its stop. Positions are the page's. Released operations are inked, the rest pencilled; Enemy HQ's flag flies
  // one step ahead of the tour.
  var POS = [[82, 132], [102, 190], [80, 234], [102, 278], [82, 324], [238, 324], [102, 370], [80, 414], [82, 460], [238, 460], [102, 506], [82, 552], [238, 552]];
  var EDGES = [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6], [6, 7], [7, 8], [7, 9], [8, 10], [9, 10], [10, 11], [10, 12]];
  var NUM = [1, 2, 3, 4, 5, 5, 6, 7, 8, 8, 9, 10, 10];
  var FLAG = '<svg viewBox="0 0 30 34" width="20" height="23" style="vertical-align:-3px;margin-left:6px" aria-label="Enemy HQ"><path d="M5 33 V3" stroke="#2e2e33" stroke-width="2.6" stroke-linecap="round"/><path d="M6 4 H27 L22 10 L27 16 H6 Z" fill="#c8433a"/></svg>';
  function map() {
    var t = camp.tour(), o = camp.OPS, stars = t.stars, svg = '', ops = '';
    EDGES.forEach(function (e) {
      var a = POS[e[0]], b = POS[e[1]], mid = (a[1] + b[1]) / 2;
      // Down the left, bowing out a little; a branch to or from the right crosses between the rows of names.
      if (Math.abs(b[0] - a[0]) > 60) svg += '<path class="path" d="M' + a[0] + ' ' + a[1] + ' C ' + a[0] + ' ' + mid + ' ' + b[0] + ' ' + mid + ' ' + b[0] + ' ' + b[1] + '"/>';
      else svg += '<path class="path" d="M' + a[0] + ' ' + a[1] + ' Q ' + (Math.min(a[0], b[0]) - 18) + ' ' + mid + ' ' + b[0] + ' ' + b[1] + '"/>';
    });
    var ahead = t.op + 1;
    o.forEach(function (op, i) {
      var p = POS[i], done = i < t.op || (i === t.op && t.at === 'end'), open = op.released && !done, cls = done ? 'done' : open ? 'open' : '';
      svg += '<circle class="node ' + cls + '" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (op.released ? 11 : 6) + '"/>';
      var sub = '';
      if (op.released && i === t.op && !done) sub = '<small>' + t.missions.length + ' missions · ' + (t.m ? t.m + ' of ' + t.missions.length + ' done' : 'you are here') + '</small>';
      else if (done) sub = '<small>done' + (stars[op.id] ? ' ' + STAR : '') + '</small>';
      else if (i === ahead) sub = '<small class="c-soon">coming soon</small>';
      ops += '<div class="c-op ' + cls + '" style="top:' + (p[1] - (op.released ? 12 : 9)) + 'px;left:' + (p[0] + (op.released ? 18 : 14)) + 'px">' + NUM[i] + ' ' + esc(op.name) + (i === ahead ? FLAG : '') + sub + '</div>';
    });
    $('cRoute').innerHTML = svg; $('cOps').innerHTML = ops;
    $('cCode').textContent = camp.showCode(t.code);
    $('cCode').setAttribute('aria-label', 'Tour code ' + camp.showCode(t.code));
    var go = $('cMapGo');
    go.disabled = false;
    if (t.at === 'end') { go.textContent = 'Coming soon'; go.disabled = true; }
    else if (t.at === 'map' || t.at === 'briefing') go.textContent = 'Briefing';
    else go.textContent = 'Continue';
    up(); only(['cMap']);
    focus(go.disabled ? 'cCode' : 'cMapGo');
  }
  $('cMapGo').addEventListener('click', function () {
    var t = camp.tour();
    if (t.at === 'map' || t.at === 'briefing') briefing(); else camp.showWhere();
  });

  // ---------- the briefing ----------
  function briefing() {
    var t = camp.tour(), op = camp.op(), M = camp.MISSIONS[t.missions[t.m]];
    t.at = 'briefing'; camp.write();
    $('cBriefBody').innerHTML =
      '<p class="c-small" style="letter-spacing:.06em">ORDERS · OPERATION ' + (t.op + 1) + '</p>' +
      '<h2 id="cBriefTitle">' + esc(op.name.split(' ')[0]) + ' <span class="pen">' + esc(op.name.split(' ').slice(1).join(' ')) + '</span></h2>' +
      '<p>' + t.missions.length + ' missions on the home page.' + (t.squad.length ? '' : ' You start with nobody: catch your first soldiers.') + '</p>' +
      '<ul class="c-orders"><li><b>Goal</b> · get through all ' + t.missions.length + '</li><li><b>Bonus</b> ' + STAR + ' · ' + esc(op.star.replace(/\.$/, '').toLowerCase()) + '</li>' +
      '<li><b>Weather</b> · Clear</li><li><b>Squad</b> · ' + op.slots + ' slots</li></ul>' +
      '<p class="c-next">Mission ' + (t.m + 1) + ' · <b>' + esc(M.name) + '</b><br>' + esc(M.text) + '</p>' +
      '<button class="btn" type="button" id="cBriefGo">Go</button>';
    up(); only(['cMap', 'cBrief']);
    $('cBriefGo').addEventListener('click', function () { camp.startMission(); });
    focus('cBriefGo');
  }

  // ---------- cards ----------
  function card(html, first) {
    $('cCardBody').innerHTML = html;
    up(); only(['cCard']);
    focus(first);
  }
  function overMap(html, first) { $('cCardBody').innerHTML = html; only(['cMap', 'cCard']); focus(first); }
  function names(ids) {
    var t = camp.tour(), all = t.fallen;
    return ids.map(function (id) { var f = all.find(function (q) { return q.id === id; }); return f ? (f.stripes ? camp.rankName(f) : 'a rookie ' + camp.ROLE_NAME[f.type]) : ''; }).filter(Boolean);
  }
  function figs(t) {
    var order = camp.deployOrder(t.squad), out = camp.op().slots, box = document.createElement('div');
    box.className = 'c-figs';
    order.slice(0, out).forEach(function (s, i) { box.appendChild(fig(s, i)); });
    var rest = order.length - Math.min(out, order.length), line = document.createElement('span');
    line.textContent = order.length ? Math.min(out, order.length) + ' go out' + (rest ? ' · ' + rest + ' in the barracks' : '') : 'No squad yet: catch some!';
    box.appendChild(line);
    return box;
  }
  function between() {
    var t = camp.tour(), op = camp.op(), last = t.last || {}, M = camp.MISSIONS[t.missions[t.m]], fell = names(last.fell || []);
    card('<p class="c-eyebrow">' + esc(op.name) + ' · ' + t.m + ' of ' + t.missions.length + ' done</p>' +
      '<h2>Mission <span class="pen">won</span></h2>' +
      (last.mission ? '<p class="tag">' + esc(last.mission) + ': ' + last.caught + ' caught, ' + last.planes + ' planes down.</p>' : '') +
      '<div id="cFigs"></div>' +
      (fell.length ? '<p class="tag" style="color:var(--enemy)">Fallen: ' + esc(fell.join(', ')) + '.</p>' : '') +
      '<div class="c-next"><p class="c-small">Next · mission ' + (t.m + 1) + ' of ' + t.missions.length + '</p><p class="tag" style="color:var(--ink)"><b>' + esc(M.name) + '</b>: ' + esc(M.text) + '</p></div>' +
      '<button class="btn" type="button" id="cGo">Go</button>' +
      '<div class="c-links"><button class="c-link" type="button" data-act="shop">Shop</button><button class="c-link" type="button" data-act="barracks">Barracks</button>' +
      '<button class="c-link" type="button" data-act="copy">Copy save link</button><button class="c-link" type="button" data-act="map">Map</button></div>', 'cGo');
    $('cFigs').appendChild(figs(t));
    $('cGo').addEventListener('click', function () { camp.startMission(); });
  }
  function lost() {
    var t = camp.tour(), op = camp.op(), last = t.last || {}, fell = names(last.fell || []);
    card('<p class="c-eyebrow">' + esc(op.name) + ' · mission ' + (t.m + 1) + ' of ' + t.missions.length + '</p>' +
      '<h2>Mission <span style="color:var(--enemy)">lost</span></h2>' +
      '<p class="tag">' + esc(last.mission ? last.mission + ': ' : '') + esc(last.cause || '') + '</p>' +
      '<p class="tag">' + (fell.length ? 'Fallen: ' + esc(fell.join(', ')) + '.' : 'Nobody was lost.') + '</p>' +
      '<p class="c-small">Retry starts the mission again with the squad and gear it started with. The fallen stay fallen.</p>' +
      '<div class="row"><button class="btn" type="button" id="cRetry">Retry</button><button class="btn ghost quit-btn" type="button" data-act="title">Quit</button></div>' +
      '<div class="c-links"><button class="c-link" type="button" data-act="barracks">Barracks</button><button class="c-link" type="button" data-act="map">Map</button></div>', 'cRetry');
    $('cRetry').addEventListener('click', function () { camp.retry(); });
  }
  function end() {
    var t = camp.tour(), op = camp.OPS[t.op], next = camp.OPS[t.op + 1];
    map();
    overMap('<p class="c-eyebrow">Operation ' + esc(op.name) + ' complete</p>' +
      '<h2>To be <span class="pen">continued</span></h2>' +
      '<p class="tag">' + (next ? 'Operation ' + esc(next.name) + ' comes in the next release.' : '') + ' Your squad waits in the barracks.</p>' +
      (t.stars[op.id] ? '<p class="tag">' + STAR + ' Gold star: nobody was lost.</p>' : '') +
      '<div class="row"><button class="btn" type="button" id="cEndMap">Map</button><button class="btn ghost quit-btn" type="button" data-act="title">Quit</button></div>' +
      '<div class="c-links"><button class="c-link" type="button" data-act="barracks">Barracks</button><button class="c-link" type="button" data-act="copy">Copy save link</button></div>', 'cEndMap');
    $('cEndMap').addEventListener('click', map);
  }

  // ---------- the debrief ----------
  var pick = -1;
  function debrief() {
    var t = camp.tour(), d = t.debrief, op = camp.OPS[d.op], byId = {};
    t.squad.forEach(function (s) { byId[s.id] = s; });
    var promos = d.promoted.map(function (p) {
      var s = byId[p.id]; if (!s) return '';
      return '<li>' + CHEV + '<b>' + esc(camp.rankName(s)) + '</b> · ' + camp.ROLE_NAME[s.type] + (p.named && s.trait ? ' · <i>' + esc(s.trait[0].toUpperCase() + s.trait.slice(1)) + '</i>' : '') + '</li>';
    }).join('');
    pick = -1;
    $('cDebriefBody').innerHTML =
      '<div class="c-starrow">' + (d.star ? STAR.replace('c-star', 'c-bigstar') : NO_STAR) + '<div><h2 class="c-title" id="cDebriefTitle">' + esc(op.name) + '</h2>' +
        '<p class="c-small">' + (d.star ? 'Gold star: nobody was lost.' : 'No gold star: ' + esc(op.star.replace(/\.$/, '').toLowerCase()) + ' next time.') + '</p></div></div>' +
      '<p class="c-eyebrow">' + (promos ? 'PROMOTED' : 'NOBODY TO PROMOTE') + '</p>' +
      (promos ? '<ul class="c-promos">' + promos + '</ul>' : '<p class="c-small">Catch soldiers and keep them alive: each operation survived is a stripe.</p>') +
      (promos ? '<p class="c-small">One stripe each for an operation survived. A first stripe brings a name and a trait.</p>' : '') +
      '<p class="c-eyebrow">PICK ONE</p><div class="c-slips" id="cSlips">' +
      d.offers.map(function (r, i) { return '<button class="c-slip" type="button" aria-pressed="false" data-i="' + i + '"><b>' + esc(r.name) + '</b><span>' + esc(r.text) + '</span></button>'; }).join('') + '</div>';
    $('cTake').disabled = true;
    up(); only(['cDebrief']);
    var first = $('cSlips').querySelector('button'); if (first) first.focus({ preventScroll: true });
  }
  $('cDebrief').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.c-slip');
    if (!b) return;
    pick = Number(b.dataset.i);
    Array.prototype.forEach.call($('cSlips').children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    $('cTake').disabled = false;
  });
  $('cTake').addEventListener('click', function () { if (pick >= 0 && camp.takeReward(pick)) barracks(); });

  // ---------- the barracks ----------
  // From between missions or a lost mission, Done goes back there; after the debrief, on to what's next.
  var from = null;
  function barracks(back) {
    from = back || null;
    var t = camp.tour(), order = camp.deployOrder(t.squad), body = $('cBarracksBody'), out = camp.op().slots;
    body.innerHTML = '<div class="c-starrow" style="justify-content:space-between"><h2 class="c-title" id="cBarracksTitle">Barracks</h2><span class="c-tags" id="cBank"></span></div>' +
      '<div class="c-bunks" id="cBunks"></div><p class="c-small" id="cBunkNote"></p><p class="c-eyebrow">RECRUIT</p><div class="c-hires" id="cHires"></div>';
    $('cBank').textContent = t.bank + ' tags';
    var bunks = $('cBunks');
    for (var i = 0; i < camp.BARRACKS; i++) {
      var s = order[i], b = document.createElement('div');
      if (!s) { b.className = 'c-bunk empty'; b.textContent = 'empty'; bunks.appendChild(b); continue; }
      b.className = 'c-bunk' + (i < out ? '' : ' out');
      b.appendChild(fig(s, i));
      var n = document.createElement('b'); n.textContent = s.stripes ? camp.rankName(s) : 'rookie';
      var d = document.createElement('span'); d.textContent = camp.ROLE_NAME[s.type] + (s.trait ? ' · ' + s.trait : '');
      var k = document.createElement('span'); k.textContent = s.kills + (s.kills === 1 ? ' kill' : ' kills');
      if (s.trait) b.title = camp.TRAIT_TEXT[s.trait];
      b.appendChild(n); b.appendChild(d); b.appendChild(k); bunks.appendChild(b);
    }
    $('cBunkNote').textContent = order.length > out ? 'The first ' + out + ' go out on the next mission: most stripes, then most kills. Dashed bunks sit it out.' : 'Each operation has its squad slots: ' + out + ' at ' + camp.op().name + '.';
    var hires = $('cHires');
    if (t.squad.length < camp.BARRACKS) camp.ROLES.forEach(function (type) {
      var price = camp.hirePrice(type), h = document.createElement('button');
      h.type = 'button'; h.className = 'c-hire'; h.textContent = camp.ROLE_NAME[type][0].toUpperCase() + camp.ROLE_NAME[type].slice(1) + ' ' + price;
      h.disabled = t.bank < price;
      h.setAttribute('aria-label', 'Recruit a ' + camp.ROLE_NAME[type] + ' for ' + price + ' tags');
      h.addEventListener('click', function () { if (camp.hire(type)) { barracks(from); focus('cBarracksDone'); } });
      hires.appendChild(h);
    });
    if (t.squad.length >= camp.BARRACKS) hires.insertAdjacentHTML('beforeend', '<span class="c-small">Barracks full.</span>');
    $('cFallenLink').textContent = 'The fallen (' + t.fallen.length + ') →';
    up(); only(['cBarracks']);
    focus('cBarracksDone');
  }
  $('cBarracksDone').addEventListener('click', function () {
    if (from) { var f = from; from = null; f(); return; }
    camp.leaveBarracks(); camp.showWhere();
  });
  function fallen() {
    var t = camp.tour(), op = camp.OPS, list = $('cFallenList');
    list.innerHTML = t.fallen.length ? t.fallen.slice().reverse().map(function (f) {
      var M = camp.MISSIONS[camp.missionsFor(t, f.op)[f.m]];
      return '<li>' + esc(f.stripes ? camp.rankName(f) : 'a rookie') + ' · ' + camp.ROLE_NAME[f.type] + '<small>' + f.kills + (f.kills === 1 ? ' kill' : ' kills') + ' · ' + esc(op[f.op].name) + (M ? ', ' + esc(M.name) : '') + '</small></li>';
    }).join('') : '<li>Nobody yet.</li>';
    only(['cFallen']);
  }

  // ---------- loading, a new tour, the save link ----------
  function loadCard(text) {
    var t = camp.tour();
    var html = '<h2>Load a <span class="pen">tour</span></h2>' +
      '<p class="tag">Paste a save link or code to carry on that tour, or type a friend\'s tour code to play the same tour.</p>' +
      '<label class="c-small" for="cLoadField">Save link, save code or tour code</label><input class="c-field" id="cLoadField" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false">' +
      '<p class="c-err" id="cLoadErr" role="alert" hidden></p>' +
      (t ? '<p class="c-small">It replaces the tour on this device (' + esc(camp.showCode(t.code)) + ').</p>' : '') +
      '<div class="row"><button class="btn" type="button" id="cLoadGo">Load</button><button class="btn ghost" type="button" data-act="map">Cancel</button></div>';
    if ($('cMap').hidden) card(html, 'cLoadField'); else overMap(html, 'cLoadField');
    if (text) $('cLoadField').value = text;
    function go() {
      var got = camp.loadCode($('cLoadField').value);
      if (!got) { var e = $('cLoadErr'); e.textContent = 'That isn\'t a save link, save code or tour code. Check it and try again.'; e.hidden = false; return; }
      camp.showWhere();
    }
    $('cLoadGo').addEventListener('click', go);
    $('cLoadField').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  }
  function newCard() {
    var t = camp.tour();
    overMap('<h2>New <span class="pen">tour</span></h2>' +
      '<p class="tag">Your tour ' + esc(camp.showCode(t.code)) + ' ends here, and its squad with it. Gold stars stay.</p>' +
      '<div class="row"><button class="btn" type="button" id="cNewGo">Start a new tour</button><button class="btn ghost" type="button" data-act="map">Cancel</button></div>', 'cNewGo');
    $('cNewGo').addEventListener('click', function () { camp.newTour(); map(); });
  }
  function copyLink(button) {
    var link = camp.linkFor(camp.tour()), copy = window.Rooms && Rooms.copy ? Rooms.copy(link) : Promise.resolve('failed');
    copy.then(function (r) {
      if (r === 'copied') { var was = button.textContent; button.textContent = 'Copied!'; setTimeout(function () { if (button.isConnected) button.textContent = was; }, 1500); return; }
      // No clipboard: the link in a field to copy by hand.
      var back = $('cMap').hidden ? camp.showWhere : map;
      $('cCardBody').innerHTML = '<h2>Save <span class="pen">link</span></h2><p class="tag">Copy this link to carry on from this mission\'s start on any device.</p>' +
        '<input class="c-field" id="cLinkField" type="text" readonly><div class="row"><button class="btn" type="button" id="cLinkDone">Done</button></div>';
      $('cCard').hidden = false;
      $('cLinkField').value = link; $('cLinkField').focus(); $('cLinkField').select();
      $('cLinkDone').addEventListener('click', function () { back(); });
    });
  }
  // A save link opened on this device: load it, asking first if it would replace a different tour here.
  function linkArrived(code) {
    var t = camp.readLink(code);
    if (!t) return;
    var mine = camp.savedTour();
    if (!mine || camp.linkCode(mine) === camp.linkCode(t)) { camp.setTour(t); camp.showWhere(); return; }
    camp.setTour(mine);
    map();
    overMap('<h2>Open this <span class="pen">tour?</span></h2>' +
      '<p class="tag">The link is tour ' + esc(camp.showCode(t.code)) + '. Opening it replaces the tour on this device (' + esc(camp.showCode(mine.code)) + ').</p>' +
      '<div class="row"><button class="btn" type="button" id="cLinkOpen">Open it</button><button class="btn ghost" type="button" data-act="map">Keep mine</button></div>', 'cLinkOpen');
    $('cLinkOpen').addEventListener('click', function () { camp.setTour(t); camp.showWhere(); });
  }

  // ---------- buttons with data-act ----------
  function toTitle() { hide(); camp.hideRestart(false); game.titleScene(); focus('campaignBtn'); }
  root.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act]');
    if (!b) return;
    var act = b.dataset.act;
    if (act === 'title') toTitle();
    else if (act === 'map') map();
    else if (act === 'unbrief') { camp.tour().at = 'map'; camp.write(); map(); }
    else if (act === 'copy') copyLink(b);
    else if (act === 'load') loadCard();
    else if (act === 'new') newCard();
    else if (act === 'barracks') { var back = camp.tour().at === 'lost' ? lost : camp.tour().at === 'end' ? end : between; barracks(back); }
    else if (act === 'fallen') fallen();
    else if (act === 'bunks') only(['cBarracks']);
    else if (act === 'shop') camp.startMission({ shop: true });
  });
  // Escape closes a card over the map, and the briefing.
  root.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('cBrief').hidden) { e.stopPropagation(); camp.tour().at = 'map'; camp.write(); map(); }
    else if (!$('cCard').hidden && !$('cMap').hidden) { e.stopPropagation(); map(); }
  });

  // ---------- the title's button ----------
  // "Campaign" for a new tour, "Continue" with one saved; a "new" tag until this release has been opened. Only once
  // Campaign is unlocked on the device (campaign.js takeLink); until then the title is Arcade's alone, with Start.
  var campaignBtn = $('campaignBtn');
  world.onTitle = function () {
    hide(); camp.hideRestart(false);
    var on = camp.unlocked();
    campaignBtn.hidden = !on;
    $('startBtn').textContent = on ? 'Arcade' : 'Start';
    campaignBtn.parentNode.classList.toggle('t-two', on);
    var saved = camp.savedTour();
    $('campaignLabel').textContent = saved ? 'Continue' : 'Campaign';
    campaignBtn.setAttribute('aria-label', saved ? 'Continue your Campaign tour' : 'Campaign');
    $('campaignNew').hidden = camp.seen();
    var p = camp.pending();
    if (p) linkArrived(p);
  };
  campaignBtn.addEventListener('click', function () { camp.open(); });

  return { hide: hide, map: map, briefing: briefing, between: between, lost: lost, debrief: debrief, barracks: barracks, fallen: fallen, end: end,
    load: loadCard, copyLink: copyLink };
};
