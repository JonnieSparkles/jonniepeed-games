"""Pixel parity for the finished stages against a git ref (default origin/main).
Covers the intro, stairwell, 13th Floor, factory and lobby, long ride and roof; the quiet ride and full-size lobby boarding change intentionally.
Artifacts stay under work/. No test hooks ship. Run after the final game edit.
"""
import argparse
import functools
import hashlib
import http.server
import os
from pathlib import Path
import subprocess
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BRIDGE = '  window.parity = code => eval(code);\n  looping = false; RUN.force = 42;\n'
SCENES = {
    'floor13-opening': "floor.opening();",
    'floor13-accounts': "for(let i=0;i<300;i++)update(1/60);",
    'floor13-staff': "R.beat=1;R.beatT=5;floor.spawnFormation('v');for(let i=0;i<120;i++)update(1/60);",
    'floor13-copy': "R.beat=2;R.beatT=15;for(let i=0;i<120;i++)update(1/60);",
    'floor13-dark': "floor.startEvent('dark');for(let i=0;i<120;i++)update(1/60);",
    'floor13-shredder': "R.beat=2;floor.startBoss();for(let i=0;i<180;i++)update(1/60);",
    'floor13-clear': "R.souls=123;floor.bossDamage(10000,'blaster');R.phase='win';R.phaseT=3;",
}
for state in ['elevator', 'walk', 'flash', 'wake', 'odds', 'round1', 'round2', 'round3', 'quiet', 'return', 'flood', 'pinch', 'fusion', 'lines', 'beam', 'run', 'one', 'snap', 'dawn', 'clear']:
    SCENES['roof-' + state] = "floor.enter(%r);R.roof.t=.5;" % state
SCENES['roof-threats'] = "floor.enter('round2');floor.volley();floor.launchSnare();floor.startGust();for(let i=0;i<30;i++)update(1/60);"

# Earlier coverage stopped at the 13th Floor and roof. Protect every other stage around the quiet ride too.
for i in range(6):
    SCENES['intro-' + str(i)] = "startIntro();introLine(%d);intro.t=1;" % i
for i in range(3):
    SCENES['stairs-flight-' + str(i)] = "floor.startSection(%d);bull.inv=1e9;for(let i=0;i<120;i++)update(1/60);" % i
SCENES['stairs-katana'] = "floor.startSection(1);floor.Q.katana=true;R.arena.bare=false;floor.Q.glass=-1;"
SCENES['floor13-clear-card'] = "R.souls=123;R.phase='win';R.endT=130;endRun('clear');"
SCENES['floor48-boarding'] = "floor.startLobby(true);R.f48.lobby.t=floor.F48.lobby.dingAt+2;R.f48.lobby.ding=true;R.f48.lobby.going=true;bull.u=floor.F48.lobby.doorU;R.arena.out=R.f48.lobby.out=.65;"
SCENES['floor48-running'] = "bull.inv=1e9;for(let i=0;i<300;i++)update(1/60);"
SCENES['floor48-panic'] = "bull.inv=1e9;floor.lineDown(0);for(let i=0;i<120;i++)update(1/60);"
SCENES['floor48-collapse'] = "floor.startCollapse();for(let i=0;i<60;i++)update(1/60);"
for t in [.5, 3, 6]:
    SCENES['floor48-lobby-' + str(t)] = "floor.startLobby(true);for(let i=0;i<%d;i++)update(1/60);" % round(t * 60)
for t in [.5, 10, 16.5, 18.5, 20.5, 22.3, 24.4, 25.2, 30, 40, 50, 56, 58.8]:
    SCENES['elevator-long-' + str(t)] = "R.elevator.from=48;bull.u=.7;bull.inv=1e9;for(let i=0;i<%d;i++)update(1/60);" % round(t * 60)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def server(tree):
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(tree / 'site')))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def captures(browser, tree, url, out):
    source = (tree / 'site/unruggabull-ii/game.js').read_text().replace('  start();', BRIDGE + '  start();')
    result = {}
    # Reuse the game's cached art/renderer, resetting run and cosmetic seeds for each capture.
    # Rebuilding every sprite and the hall for every scene made expanded parity needlessly slow.
    context = browser.new_context(viewport={'width': 1000, 'height': 800})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.clock.install()
    page.add_init_script('''window.cosmeticSeed=42;
      Math.random=()=>{cosmeticSeed=(Math.imul(cosmeticSeed,1664525)+1013904223)>>>0;return cosmeticSeed/4294967296;};''')
    page.route('**/unruggabull-ii/game.js*', lambda route: route.fulfill(body=source, content_type='text/javascript'))
    page.goto(url + '/unruggabull-ii/')
    page.add_script_tag(content=(tree / 'site/unruggabull-ii/intro-stills.js').read_text())
    page.wait_for_function("parity('Intro.ready()')")
    for name, setup in SCENES.items():
        stage = name.split('-')[0]
        if stage == 'intro':
            stage = 'floor13'
        page.evaluate('(code)=>parity(code)', "cosmeticSeed=42;RUN.force=42;newRun(null,%r);RUN.force=null;setState('play');clearHeld();card.hidden=true;crawl.hidden=true;intro=null;" % stage + setup + 'draw();')
        assert not errors, (name, errors)
        pixels = page.evaluate("parity('Array.from(view.getImageData(0,0,480,270).data)')")
        result[name] = hashlib.sha256(bytes(pixels)).hexdigest()
        page.locator('#c').screenshot(path=str(out / (name + '.png')))
        if name == 'floor13-clear-card':
            dom = page.locator('#game').screenshot(path=str(out / (name + '-dom.png')))
            result[name + '-dom'] = hashlib.sha256(dom).hexdigest()
    context.close()
    print('Captured', len(result), 'views:', out.name, flush=True)
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--ref', default='origin/main')
    ap.add_argument('--out', default='work/parity/elevator')
    args = ap.parse_args()
    out = ROOT / args.out
    for part in ['main', 'current']:
        (out / part).mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='unrug-parity-') as tmp:
        tree = Path(tmp) / 'main'
        subprocess.run(['git', 'worktree', 'add', '--detach', str(tree), args.ref], cwd=ROOT, check=True, capture_output=True)
        try:
            old, new = server(tree), server(ROOT)
            with sync_playwright() as p:
                browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
                before = captures(browser, tree, 'http://127.0.0.1:' + str(old.server_port), out / 'main')
                after = captures(browser, ROOT, 'http://127.0.0.1:' + str(new.server_port), out / 'current')
                browser.close()
            mismatches = [key for key in before if before[key] != after[key]]
            # Intended: full-size lobby boarding, and the tower dial (G to R) over the lobby doors and in the long ride's car.
            # Remove these once the branch that changed them is on the ref.
            expected = ['floor48-boarding', 'floor48-lobby-0.5', 'floor48-lobby-3', 'floor48-lobby-6',
                        'elevator-long-0.5', 'elevator-long-10', 'elevator-long-56', 'elevator-long-58.8']
            assert all(key in expected for key in mismatches), mismatches
            print('PASS pixel parity:', len(before) - len(mismatches), 'captures identical to', args.ref,
                  '(including the 13th Floor clear card);', len(mismatches), 'differ as intended (lobby boarding, the tower dial)')
        finally:
            subprocess.run(['git', 'worktree', 'remove', '--force', str(tree)], cwd=ROOT, check=True, capture_output=True)

if __name__ == '__main__':
    main()
