"""Stick Army's "nothing changed" check: the same six scenes drawn by two versions of the game, compared pixel for
pixel. Run it on any change that shouldn't change how Arcade looks (Campaign, a refactor):

    python3 tests/stick-army/shots.py --ref main      # this checkout against main; fails on any difference
    python3 tests/stick-army/shots.py                 # just this checkout's scenes
    python3 tests/stick-army/shots.py --campaign      # also Campaign's screens, at three sizes and full screen

Campaign's screens have nothing to compare with yet; they're drawn for looking at, at phone portrait, short landscape
and notebook sizes, and at phone portrait in full screen (campaign-<scene>-<size>.png), with the title as it is once
Campaign is unlocked. Without the unlock the title is Arcade's, and compared like the rest.
--ref takes what git does: after a shallow clone, a local `main` may be older than `origin/main`.

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
# Campaign's screens, from one tour (K7QMR2) with a small squad, each scene in game.js's scope.
CAMP = """
var c = world.campaign, t = c.newTour('K7QMR2');
t.squad = [{ id: 11, type: 'rifle', stripes: 1, kills: 23 }, { id: 14, type: 'engineer', stripes: 1, kills: 6 }, { id: 19, type: 'sniper', stripes: 0, kills: 4 },
  { id: 22, type: 'rifle', stripes: 0, kills: 1 }];
t.fallen = [{ id: 16, type: 'bazooka', stripes: 0, kills: 9, op: 0, m: 0 }]; t.bank = 140; t.nextId = 30;
t.last = { won: true, mission: 'First contact', caught: 5, planes: 21, time: 70, fresh: 4, fell: [16] };
c.nameAll(t); c.write();
"""
RD = """
var c = world.campaign;
function codeWith(w) { for (var v = 1; v < 500; v++) { var k = c.codeText(v * 31337); if (c.weatherFor(c.freshTour(k), 1) === w) return k; } }
var fogCode = codeWith('fog'), rainCode = codeWith('rain');
var t = c.freshTour('K7QMR2'); t.op = 1; t.missions = c.missionsFor(t, 1);
t.squad = [{ id: 11, type: 'rifle', stripes: 2, kills: 40 }, { id: 14, type: 'engineer', stripes: 1, kills: 9 }, { id: 19, type: 'sniper', stripes: 1, kills: 12 },
  { id: 22, type: 'radio', stripes: 0, kills: 0 }, { id: 23, type: 'rifle', stripes: 0, kills: 3 }];
t.nextId = 30; t.at = 'map'; c.nameAll(t); c.setTour(t);
"""
BS = """
var c = world.campaign;
function clearCode() { for (var v = 1; v < 500; v++) { var k = c.codeText(v * 31337); if (c.weatherFor(c.freshTour(k), 2) === 'clear') return k; } }
var t = c.freshTour(clearCode()); t.op = 2; t.missions = c.missionsFor(t, 2); t.opBalloons = 3;
t.squad = [{ id: 11, type: 'rifle', stripes: 2, kills: 52 }, { id: 14, type: 'engineer', stripes: 1, kills: 11 }, { id: 19, type: 'sniper', stripes: 1, kills: 18 },
  { id: 22, type: 'radio', stripes: 1, kills: 2 }, { id: 25, type: 'mg', stripes: 0, kills: 6 }];
t.deploy = [11, 25, 19, 14]; t.nextId = 30; t.at = 'map'; c.nameAll(t); c.setTour(t);
"""
FZ = """
var c = world.campaign;
function clearCode() { for (var v = 1; v < 500; v++) { var k = c.codeText(v * 31337); if (c.weatherFor(c.freshTour(k), 3) === 'clear') return k; } }
var t = c.freshTour(clearCode()); t.op = 3; t.missions = c.missionsFor(t, 3);
t.squad = [{ id: 11, type: 'rifle', stripes: 3, kills: 64 }, { id: 14, type: 'engineer', stripes: 2, kills: 13 }, { id: 19, type: 'sniper', stripes: 2, kills: 25 },
  { id: 22, type: 'radio', stripes: 1, kills: 2 }, { id: 25, type: 'mg', stripes: 1, kills: 17 }, { id: 26, type: 'medic', stripes: 0, kills: 0 }];
t.nextId = 30; t.at = 'map'; t.gun = 'heavy'; c.nameAll(t); c.setTour(t);
function zepIn() { for (var i = 0; i < 60 * 30; i++) { update(1 / 60); var z = S.planes.find(function (p) { return p.kind === 'zeppelin'; }); if (z && z.entered) return z; } }
"""
def mission(at):
    return CAMP + STEP + "t.m = 1; c.startMission(); step(5); t.at = '%s'; S.mode = 'between';" % at
CAMPAIGN = {
    'title': 'localStorage.setItem(world.campaign.keys.unlock, "true"); titleScene(); S.t = 0;',
    'map': CAMP + 'c.screens.map();',
    'choice': CAMP + "t.m = 1; c.write(); titleScene(); document.getElementById('campaignBtn').click();",
    'briefing': CAMP + 'c.screens.map(); c.screens.briefing();',
    'mission': CAMP + STEP + 't.m = 1; c.startMission(); step(7);',
    'between': mission('between') + 'c.screens.between();',
    'lost': mission('lost') + "t.last = { won: false, mission: 'Downed pilot', cause: 'Two pilots were lost.', fell: [16] }; c.screens.lost();",
    'debrief': CAMP + "t.squad.forEach(function (s) { s.stripes++; }); c.nameAll(t); t.at = 'debrief'; t.debrief = { op: 0, star: false, promoted: t.squad.map(function (s) { return { id: s.id, named: s.stripes === 1 }; }),"
               " picks: 1, bonus: null }; c.screens.debrief();",
    'barracks': CAMP + "t.at = 'barracks'; c.screens.barracks();",
    'fallen': CAMP + "t.at = 'barracks'; c.screens.barracks(); c.screens.fallen();",
    'end': CAMP + "t.at = 'end'; t.stars['boot-camp'] = true; c.screens.end();",
    # Recruitment Drive (round 2): its briefing (weather, intel), the deploy screen, a mission with a straw dummy
    # coming down, fog and rain over the field, and the pause card's objective. RD picks codes with that weather.
    'rd-briefing': RD + "c.screens.map(); c.screens.briefing();",
    'deploy': RD + "c.screens.deploy(function () {});",
    'dummies': RD + STEP + "c.startMission(); step(4); var d = spawnTrooper(120, 330, { type: 'rifle', fall: 1, sway: 0, armor: 0, dummy: true }); d.open = 1; spawnTrooper(250, 300, { type: 'rifle', fall: 1, sway: 2, armor: 0 }).open = 1; step(0.2);",
    'fog': RD.replace("'K7QMR2'", "fogCode") + STEP + "c.startMission(); step(6);",
    'rain': RD.replace("'K7QMR2'", "rainCode") + STEP + "c.startMission(); step(6);",
    'pause': RD + STEP + "c.startMission(); step(5); togglePause();",
    # Balloon Season (round 3): the map and briefing, barrage balloons up on their cables with the machine gunner
    # firing at a chute coming in low, and one popped with its cable falling.
    'bs-map': BS + "c.screens.map();",
    'bs-briefing': BS + "c.screens.map(); c.screens.briefing();",
    'barrage': BS + STEP + "c.startMission(); step(4); var l = spawnTrooper(330, 420, { type: 'rifle', fall: 1, sway: 0, armor: 0 }); l.open = 1; step(0.6);",
    # The set pieces and the requisition tree (round 5): First contact with no mat, Downed pilot's smoking blue plane
    # with a fighter on its tail and the fighter firing at its pilot coming over the mat, Hold the
    # radio's mast with a lander at it, The officer jumping, HQ's supply plane in Supply drop, and the debrief's tree
    # after Boot Camp with the gold star.
    'banner': CAMP + STEP + "t.tree = []; t.m = 1; c.write(); c.startMission(); step(1);",
    'end-tour': CAMP + "c.screens.map(); document.querySelector('[data-act=new]').click();",
    'first-contact': CAMP + STEP + "t.tree = []; t.m = 0; t.squad = []; c.write(); c.startMission(); step(6);",
    'chase': CAMP + STEP + "t.tree = []; t.m = 1; t.squad = []; c.write(); c.startMission(); step(6);",
    'pilot': CAMP + STEP + "t.tree = []; t.m = 1; t.squad = []; c.write(); c.startMission(); step(11.5);",
    'radio': CAMP + STEP + "t.tree = []; t.m = 2; c.write(); c.startMission(); step(14);",
    'officer': RD + STEP + "t.tree = ['sandbags']; t.missions[0] = 'the-officer'; c.write(); c.startMission(); step(8);",
    'supply': RD + STEP + "t.tree = ['sandbags']; t.missions[0] = 'supply-drop'; c.write(); c.startMission(); for (var i = 0; i < 60 * 40 && !S.hq.length; i++) update(1 / 60); step(1.2);",
    'tree': CAMP + "t.tree = ['double']; t.at = 'debrief'; t.debrief = { op: 0, star: true, promoted: t.squad.map(function (s) { return { id: s.id, named: false }; }), picks: 1,"
            " bonus: [{ kind: 'pick', name: 'Another requisition', text: 'One more step on the tree.' }, { kind: 'medal', id: 11, name: 'Medal', text: '+1 stripe for your top gun.' }] }; c.write(); c.screens.debrief();"
            " document.querySelectorAll('#cDebriefBody .c-node.next')[1].click();",
    # Balloon Season's and First Zeppelin's set pieces (round 6).
    'spotter': BS + STEP + "t.tree = []; t.missions[0] = 'spotter-balloon'; c.write(); c.startMission(); step(6.5);",
    'bigone': BS + STEP + "t.tree = []; t.missions[0] = 'the-big-one'; c.write(); c.startMission(); step(16);",
    'bay': FZ + STEP + "t.tree = []; t.missions[0] = 'bay-doors'; c.write(); c.startMission(); var z = zepIn(); z.bombT = 2.4; step(0.1);",
    'recon': FZ + STEP + "t.tree = []; t.missions[0] = 'recon-run'; c.write(); c.startMission(); step(7);",
    'stand': FZ + STEP + "t.tree = []; t.missions[0] = 'last-stand'; c.write(); c.startMission(); step(6);",
    # First Zeppelin (round 4): the briefing (the armory line), the deploy screen's gun row, the heavy gun firing at a
    # zeppelin, the armored boss, and its crew bailing out.
    'fz-briefing': FZ + "c.screens.map(); c.screens.briefing();",
    'fz-deploy': FZ + "c.screens.deploy(function () {});",
    'heavy': FZ + STEP + "c.startMission(); var z = zepIn(); var tu = S.turrets[0]; tu.aim = Math.atan2(z.y + 20 - TUR.y, z.x - tu.x); fireVolley(tu); step(0.15); tu.fireCD = 0; fireVolley(tu); step(0.1);",
    'boss': FZ.replace("t.missions = c.missionsFor(t, 3);", "t.missions = c.missionsFor(t, 3); t.m = 3;") + STEP + "c.startMission(); zepIn(); step(1);",
    'crew': FZ.replace("t.missions = c.missionsFor(t, 3);", "t.missions = c.missionsFor(t, 3); t.m = 3;") + STEP + "c.startMission(); var z = zepIn(); zeppelinDown(z, 'player'); step(1.2);",
    'barrage-pop': BS + STEP + "c.startMission(); step(4); var q = S.barrage[0]; q.hp = 1; S.bullets.push({ x: q.x, y: q.cy + 30, vx: 0, vy: -700, life: 1, owner: 'player', dead: false }); step(0.5);",
}
SIZES = {'phone': (390, 844, False), 'landscape': (844, 390, False), 'notebook': (1280, 800, False), 'phone-full': (390, 844, True)}


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


def shoot(browser, tree, out, suffix, scenes=None, size=(900, 900, False)):
    """Draws every scene with the game in tree (a checkout), into out/<scene><suffix>.png: Arcade's, or the scenes
    given, at a size (width, height, full screen)."""
    source = (tree / 'site/stick-army/game.js').read_text()
    if source.count(BRIDGE_AT) != 1:
        sys.exit('%s: the bridge point %r should be in game.js once' % (tree, BRIDGE_AT))
    source = source.replace(BRIDGE_AT, '  window.armyTest = function (code) { return eval(code); };\n' + BRIDGE_AT, 1)
    server, base = serve(tree / 'site')
    shots = {}
    try:
        for name, code in (scenes or SCENES).items():
            page = browser.new_page(viewport={'width': size[0], 'height': size[1]}, device_scale_factor=1)
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.add_init_script(SEED_RANDOM)
            page.add_init_script('try { localStorage.clear(); } catch (e) {}')
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
            page.evaluate('(c) => armyTest(c)', code + ('\nsetFull(true);' if size[2] else '') + '\nboil = 0; render();')
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
    ap.add_argument('--campaign', action='store_true', help="also draw Campaign's screens at three sizes and full screen")
    args = ap.parse_args()
    out = Path(os.environ.get('SCREENSHOTS', '/tmp/stick-army-shots'))
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('*.diff.png'):
        old.unlink()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
        mine = shoot(browser, ROOT, out, '')
        if args.campaign:
            for size, dims in SIZES.items():
                shoot(browser, ROOT, out, '-' + size, {'campaign-' + k: v for k, v in CAMPAIGN.items()}, dims)
            print('Campaign: %s (campaign-<scene>-<size>.png: %s)' % (out, ', '.join(SIZES)))
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
