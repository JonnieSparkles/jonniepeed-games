// The Shredder's voice (owner, Oct 14): a machine talking (see roof_audio.py for its level), a "nearly beaten" bank that
// keeps going instead of firing once, and a line when it shakes off the finish's stun.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  RUN.force = 3636; startRun(); bull.inv = 1e9;
  R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss;
  const quiet = () => { R.projs = []; R.rows = []; R.talk = null; R.banner = null; R.pull.st = 'idle'; R.pull.next = 1e9; b.jam = 0; b.volley = null; b.rally = null; R.roll = null; b.dark = null; b.tauntT = 0; b.atk = 1e9; b.surgeAt = 0; };
  const lows = [];
  quiet(); b.hp = 14; update(1 / 60); b.dark = null;   // into phase 3 first (its own line)
  b.taunts = {};
  for (let k = 0; k < 4; k++) { quiet(); b.hp = 14; R.freeze = 0; update(1 / 60); lows.push(R.talk && R.talk.text); }
  check(lows[0] === TAUNTS.low[0] && lows[1] === TAUNTS.low[1] && lows[2] === TAUNTS.low[2] && lows[3] === TAUNTS.low[0], 'nearly beaten, it keeps talking, round and round (' + lows + ')');
  check(TAUNTS.low.length === 3 && !TAUNTS.low.concat(TAUNTS.reboot).some(l => /TONER/.test(l)), 'three lines, and no toner: it isn\'t a printer');
  // never over the finish
  quiet(); b.hp = 12; b.final = { st: 'fire', t: 0 }; b.jam = b.jamMax = 9; update(1 / 60);
  check(!R.talk, 'no taunt over the finish');
  // the window runs out: it says so
  const said = [];
  for (let k = 0; k < 4; k++) { quiet(); b.hp = 12; b.final = { st: 'fire', t: 0 }; b.jam = .01; R.freeze = 0; update(1 / 60); said.push(R.talk && R.talk.text); }
  check(said[0] === 'SYSTEM RESTORED.' && said[1] === 'STILL RUNNING.' && said[2] === 'TRY AGAIN LATER.' && said[3] === 'SYSTEM RESTORED.', 'shaking off the stun, it says a line (' + said + ')');
  check(R.talk && R.talk.who === 'shredder', 'in its own voice');
})();
