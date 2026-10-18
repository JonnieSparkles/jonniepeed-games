// Stick Army: Campaign's screens (campaign.js is the mode). The title's Campaign button, the tour map, the briefing,
// the operation's map, prep, the cards after a mission (won, lost, "To be continued"), the debrief, the shop and the
// Squad screen (and the fallen) between operations, and the small cards for loading a tour, starting a new one and
// copying the save link. They're drawn in the page's 400x720 units
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
      '<button class="c-back" type="button" data-act="title">‹ Save and quit</button>' +
      '<div class="c-head"><h2 class="c-title" id="cMapTitle">Tour <span class="pen">map</span></h2><span class="c-code" id="cCode"></span></div>' +
      '<svg class="c-route" id="cRoute" viewBox="0 0 400 720" aria-hidden="true"></svg><div id="cOps"></div>' +
      '<div class="c-foot"><div class="c-links c-grid2"><button class="c-link" type="button" data-act="squad" id="cSquadLink">Squad</button><button class="c-link" type="button" data-act="gearshop" id="cShopLink">Shop</button>' +
        '<button class="c-link" type="button" data-act="load">Load a code</button><button class="c-link" type="button" data-act="new">End tour</button></div>' +
        '<button class="btn" type="button" id="cMapGo">Briefing</button></div>' +
    '</section>' +
    '<section class="c-page" id="cOp" aria-labelledby="cOpTitle" hidden>' + HOLES +
      '<button class="c-back" type="button" data-act="title">‹ Save and quit</button><div class="c-body" id="cOpBody"></div>' +
      '<div class="c-foot"><button class="c-link" type="button" data-act="tourmap">Tour map</button><button class="btn" type="button" id="cOpGo">Prep</button></div></section>' +
    '<section class="c-page" id="cPrep" aria-labelledby="cPrepTitle" hidden>' + HOLES +
      '<button class="c-back" type="button" id="cPrepBack">‹ Map</button><div class="c-body" id="cPrepBody"></div>' +
      '<div class="c-foot"><span class="c-tags" id="cPrepBank"></span><button class="btn" type="button" id="cPrepGo">Start</button></div></section>' +
    '<section class="c-page" id="cShop" aria-labelledby="cShopTitle" hidden>' + HOLES + '<div class="c-body" id="cShopBody"></div>' +
      '<div class="c-foot"><span></span><button class="btn" type="button" id="cShopDone">Done</button></div></section>' +
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
  var pages = ['cMap', 'cOp', 'cPrep', 'cShop', 'cBrief', 'cDebrief', 'cBarracks', 'cFallen', 'cCard'];
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
      else if (i === ahead) sub = op.released ? '<small>next</small>' : '<small class="c-soon">coming soon</small>';
      ops += '<div class="c-op ' + cls + '" style="top:' + (p[1] - (op.released ? 12 : 9)) + 'px;left:' + (p[0] + (op.released ? 18 : 14)) + 'px">' + NUM[i] + ' ' + esc(op.name) + (i === ahead ? FLAG : '') + sub + '</div>';
    });
    var live = camp.news();
    if (live) ops += '<div class="c-live">' + esc(live) + '</div>';
    $('cRoute').innerHTML = svg; $('cOps').innerHTML = ops;
    $('cCode').textContent = camp.showCode(t.code);
    $('cCode').setAttribute('aria-label', 'Tour code ' + camp.showCode(t.code));
    var go = $('cMapGo');
    go.disabled = false;
    if (t.at === 'end') { go.textContent = 'Coming soon'; go.disabled = true; }
    else if (t.at === 'map' || t.at === 'briefing') go.textContent = 'Briefing';
    else go.textContent = 'Continue';
    // Between operations (before an operation's first mission, or waiting for the next): the shop and the squad.
    var between = t.m === 0 && (t.at === 'map' || t.at === 'briefing') || t.at === 'end';
    $('cSquadLink').hidden = $('cShopLink').hidden = !between;
    up(); only(['cMap']);
    focus(go.disabled ? 'cCode' : 'cMapGo');
  }
  $('cMapGo').addEventListener('click', function () {
    var t = camp.tour();
    if (t.at === 'map' || t.at === 'briefing') briefing(); else camp.showWhere();
  });

  // ---------- the briefing ----------
  function briefing() {
    var t = camp.tour(), op = camp.op(), M = camp.MISSIONS[t.missions[t.m]], weather = camp.weatherFor(t, t.op), intel = camp.intelFor(t, t.op);
    t.at = 'briefing'; camp.write();
    $('cBriefBody').innerHTML =
      '<p class="c-small" style="letter-spacing:.06em">ORDERS · OPERATION ' + (t.op + 1) + '</p>' +
      '<h2 id="cBriefTitle">' + esc(op.name.split(' ')[0]) + ' <span class="pen">' + esc(op.name.split(' ').slice(1).join(' ')) + '</span></h2>' +
      '<p>' + t.missions.length + ' missions on the home page.' + (t.squad.length ? '' : ' You start with nobody: catch your first soldiers.') + '</p>' +
      '<ul class="c-orders"><li><b>Goal</b> · get through all ' + t.missions.length + '</li><li><b>Bonus</b> ' + STAR + ' · ' + esc(op.star.replace(/\.$/, '').toLowerCase()) + '</li>' +
      '<li><b>Weather</b> · ' + esc(camp.WEATHER[weather].text) + '</li>' +
      (intel ? '<li><b>Intel</b> · intercepted: ' + esc(camp.INTEL[intel.threat].text) + ' in mission ' + (intel.m + 1) + '</li>' : '') +
      '<li><b>Squad</b> · ' + op.slots + ' slots</li>' +
      (op.gun ? '<li><b>Armory</b> · HQ sends the ' + esc(camp.GUN_TEXT[op.gun].name.toLowerCase()) + ' gun. Pick it at prep.</li>' : '') + '</ul>' +
      (op.dummies ? '<p class="c-small">Straw dummies come down among the troopers. Catch one and the bounce is wasted.</p>' : '') +
      '<p class="c-next">Mission ' + (t.m + 1) + ' · <b>' + esc(M.name) + '</b><br>' + esc(M.text) + '</p>' +
      '<button class="btn" type="button" id="cBriefGo">Go</button>';
    up(); only(['cMap', 'cBrief']);
    $('cBriefGo').addEventListener('click', function () { t.at = 'op'; camp.write(); opMap(); });
    focus('cBriefGo');
  }

  // ---------- the operation's map ----------
  // After the briefing and after each mission's card: the operation's missions down a pencilled trail, each with its
  // badge (BADGE, drawn from its set piece). Done ones are ticked with their result and open it, read only; the next
  // is ringed in blue with its goal on a post-it; the rest are pencilled. Forward only: Prep goes on to the next.
  var I = '#2e2e33', B = '#2f6fdc', R = '#c8433a', ST = '#d9b44a';
  function badge(body) { return '<svg class="c-badge-svg" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="' + I + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>'; }
  var BADGE = {
    'first-contact': badge('<path d="M6 34h28M10 34v-9h20v9"/><path d="M20 25l9-13" stroke-width="4"/><path d="M31 7l2 3M34 11l3 0M28 5l0-3" stroke="' + R + '"/>'),
    'downed-pilot': badge('<path d="M7 17a13 11 0 0 1 26 0z" fill="#dce7fb" stroke="' + B + '"/><path d="M7 17l11 10M33 17l-11 10M20 17v10" stroke="' + B + '" stroke-width="1.4"/><circle cx="20" cy="29" r="2.5" stroke="' + B + '"/><path d="M20 31.5v5M17 34h6" stroke="' + B + '"/>'),
    'hold-the-radio': badge('<path d="M20 12v24M14 36l6-24 6 24M16 28h8"/><circle cx="20" cy="10" r="2" fill="' + I + '"/><path d="M13 6a9 9 0 0 0 0 9M27 6a9 9 0 0 1 0 9M9 3a14 14 0 0 0 0 15M31 3a14 14 0 0 1 0 15" stroke="' + B + '" stroke-width="1.6"/>'),
    'dummy-drop': badge('<circle cx="20" cy="11" r="6" fill="#f3e2a6" stroke="' + ST + '"/><path d="M17 9l2 2M19 9l-2 2M21 9l2 2M23 9l-2 2" stroke-width="1.2"/><path d="M20 17v11M12 21h16M20 28l-5 8M20 28l5 8" stroke="' + ST + '" stroke-width="2.4"/>'),
    'supply-drop': badge('<path d="M9 13a11 9 0 0 1 22 0z" fill="#dce7fb" stroke="' + B + '"/><path d="M9 13l5 9M31 13l-5 9" stroke="' + B + '" stroke-width="1.4"/><rect x="12" y="22" width="16" height="13" fill="#e7dcc0"/><path d="M12 22l16 13M28 22l-16 13" stroke-width="1.2"/>'),
    'the-officer': badge('<path d="M8 22c0-8 24-10 24-2" fill="#d8d2c4"/><path d="M7 23h26l-3 4H11z" fill="' + I + '"/><path d="M16 17l4-3 4 3" stroke="' + ST + '" stroke-width="1.6"/><path d="M14 32h12" stroke="' + R + '"/>'),
    'cable-cutters': badge('<ellipse cx="20" cy="12" rx="13" ry="6" fill="#e3e3e6"/><path d="M8 9l-4-3v12l4-3" fill="#e3e3e6"/><path d="M20 18v19" stroke-width="1.4" stroke-dasharray="2 2"/><path d="M14 30l12-6M14 24l12 6" stroke="' + R + '" stroke-width="2.4"/>'),
    'spotter-balloon': badge('<circle cx="20" cy="13" r="10" fill="#e3e3e6"/><path d="M14 23l3 7h6l3-7"/><rect x="16" y="30" width="8" height="5"/><circle cx="17" cy="13" r="2.4" stroke="' + R + '"/><circle cx="23" cy="13" r="2.4" stroke="' + R + '"/>'),
    'the-big-one': badge('<circle cx="20" cy="14" r="12" fill="#f0d9d6" stroke="' + R + '"/><path d="M15 26l3 4h4l3-4" stroke="' + R + '"/><ellipse cx="20" cy="34" rx="3" ry="4" fill="' + I + '"/>'),
    'bay-doors': badge('<ellipse cx="20" cy="14" rx="17" ry="7" fill="#e3e3e6"/><path d="M15 21l-2 5M25 21l2 5" stroke="' + R + '"/><ellipse cx="20" cy="30" rx="2" ry="3" fill="' + I + '"/><ellipse cx="20" cy="21" rx="4" ry="1.6" fill="#f6d36b" stroke="#d99a00" stroke-width="1"/>'),
    'recon-run': badge('<path d="M5 22l20-4 9 3-23 6z" fill="#dce7fb" stroke="' + B + '"/><path d="M17 23l-5 7h8" fill="' + B + '" stroke="' + B + '"/><rect x="25" y="8" width="10" height="7" rx="1.5"/><circle cx="30" cy="11.5" r="2"/>'),
    'last-stand': badge('<rect x="7" y="16" width="26" height="18" fill="#efeadd"/><path d="M7 22h26M7 28h26M15 16v6M25 16v6M20 22v6M12 28v6M28 28v6" stroke-width="1.2"/><path d="M19 16l3 6-4 5 3 7" stroke="' + R + '"/><path d="M6 10h28" stroke="' + R + '" stroke-width="3"/><path d="M6 10h11" stroke="' + B + '" stroke-width="3"/>'),
    'the-zeppelin': badge('<ellipse cx="20" cy="17" rx="18" ry="8" fill="#cfcbc2"/><path d="M8 13h6v8H8zM17 11h6v12h-6zM26 13h6v8h-6z" fill="#9aa0a8" stroke-width="1.2"/><path d="M15 25h10v4H15z" fill="' + I + '"/>')
  };
  var PLAIN_BADGE = badge('<circle cx="20" cy="20" r="9"/>');
  function opMap() {
    var t = camp.tour(), op = camp.op(), body = $('cOpBody');
    var nodes = t.missions.map(function (id, i) {
      var M = camp.MISSIONS[id], r = (t.results || [])[i], state = i < t.m ? 'done' : i === t.m ? 'live' : 'later';
      var inner = '<span class="c-badge">' + (BADGE[id] || PLAIN_BADGE) + '</span><span class="c-mname">' + esc(M.name) + (state === 'done' ? '<small>' + esc(r && r.result ? r.result.replace(/\.$/, '') : 'done') + '</small>' : '') + '</span>';
      if (state === 'done') return '<li class="c-mnode done"><button type="button" class="c-mbtn" data-done="' + i + '" aria-label="' + esc(M.name) + ': done. See how it went">' + inner + '</button></li>';
      if (state === 'live') return '<li class="c-mnode live"><div class="c-mbtn">' + inner + '</div><p class="c-goal">' + esc(M.text) + '</p></li>';
      return '<li class="c-mnode later"><div class="c-mbtn">' + inner + '</div></li>';
    }).join('');
    var nextOp = camp.OPS[t.op + 1];
    body.innerHTML = '<p class="c-eyebrow">Operation ' + NUM[t.op] + ' of ' + NUM[NUM.length - 1] + '</p>' +
      '<h2 class="c-title" id="cOpTitle">' + esc(op.name.split(' ')[0]) + ' <span class="pen">' + esc(op.name.split(' ').slice(1).join(' ')) + '</span></h2>' +
      '<ol class="c-trail">' + nodes + '</ol>' + (nextOp ? '<p class="c-small c-then">then: ' + esc(nextOp.name) + '</p>' : '');
    up(); only(['cOp']);
    focus('cOpGo');
  }
  $('cOp').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-done]');
    if (!b) return;
    var t = camp.tour(), i = Number(b.dataset.done), M = camp.MISSIONS[t.missions[i]], r = (t.results || [])[i];
    $('cCardBody').innerHTML = '<p class="c-eyebrow">' + esc(camp.op().name) + ' · mission ' + (i + 1) + '</p><h2>' + esc(M.name) + '</h2>' +
      '<p class="tag">' + esc(r && r.result ? r.result : 'Won.') + '</p><div class="row"><button class="btn" type="button" data-act="opmap" id="cDoneClose">Close</button></div>';
    only(['cOp', 'cCard']); focus('cDoneClose');
  });
  $('cOpGo').addEventListener('click', function () { prep(); });

  // ---------- prep ----------
  // Before every mission (the pick from the layouts): the whole squad drawn as in the game, the operation's slots to
  // fill (tapped in blue; tour.deploy), the gun with a second one in the armory (tour.gun), and up to three supplies
  // the tags can buy (camp.prepOffers), each saying how long it lasts and tagged "new" if it is. Bought here, a supply
  // can go back before Start. Start sends them out (Retry, after a lost mission).
  var picked = [], gunPick = 'standard', bought = [], offers = [], prepFrom = null;
  function prep(back) {
    var t = camp.tour(), slots = camp.op().slots;
    prepFrom = back || null;
    picked = camp.deployed(t).slice(0, slots).map(function (s) { return s.id; });
    gunPick = camp.armory(t).indexOf(t.gun) >= 0 ? t.gun : 'standard';
    bought = []; offers = camp.prepOffers(t).map(function (g) { return g.id; });
    drawPrep();
    up(); only(['cPrep']);
    focus('cPrepGo');
  }
  var GUN_ICON = {
    standard: '<svg width="44" height="30" viewBox="0 0 44 30" aria-hidden="true"><rect x="4" y="16" width="26" height="12" fill="#fbf8ef" stroke="#2e2e33" stroke-width="2"/><path d="M17 16 L36 4" stroke="#2e2e33" stroke-width="4"/></svg>',
    heavy: '<svg width="44" height="30" viewBox="0 0 44 30" aria-hidden="true"><rect x="4" y="16" width="26" height="12" fill="#fbf8ef" stroke="#2e2e33" stroke-width="2"/><path d="M17 16 L32 7" stroke="#2e2e33" stroke-width="8"/><path d="M28 3 L35 13 M32 1 L39 11" stroke="#2e2e33" stroke-width="2.6"/></svg>'
  };
  function gearSlip(g, on) {
    return '<button class="c-gear" type="button" aria-pressed="' + (on ? 'true' : 'false') + '" data-gear="' + g.id + '"' + (!on && (g.full || g.price > camp.tour().bank) ? ' disabled' : '') + '>' +
      '<span class="c-gname">' + esc(g.name) + (g.fresh ? '<i class="c-new">new</i>' : '') + '<i class="c-lasts">' + esc(g.lasts) + '</i></span>' +
      '<span class="c-gdesc">' + esc(g.desc) + (g.have ? ' · have ' + g.have : '') + '</span><span class="c-price">' + (on ? '✓' : g.price) + '</span></button>';
  }
  function drawPrep() {
    var t = camp.tour(), op = camp.op(), slots = Math.min(op.slots, t.squad.length), M = camp.MISSIONS[t.missions[t.m]], body = $('cPrepBody');
    var list = camp.gearList(t), shown = offers.map(function (id) { return list.find(function (g) { return g.id === id; }); }).filter(Boolean);
    body.innerHTML = '<p class="c-eyebrow">Prep · ' + esc(M.name) + '</p>' +
      (camp.armory(t).length > 1 ? '<h3 class="c-sub" id="cPrepTitle">Gun</h3><div class="c-guns" id="cGuns" role="group" aria-label="Gun"></div>' : '') +
      '<h3 class="c-sub"' + (camp.armory(t).length > 1 ? '' : ' id="cPrepTitle"') + '>Your squad' + (t.squad.length ? ' · select ' + slots + ' to deploy' : '') + '</h3>' +
      (t.squad.length ? '<div class="c-bunks c-four" id="cPrepBunks"></div>' : '<p class="c-small">Nobody yet: catch your first soldiers on the mat.</p>') +
      (shown.length ? '<h3 class="c-sub">Supplies</h3><div class="c-gears" id="cPrepGear">' + shown.map(function (g) { return gearSlip(g, bought.indexOf(g.id) >= 0); }).join('') + '</div>' : '');
    camp.armory(t).forEach(function (id, i) {
      if (camp.armory(t).length < 2) return;
      var g = document.createElement('button'), info = camp.GUN_TEXT[id];
      g.type = 'button'; g.className = 'c-gun'; g.setAttribute('aria-pressed', gunPick === id ? 'true' : 'false');
      g.innerHTML = GUN_ICON[id] + '<span><b>' + esc(info.name) + '</b><small>' + esc(info.text) + '</small></span>';
      g.addEventListener('click', function () { gunPick = id; drawPrep(); var again = $('cGuns').children[i]; if (again) again.focus({ preventScroll: true }); });
      $('cGuns').appendChild(g);
    });
    camp.deployOrder(t.squad).forEach(function (s, i) {
      var on = picked.indexOf(s.id) >= 0, b = document.createElement('button');
      b.type = 'button'; b.className = 'c-bunk c-pick'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.appendChild(fig(s, i));
      var n = document.createElement('b'); n.textContent = s.stripes ? camp.rankName(s).replace(/^(\S+) /, '$1 ') : 'rookie';
      var d = document.createElement('span'); d.textContent = camp.ROLE_NAME[s.type];
      b.appendChild(n); b.appendChild(d);
      b.setAttribute('aria-label', (s.stripes ? camp.rankName(s) : 'a rookie') + ', ' + camp.ROLE_NAME[s.type] + (on ? ', going out' : ''));
      b.addEventListener('click', function () {
        var at = picked.indexOf(s.id);
        if (at >= 0) picked.splice(at, 1); else if (picked.length < op.slots) picked.push(s.id); else return;
        drawPrep(); var again = $('cPrepBunks').children[i]; if (again) again.focus({ preventScroll: true });
      });
      $('cPrepBunks').appendChild(b);
    });
    $('cPrepBank').textContent = t.bank + ' tags';
    $('cPrepGo').disabled = t.squad.length > 0 && picked.length === 0;
  }
  $('cPrep').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-gear]');
    if (!b) return;
    var id = b.dataset.gear, at = bought.indexOf(id);
    if (at >= 0) { if (camp.returnGear(id)) bought.splice(at, 1); }
    else if (camp.buyGear(id)) bought.push(id);
    drawPrep();
    var again = $('cPrepBody').querySelector('[data-gear="' + id + '"]'); if (again) again.focus({ preventScroll: true });
  });
  $('cPrepBack').addEventListener('click', function () { var f = prepFrom; prepFrom = null; if (f) f(); else opMap(); });
  $('cPrepGo').addEventListener('click', function () {
    var t = camp.tour(), lostOne = t.at === 'lost';
    t.deploy = picked.slice(); t.gun = gunPick;
    camp.seeGear(offers);
    if (lostOne) camp.retry(); else camp.startMission();
  });

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
  // Rank as gold chevrons, stacked and pointing up like a sleeve's (the pick from the layouts): those earned solid,
  // the next one on top as a dashed outline in quarters filling left to right, pale up to `from`, gold up to `to`
  // (drawn in as the card opens). Promoted: the new one solid too.
  var GOLD = '#d4a017', GOLD_EDGE = '#6b5200';
  function chevrons(have, from, to, promoted, max) {
    var n = promoted ? have : Math.min(have + 1, max), out = '', W = 40;
    function y(i) { return 6 + (n - 1 - i) * 9; }
    function d(i) { var t0 = y(i); return 'M2 ' + (t0 + 10) + ' L20 ' + t0 + ' L38 ' + (t0 + 10) + ' L38 ' + (t0 + 16) + ' L20 ' + (t0 + 6) + ' L2 ' + (t0 + 16) + ' Z'; }
    for (var i = 0; i < n; i++) {
      var solid = i < have, fresh = promoted && i === have - 1;
      if (solid) { out += '<path d="' + d(i) + '" fill="' + GOLD + '" stroke="' + GOLD_EDGE + '" stroke-width="1.4" stroke-linejoin="round"' + (fresh ? ' class="c-newstripe"' : '') + '/>'; continue; }
      var id = 'cq' + Math.random().toString(36).slice(2, 9), q = camp.PROMOTE.STEPS;
      out += '<clipPath id="' + id + '"><path d="' + d(i) + '"/></clipPath><g clip-path="url(#' + id + ')">' +
        '<rect x="2" y="0" width="' + (36 * from / q) + '" height="80" fill="' + GOLD + '" opacity=".35"/>' +
        '<rect class="c-fill" x="' + (2 + 36 * from / q) + '" y="0" width="' + (36 * (to - from) / q) + '" height="80" fill="' + GOLD + '"/>';
      for (var k = 1; k < q; k++) out += '<path d="M' + (2 + 36 * k / q) + ' 0V80" stroke="' + GOLD_EDGE + '" stroke-width="1" stroke-dasharray="2 2" opacity=".55"/>';
      out += '</g><path d="' + d(i) + '" fill="none" stroke="' + GOLD_EDGE + '" stroke-width="1.4" stroke-linejoin="round" stroke-dasharray="3 2"/>';
    }
    var h = 6 + (Math.max(1, n) - 1) * 9 + 20;
    return '<svg class="c-rank" viewBox="0 0 ' + W + ' ' + h + '" width="' + Math.round(W * 1.2) + '" height="' + Math.round(h * 1.2) + '" aria-hidden="true">' + out + '</svg>';
  }
  function promoRows(t, rows) {
    var box = document.createElement('ul'); box.className = 'c-promo' + (rows.length > 4 ? ' c-two' : '');
    rows.forEach(function (p, i) {
      var s = t.squad.find(function (q) { return q.id === p.id; }); if (!s) return;
      var li = document.createElement('li');
      li.appendChild(fig(s, i));
      var name = document.createElement('span'); name.className = 'c-pname';
      name.innerHTML = '<b>' + esc(s.stripes ? camp.rankName(s) : 'a rookie') + '</b>' + (p.promoted ? '<i class="c-promoted">promoted!</i>' : '') +
        (p.named && s.trait ? '<small>' + esc(s.trait[0].toUpperCase() + s.trait.slice(1)) + '</small>' : '');
      li.appendChild(name);
      li.insertAdjacentHTML('beforeend', chevrons(s.stripes, p.from, p.promoted ? camp.PROMOTE.STEPS : p.to, p.promoted, camp.MAX_STRIPES));
      li.setAttribute('aria-label', (s.stripes ? camp.rankName(s) : 'a rookie') + (p.promoted ? ', promoted' : ''));
      box.appendChild(li);
    });
    return box;
  }
  function between() {
    var t = camp.tour(), op = camp.op(), last = t.last || {}, fell = names(last.fell || []), done = !!t.debrief, M = done ? null : camp.MISSIONS[t.missions[t.m]];
    card('<p class="c-eyebrow">' + esc(op.name) + ' · ' + t.m + ' of ' + t.missions.length + ' done</p>' +
      '<h2>Mission <span class="pen">won</span></h2>' +
      // The mission's own result ("3 of 3 pilots safe."), then what else happened, if anything.
      (last.mission ? '<p class="tag">' + esc(last.mission) + ': ' + esc(last.result || '') + [last.caught ? last.caught + ' caught' : '', last.dummies ? last.dummies + (last.dummies === 1 ? ' dummy' : ' dummies') + ' caught' : ''].filter(Boolean).map(function (x, i) { return (i ? ', ' : ' ') + x; }).join('') + (last.caught || last.dummies ? '.' : '') + '</p>' : '') +
      '<div id="cPromo"></div>' +
      (fell.length ? '<p class="tag" style="color:var(--enemy)">Fallen: ' + esc(fell.join(', ')) + '.</p>' : '') +
      '<div class="c-next">' + (done ? '<p class="tag" style="color:var(--ink)">' + esc(op.name) + ' is done: on to the debrief.</p>' :
        '<p class="c-small">Next · mission ' + (t.m + 1) + ' of ' + t.missions.length + '</p><p class="tag" style="color:var(--ink)"><b>' + esc(M.name) + '</b>: ' + esc(M.text) + '</p>') + '</div>' +
      '<button class="btn" type="button" id="cGo">Go</button>', 'cGo');
    if ((last.promo || []).length) $('cPromo').appendChild(promoRows(t, last.promo));
    $('cGo').addEventListener('click', function () { if (camp.afterCard() === 'debrief') debrief(); else opMap(); });
  }
  function lost() {
    var t = camp.tour(), op = camp.op(), last = t.last || {}, fell = names(last.fell || []);
    card('<p class="c-eyebrow">' + esc(op.name) + ' · mission ' + (t.m + 1) + ' of ' + t.missions.length + '</p>' +
      '<h2>Mission <span style="color:var(--enemy)">lost</span></h2>' +
      '<p class="tag">' + esc(last.mission ? last.mission + ': ' : '') + esc(last.cause || '') + '</p>' +
      '<p class="tag">' + (fell.length ? 'Fallen: ' + esc(fell.join(', ')) + '.' : 'Nobody was lost.') + '</p>' +
      '<p class="c-small">Retry starts the mission again with the squad and gear it started with. The fallen stay fallen.</p>' +
      '<div class="row"><button class="btn" type="button" id="cRetry">Retry</button><button class="btn ghost quit-btn" type="button" data-act="title">Save and quit</button></div>' +
      '<div class="c-links"><button class="c-link" type="button" data-act="reprep">Change who goes</button></div>', 'cRetry');
    $('cRetry').addEventListener('click', function () { camp.retry(); });
  }
  function end() {
    var t = camp.tour(), op = camp.OPS[t.op], next = camp.OPS[t.op + 1];
    map();
    overMap('<p class="c-eyebrow">Operation ' + esc(op.name) + ' complete</p>' +
      '<h2>To be <span class="pen">continued</span></h2>' +
      '<p class="tag">' + (next && next.fork ? 'A fork, ' + esc(next.name) + ' or ' + esc((camp.OPS[t.op + 2] || next).name) + ', comes in the next release.' :
        next ? 'Operation ' + esc(next.name) + ' comes in the next release.' : '') + ' Your squad waits in the barracks.</p>' +
      // The operation's own star (it said "nobody was lost" for every operation until round 4).
      (t.stars[op.id] ? '<p class="tag">' + STAR + ' Gold star: ' + esc(op.star.replace(/\.$/, '').toLowerCase()) + '.</p>' : '') +
      '<div class="row"><button class="btn" type="button" id="cEndMap">Map</button><button class="btn ghost quit-btn" type="button" data-act="title">Save and quit</button></div>', 'cEndMap');
    $('cEndMap').addEventListener('click', map);
  }

  // ---------- the debrief ----------
  var pick = -1;
  function debrief() {
    var t = camp.tour(), d = t.debrief, op = camp.OPS[d.op];
    pick = -1;
    $('cDebriefBody').innerHTML =
      '<div class="c-starrow">' + (d.star ? STAR.replace('c-star', 'c-bigstar') : NO_STAR) + '<div><h2 class="c-title" id="cDebriefTitle">' + esc(op.name) + '</h2>' +
        '<p class="c-small">' + (d.star ? 'Gold star: ' + esc(op.star.replace(/\.$/, '').toLowerCase()) + '.' : 'No gold star: ' + esc(op.star.replace(/\.$/, '').toLowerCase()) + ' next time.') + '</p></div></div>' +
      (d.picks ? treeHtml(t) : bonusHtml(d));
    $('cTake').disabled = true; step = null;
    up(); only(['cDebrief']);
    var first = $('cDebriefBody').querySelector('.c-node.next, .c-slip'); if (first) first.focus({ preventScroll: true });
  }
  // The requisition tree (the pick from the layouts, round 5): a row each, taken steps in blue, each row's next step
  // dashed and pickable, the rest pencilled; the picked step's line under the tree.
  var step = null;
  function treeHtml(t) {
    var next = camp.treeNext(t), d = t.debrief;
    return '<p class="c-eyebrow">REQUISITION · PICK ONE' + (d.took && d.took.length ? ' MORE' : '') + '</p><p class="c-small">Supplies go on the shop shelf for the rest of the tour.</p>' +
      camp.TREE.map(function (r, ri) {
        return '<div class="c-trow"><span>' + esc(r.name) + '</span><div class="c-nodes" style="grid-template-columns:repeat(' + r.steps.length + ',minmax(0,1fr))">' + r.steps.map(function (id) {
          var it = camp.stepInfo(id), got = t.tree.indexOf(id) >= 0, nx = next[ri] === id;
          return nx ? '<button class="c-node next" type="button" aria-pressed="false" data-step="' + id + '">' + esc(it.name) + '</button>'
            : '<span class="c-node' + (got ? ' got' : '') + '">' + esc(it.name) + '</span>';
        }).join('') + '</div></div>';
      }).join('') +
      (d.star && d.bonus ? '<p class="c-small" style="color:#8a6d00">' + STAR + ' Gold star: one more pick after this, or a veteran or a medal.</p>' : '') +
      '<p class="c-pickline" id="cStepLine">Tap a dashed step to see what it does.</p>';
  }
  function bonusHtml(d) {
    return '<p class="c-eyebrow">' + STAR + ' GOLD STAR · PICK ONE</p><div class="c-slips" id="cSlips">' +
      d.bonus.map(function (r, i) { return '<button class="c-slip" type="button" aria-pressed="false" data-i="' + i + '"><b>' + esc(r.name) + '</b><span>' + esc(r.text) + '</span></button>'; }).join('') + '</div>';
  }
  $('cDebrief').addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('.c-node.next');
    if (n) {
      step = n.dataset.step; pick = -1;
      Array.prototype.forEach.call($('cDebriefBody').querySelectorAll('.c-node.next'), function (x) { x.setAttribute('aria-pressed', x === n ? 'true' : 'false'); });
      var it = camp.stepInfo(step);
      $('cStepLine').innerHTML = '<b>' + esc(it.name) + '</b> · ' + esc(it.desc);
      $('cTake').disabled = false;
      return;
    }
    var b = e.target.closest && e.target.closest('.c-slip');
    if (!b) return;
    pick = Number(b.dataset.i); step = null;
    Array.prototype.forEach.call($('cSlips').children, function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    $('cTake').disabled = false;
  });
  $('cTake').addEventListener('click', function () {
    var left = null;
    if (step) left = camp.takeStep(step); else if (pick >= 0) left = camp.takeBonus(pick);
    if (left === 'done') camp.showWhere(); else if (left) debrief();
  });

  // ---------- the shop (between operations) ----------
  // Everything on the shelf for the operation ahead: kit for the operation, radio calls until used. What's bought on
  // this visit can go back. "New" marks what the shelf gained since the tour last looked.
  var visit = [];
  function shop() {
    visit = [];
    drawShop();
    up(); only(['cShop']);
    focus('cShopDone');
  }
  function drawShop() {
    var t = camp.tour(), list = camp.gearList(t);
    $('cShopBody').innerHTML = '<div class="c-starrow" style="justify-content:space-between"><h2 class="c-title" id="cShopTitle">Shop</h2><span class="c-tags">' + t.bank + ' tags</span></div>' +
      '<p class="c-small">For ' + esc(camp.op().name) + '. Kit lasts the operation; a radio call lasts until it\'s used.</p>' +
      '<div class="c-gears">' + list.map(function (g) {
        var mine = visit.indexOf(g.id) >= 0;
        return '<div class="c-gear c-gearrow"><span class="c-gname">' + esc(g.name) + (g.fresh ? '<i class="c-new">new</i>' : '') + '<i class="c-lasts">' + esc(g.lasts) + '</i></span>' +
          '<span class="c-gdesc">' + esc(g.desc) + (g.have ? ' · have ' + g.have + (g.max !== Infinity ? '/' + g.max : '') : '') + '</span>' +
          '<span class="c-gbtns">' + (mine ? '<button class="c-link" type="button" data-back="' + g.id + '">Put back</button>' : '') +
          '<button class="c-buy" type="button" data-buy="' + g.id + '"' + (g.full || g.price > t.bank ? ' disabled' : '') + '>' + (g.full ? 'Full' : g.price) + '</button></span></div>';
      }).join('') + '</div>';
  }
  $('cShop').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-buy],[data-back]');
    if (!b) return;
    if (b.dataset.buy) { if (camp.buyGear(b.dataset.buy)) visit.push(b.dataset.buy); }
    else { var at = visit.lastIndexOf(b.dataset.back); if (at >= 0 && camp.returnGear(b.dataset.back)) visit.splice(at, 1); }
    var id = b.dataset.buy || b.dataset.back;
    drawShop();
    var again = $('cShopBody').querySelector('[data-buy="' + id + '"]'); if (again && !again.disabled) again.focus({ preventScroll: true });
  });
  $('cShopDone').addEventListener('click', function () { camp.seeGear(camp.gearList(camp.tour()).map(function (g) { return g.id; })); map(); });

  // ---------- the squad (between operations) ----------
  function barracks() {
    var t = camp.tour(), order = camp.deployOrder(t.squad), body = $('cBarracksBody'), out = camp.op().slots;
    body.innerHTML = '<div class="c-starrow" style="justify-content:space-between"><h2 class="c-title" id="cBarracksTitle">Squad</h2><span class="c-tags" id="cBank"></span></div>' +
      '<div class="c-bunks c-four" id="cBunks"></div><p class="c-small" id="cBunkNote"></p><p class="c-eyebrow">RECRUIT</p><div class="c-hires" id="cHires"></div>';
    $('cBank').textContent = t.bank + ' tags';
    var bunks = $('cBunks');
    for (var i = 0; i < camp.BARRACKS; i++) {
      var s = order[i], b = document.createElement('div');
      if (!s) { b.className = 'c-bunk empty'; b.textContent = 'empty'; bunks.appendChild(b); continue; }
      b.className = 'c-bunk';
      b.appendChild(fig(s, i));
      var n = document.createElement('b'); n.textContent = s.stripes ? camp.rankName(s) : 'rookie';
      var d = document.createElement('span'); d.textContent = camp.ROLE_NAME[s.type] + (s.trait ? ' · ' + s.trait : '');
      var k = document.createElement('span'); k.textContent = s.kills + (s.kills === 1 ? ' kill' : ' kills');
      if (s.trait) b.title = camp.TRAIT_TEXT[s.trait];
      b.appendChild(n); b.appendChild(d); b.appendChild(k); bunks.appendChild(b);
    }
    $('cBunkNote').textContent = out + ' go out on each mission at ' + camp.op().name + ': you pick who at prep.';
    var hires = $('cHires');
    if (t.squad.length < camp.BARRACKS) camp.ROLES.forEach(function (type) {
      if (!camp.hireable(t, type)) return;
      var price = camp.hirePrice(type), h = document.createElement('button');
      h.type = 'button'; h.className = 'c-hire'; h.textContent = camp.ROLE_NAME[type][0].toUpperCase() + camp.ROLE_NAME[type].slice(1) + ' ' + price;
      h.disabled = t.bank < price;
      h.setAttribute('aria-label', 'Recruit a ' + camp.ROLE_NAME[type] + ' for ' + price + ' tags');
      h.addEventListener('click', function () { if (camp.hire(type)) { barracks(); focus('cBarracksDone'); } });
      hires.appendChild(h);
    });
    if (t.squad.length >= camp.BARRACKS) hires.insertAdjacentHTML('beforeend', '<span class="c-small">Barracks full.</span>');
    $('cFallenLink').textContent = 'The fallen (' + t.fallen.length + ') →';
    up(); only(['cBarracks']);
    focus('cBarracksDone');
  }
  $('cBarracksDone').addEventListener('click', function () { map(); });
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
  // Ending the tour (the map's "End tour"): asks first, then the tour is gone and it's back to the title, where
  // Campaign starts a new one. Its save link still brings it back.
  function newCard() {
    var t = camp.tour();
    overMap('<h2>End this <span class="pen">tour?</span></h2>' +
      '<p class="tag">Tour ' + esc(camp.showCode(t.code)) + ' ends here, and its squad with it. Gold stars stay. A copied save link still brings it back.</p>' +
      '<div class="row"><button class="btn" type="button" id="cNewGo">End tour</button><button class="btn ghost" type="button" data-act="map">Cancel</button></div>', 'cNewGo');
    $('cNewGo').addEventListener('click', function () { camp.endTour(); toTitle(); });
  }
  // From the pause card (the only place it's offered): copied, or with no clipboard, the link in a field in its place.
  function copyLink(button) {
    var link = camp.linkFor(camp.tour()), copy = window.Rooms && Rooms.copy ? Rooms.copy(link) : Promise.resolve('failed');
    copy.then(function (r) {
      if (r === 'copied') { var was = button.textContent; button.textContent = 'Copied!'; setTimeout(function () { if (button.isConnected) button.textContent = was; }, 1500); return; }
      if (button.id === 'pauseLink') {
        var f = document.createElement('input'); f.className = 'c-field'; f.readOnly = true; f.value = link; f.id = 'pauseLinkField';
        f.setAttribute('aria-label', 'Save link');
        button.hidden = true; button.parentNode.insertBefore(f, button.nextSibling); f.focus(); f.select();
        return;
      }
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
    else if (act === 'squad') barracks();
    else if (act === 'gearshop') shop();
    else if (act === 'opmap') opMap();
    else if (act === 'tourmap') map();
    else if (act === 'reprep') prep(lost);
    else if (act === 'fallen') fallen();
    else if (act === 'bunks') only(['cBarracks']);
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
    // Always "Campaign": with a tour saved, the button asks Continue or New tour (tourChoice).
    $('campaignLabel').textContent = 'Campaign';
    campaignBtn.setAttribute('aria-label', 'Campaign');
    $('campaignNew').hidden = camp.seen();
    var p = camp.pending();
    if (p) linkArrived(p);
  };
  campaignBtn.addEventListener('click', function () { var saved = camp.savedTour(); if (saved) tourChoice(saved); else camp.open(); });
  // With a tour saved: Continue it, or start a New tour (which asks first, since the tour and its squad end).
  function where(t) {
    var op = camp.OPS[t.op];
    return t.at === 'end' ? op.name + ' done, waiting for the next release' : op.name + ', mission ' + Math.min(t.m + 1, t.missions.length) + ' of ' + t.missions.length;
  }
  function tourChoice(t) {
    card('<p class="c-eyebrow">TOUR ' + esc(camp.showCode(t.code)) + '</p><h2>Cam<span class="pen">paign</span></h2>' +
      '<p class="tag">' + esc(where(t)) + '. ' + t.squad.length + (t.squad.length === 1 ? ' soldier' : ' soldiers') + ' in the barracks.</p>' +
      '<div class="row"><button class="btn" type="button" id="cContinue">Continue</button><button class="btn ghost" type="button" id="cFresh">New tour</button></div>' +
      '<div class="c-links"><button class="c-link" type="button" data-act="title">Back</button></div>', 'cContinue');
    $('cContinue').addEventListener('click', function () { camp.open(); });
    $('cFresh').addEventListener('click', function () {
      card('<h2>New <span class="pen">tour?</span></h2>' +
        '<p class="tag">Tour ' + esc(camp.showCode(t.code)) + ' ends here, and its squad with it. Gold stars stay. A copied save link still brings it back.</p>' +
        '<div class="row"><button class="btn" type="button" id="cFreshGo">Start a new tour</button><button class="btn ghost" type="button" id="cFreshNo">Back</button></div>', 'cFreshNo');
      $('cFreshGo').addEventListener('click', function () { camp.endTour(); camp.open(); });
      $('cFreshNo').addEventListener('click', function () { tourChoice(t); });
    });
  }

  // The pause card's Copy save link (flow.js shows it for a kind of run with pauseLink).
  $('pauseLink').addEventListener('click', function () { var old = $('pauseLinkField'); if (old) old.remove(); copyLink($('pauseLink')); });
  $('resumeBtn').addEventListener('click', function () { var old = $('pauseLinkField'); if (old) old.remove(); });
  return { hide: hide, map: map, opMap: opMap, prep: prep, shop: shop, briefing: briefing, between: between, lost: lost, debrief: debrief, barracks: barracks, fallen: fallen, end: end,
    load: loadCard, copyLink: copyLink };
};
