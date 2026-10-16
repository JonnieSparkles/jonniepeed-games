"""Stick Army's "nothing changed" check: the same six scenes drawn by two versions of the game, compared pixel for
pixel. Run it on any change that shouldn't change how the game looks (Campaign's groundwork, a refactor):

    python3 tests/stick-army/shots.py --ref main      # this checkout against main; fails on any difference
    python3 tests/stick-army/shots.py                 # just this checkout's scenes

It serves site/ itself (no server needed) and launches Chromium like the other harnesses (CHROMIUM selects a system
browser). The scenes: the title, a mid-wave page (wave 9, with a full kit and squad), the night raid, the
Dreadnought's smoke screen, the shop and the victory card. Each is built by driving the game directly (newGame,
startWave, update) under Playwright's fake clock, paused before the page loads, so the page's own frame loop never runs,
and with Math.random seeded before load, so even the cosmetic randomness is the same; then render() draws it once.
The same version gives the same pixels every time.

Pictures go to SCREENSHOTS (default /tmp/stick-army-shots): <scene>.png, and with --ref, <scene>.ref.png and, for
any scene that differs, <scene>.diff.png with the changed pixels in red. --ref takes a commit, branch or tag; it's
checked out in a temporary git worktree, so the checkout isn't touched.
"""
import argparse
import functools
import http.server
import os
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BRIDGE_AT = '  start();'

SEED_RANDOM = """
(() => { let a = 12345; Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
"""
NO_ANIM = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'

# Each scene is code evaluated in game.js's scope; then the line boil is fixed and the page drawn once. Keep them to
# names every version has had since round 20 (newGame, startWave, update, makeRecruit, openShop, showWin...), so
# --ref works against older commits.
STEP = 'function step(s) { for (var i = 0; i < Math.round(s * 60); i++) update(1 / 60); }\n'
KIT = """
S.mods.secondTramp = true; S.mods.slots = 6; S.mods.trench = 2; S.mods.stacks.sandbags = 2; S.mods.auto = true; S.mods.wire = true;
S.mods.hospital = true; S.mods.flag = true; S.flagUp = 1; resizeMats();
['rifle', 'engineer', 'bazooka', 'medic', 'sniper'].forEach(function (t, i) { var r = makeRecruit(SLOT_ORDER[i], t); r.waves = 4 * i; r.rank = i; r.name = 'Doodle' + i; S.recruits.push(r); });
"""
def run(seed):
    return STEP + 'RUN.force = %d; newGame(); RUN.force = null;' % seed + KIT + 'S.hint = false;'
SCENES = {
    'title': 'S.t = 0;',
    'midwave': run(4242) + 'startWave(9); S.turrets[0].aim = -1.2; keys.fire = true; step(6); keys.fire = false;'
               ' S.turrets[0].aim = -2.1; keys.fire = true; step(4); keys.fire = false;',
    'night': run(4243) + 'startWave(16); S.turrets[0].aim = -0.9; step(5); keys.fire = true; step(2); keys.fire = false;',
    'smoke': run(4244) + 'startWave(7); step(3); SKY.smokeStart(1); SKY.smokePot(120, 606); SKY.smokePot(300, 606); S.night = 1; S.smoke.t = 1.1;',
    'shop': run(4245) + 'startWave(8); S.players[0].tags = 420; S.planes = []; S.troopers = []; S.bombs = []; S.tanks = []; openShop();',
    'victory': run(4246) + 'startWave(20); step(1); S.planes = []; S.troopers = []; S.bombs = []; S.finalWon = true;'
               ' S.score = 123456; S.played = 905; showWin();',
}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(site):
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(site)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, 'http://127.0.0.1:%d' % server.server_port


def shoot(browser, tree, out, suffix):
    """Draws every scene with the game in tree (a checkout), into out/<scene><suffix>.png."""
    source = (tree / 'site/stick-army/game.js').read_text()
    if source.count(BRIDGE_AT) != 1:
        sys.exit('%s: the bridge point %r should be in game.js once' % (tree, BRIDGE_AT))
    source = source.replace(BRIDGE_AT, '  window.armyTest = function (code) { return eval(code); };\n' + BRIDGE_AT, 1)
    server, base = serve(tree / 'site')
    shots = {}
    try:
        for name, code in SCENES.items():
            page = browser.new_page(viewport={'width': 900, 'height': 900}, device_scale_factor=1)
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.add_init_script(SEED_RANDOM)
            page.route('**/stick-army/game.js*', lambda route: route.fulfill(body=source, content_type='application/javascript'))
            # Nothing over the network: the scores and stats calls fail quietly, as offline.
            page.route('**/scores.jonniepeed.games/**', lambda route: route.abort())
            page.route('**/stats.jonniepeed.games/**', lambda route: route.abort())
            # A clock that never moves: install() alone lets fake time tick on, and the title's demo would run for
            # however long the page took to load.
            page.clock.install(time=0)
            page.clock.pause_at(1000)
            page.goto(base + '/stick-army/')
            page.add_style_tag(content=NO_ANIM)
            page.evaluate('document.fonts.ready.then(() => 1)')
            page.evaluate('(c) => armyTest(c)', code + '\nboil = 0; render();')
            path = out / (name + suffix + '.png')
            page.screenshot(path=str(path))
            page.close()
            if errors:
                sys.exit('%s, %s: page errors %s' % (tree, name, errors))
            shots[name] = path
    finally:
        server.shutdown()
    return shots


def compare(a, b, diff_path):
    """True when the two pictures are identical; otherwise writes the changed pixels in red over a faded copy."""
    from PIL import Image, ImageChops
    ia, ib = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    if ia.size != ib.size:
        return False, 'sizes %s and %s' % (ia.size, ib.size)
    box = ImageChops.difference(ia, ib).getbbox()
    if not box:
        return True, ''
    mask = ImageChops.difference(ia, ib).convert('L').point(lambda v: 255 if v else 0)
    faded = Image.blend(ia, Image.new('RGB', ia.size, 'white'), 0.7)
    faded.paste(Image.new('RGB', ia.size, (220, 0, 0)), mask=mask)
    faded.save(diff_path)
    changed = mask.histogram()[255]
    return False, '%d pixels in %s' % (changed, box)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--ref', help='also draw the scenes with this commit and compare (e.g. main); fails on any difference')
    args = ap.parse_args()
    out = Path(os.environ.get('SCREENSHOTS', '/tmp/stick-army-shots'))
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('*.diff.png'):
        old.unlink()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
        mine = shoot(browser, ROOT, out, '')
        if not args.ref:
            browser.close()
            print('Scenes: %s (%s)' % (out, ', '.join(mine)))
            return
        worktree = Path(tempfile.mkdtemp(prefix='stick-army-shots-'))
        subprocess.check_call(['git', 'worktree', 'add', '--detach', '--quiet', str(worktree), args.ref], cwd=ROOT)
        try:
            theirs = shoot(browser, worktree, out, '.ref')
        finally:
            subprocess.call(['git', 'worktree', 'remove', '--force', str(worktree)], cwd=ROOT)
        browser.close()
    bad = 0
    for name in SCENES:
        same, why = compare(mine[name], theirs[name], out / (name + '.diff.png'))
        print('%-4s %-8s %s' % ('PASS' if same else 'FAIL', name, 'identical to ' + args.ref if same else 'differs from %s: %s' % (args.ref, why)))
        bad += not same
    print('Scenes: %s' % out)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
