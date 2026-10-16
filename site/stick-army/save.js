// Stick Army: saving a run at the shop and restoring it. Campaign (being designed) will save after every wave; Arcade
// never calls this. Classic script; load before game.js, which calls StickArmySave(world, game) once and keeps
// snapshotRun and restoreRun.
//
// A snapshot is plain JSON: the whole of S, the random streams as they stand, the id counters, the ink on the page
// and the mats' bounce. S is plain data apart from the random streams kept in it (each plane's, the wave's escort and
// sky timers), the shop's offers (ITEMS entries, which carry functions) and a few objects held in two places (the
// tent's soldier, the decoy); those are written as references and rebuilt. Waves are seeded, so a restored run plays
// on exactly as the run that wasn't interrupted would have.
//
// What doesn't come back: the online board's token and the play stats run (Arcade's; whoever restores decides what a
// restored run reports), a co-op room, and the cosmetic randomness (Math.random) that never changes an outcome.
var StickArmySave = function (world, game) {
  'use strict';
  var VERSION = 1;

  // ---------- encoding ----------
  // Objects and arrays seen more than once get an id where they first appear ({ $id }) and a reference after
  // ({ $ref }), so shared objects stay shared. Streams become { $rng: state }, shop items { $item: id }, and numbers
  // JSON can't hold { $num }. Anything else that isn't plain data is left out and its path listed in `lost`.
  function plain(v) { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function encode(root, lost) {
    var count = new Map(), ids = new Map(), next = 0;
    (function tally(v) {
      if (!v || typeof v !== 'object') return;
      if (count.has(v)) { count.set(v, count.get(v) + 1); return; }
      count.set(v, 1);
      if (game.ITEMS.indexOf(v) >= 0) return;
      if (Array.isArray(v)) v.forEach(tally); else if (plain(v)) Object.keys(v).forEach(function (k) { tally(v[k]); });
    })(root);
    function enc(v, path) {
      if (v === undefined) return { $u: 1 };
      if (typeof v === 'number') return isFinite(v) ? v : { $num: String(v) };
      if (typeof v === 'function') {
        if (typeof v.state === 'function') return { $rng: v.state() };
        lost.push(path); return null;
      }
      if (!v || typeof v !== 'object') return v;
      if (game.ITEMS.indexOf(v) >= 0) return { $item: v.id };
      if (ids.has(v)) return { $ref: ids.get(v) };
      var shared = count.get(v) > 1, id = shared ? next++ : -1;
      if (shared) ids.set(v, id);
      if (Array.isArray(v)) {
        var arr = v.map(function (e, i) { return enc(e, path + '[' + i + ']'); });
        return shared ? { $id: id, $arr: arr } : arr;
      }
      if (!plain(v)) { lost.push(path); return null; }
      var o = shared ? { $id: id } : {};
      Object.keys(v).forEach(function (k) { o[k] = enc(v[k], path + '.' + k); });
      return o;
    }
    return enc(root, 'S');
  }
  function decode(root) {
    var byId = {};
    function dec(v) {
      if (Array.isArray(v)) return v.map(dec);
      if (!v || typeof v !== 'object') return v;
      if ('$u' in v) return undefined;
      if ('$num' in v) return Number(v.$num);
      if ('$rng' in v) { var r = world.mulberry(0); r.state(v.$rng); return r; }
      if ('$item' in v) return game.ITEMS.find(function (it) { return it.id === v.$item; });
      if ('$ref' in v) return byId[v.$ref];
      if ('$arr' in v) { var a = []; byId[v.$id] = a; v.$arr.forEach(function (e) { a.push(dec(e)); }); return a; }
      var o = {};
      if ('$id' in v) byId[v.$id] = o;
      Object.keys(v).forEach(function (k) { if (k !== '$id') o[k] = dec(v[k]); });
      return o;
    }
    return dec(root);
  }

  // ---------- the run ----------
  // A snapshot of the run as it stands at the shop, or null anywhere else. `lost` lists anything in S that couldn't
  // be written (nothing, at the shop); a snapshot with something lost still restores, without it.
  function snapshotRun() {
    var S = world.S;
    if (!S || S.mode !== 'shop') return null;
    var lost = [];
    return { v: VERSION, run: game.streams(), ids: game.ids(), ink: game.ink(), tramps: world.TRAMPS.map(function (t) { return [t.dip, t.v]; }),
      S: encode(S, lost), lost: lost };
  }
  // Puts a snapshot's run back on the page, at the shop where it was taken. False if the snapshot isn't one.
  function restoreRun(snap) {
    if (!snap || snap.v !== VERSION || !snap.S) return false;
    var S = decode(snap.S);
    if (!S || S.mode !== 'shop') return false;
    world.clearInput();
    game.setStreams(snap.run); game.setIds(snap.ids);
    world.setState(S);
    world.resizeMats();
    world.TRAMPS.forEach(function (t, i) { var b = snap.tramps && snap.tramps[i]; t.dip = b ? b[0] : 0; t.v = b ? b[1] : 0; });
    game.setInk(snap.ink);
    var screens = world.screens();
    screens.title.hidden = true; screens.pause.hidden = true; screens.over.hidden = true; screens.win.hidden = true;
    world.fit();
    world.shopScreen.open();
    return true;
  }

  return { VERSION: VERSION, encode: encode, decode: decode, snapshotRun: snapshotRun, restoreRun: restoreRun };
};
