"""Pixel parity for the finished stages against a git ref (default origin/main).
The only excluded view is Floor 13's DOM clear card, whose new elevator button is intentional.
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
    for name, setup in SCENES.items():
        context = browser.new_context(viewport={'width': 1000, 'height': 800})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.clock.install()
        page.add_init_script('''let cosmeticSeed=42;
          Math.random=()=>{cosmeticSeed=(Math.imul(cosmeticSeed,1664525)+1013904223)>>>0;return cosmeticSeed/4294967296;};''')
        page.route('**/unruggabull-ii/game.js*', lambda route: route.fulfill(body=source, content_type='text/javascript'))
        page.goto(url + '/unruggabull-ii/')
        stage = 'roof' if name.startswith('roof-') else 'floor13'
        page.evaluate('(code)=>parity(code)', "RUN.force=42;newRun(null,%r);RUN.force=null;setState('play');clearHeld();" % stage + setup + 'draw();')
        assert not errors, (name, errors)
        pixels = page.evaluate("parity('Array.from(view.getImageData(0,0,480,270).data)')")
        result[name] = hashlib.sha256(bytes(pixels)).hexdigest()
        page.locator('#c').screenshot(path=str(out / (name + '.png')))
        context.close()
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
            assert not mismatches, mismatches
            print('PASS pixel parity:', len(before), 'finished-stage canvas captures identical to', args.ref)
        finally:
            subprocess.run(['git', 'worktree', 'remove', '--force', str(tree)], cwd=ROOT, check=True, capture_output=True)

if __name__ == '__main__':
    main()
