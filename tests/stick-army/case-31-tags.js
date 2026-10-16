// Dog tags go through game.js's four helpers (tagsOf, gainTags, takeTags, spendTags), so solo and co-op wallets
// stay right: a new reward written as `p.tags += n` (or the old `S.coins += n`) would pay the wrong player in
// co-op. This reads the game's own files and fails on any other write. The shop's put-back restoring its snapshot
// is the one exception.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function source(name) { var x = new XMLHttpRequest(); x.open('GET', name, false); x.send(); check(x.status === 200, 'read ' + name); return x.responseText; }
  var FILES = ['game.js', 'units.js', 'sky.js', 'squad.js', 'dreadnought.js', 'shop.js', 'shop-screen.js', 'coop.js', 'board.js', 'tune.js'];
  var WRITE = /\.tags\s*(\+\+|--|[+\-*]?=(?!=))/, bad = [];
  FILES.forEach(function (name) {
    var text = source(name);
    check(!/\bS\.coins\b|\bw\.S\.coins\b/.test(text), name + ' uses S.coins; dog tags are each player\'s (tagsOf)');
    if (name === 'game.js') {
      var a = text.indexOf('function tagsOf('), b = text.indexOf('var gunner = null;');
      check(a > 0 && b > a, 'game.js keeps its tag helpers together');
      text = text.slice(0, a) + text.slice(b);
    }
    text.split('\n').forEach(function (line, i) {
      if (name === 'shop.js' && /b\.tags\.forEach/.test(line)) return;   // put-back restores the visit's snapshot
      if (WRITE.test(line)) bad.push(name + ':' + (i + 1) + ' ' + line.trim().slice(0, 80));
    });
  });
  check(!bad.length, 'dog tags written outside the helpers: ' + bad.join(' | '));
  return 'ok';
})();
