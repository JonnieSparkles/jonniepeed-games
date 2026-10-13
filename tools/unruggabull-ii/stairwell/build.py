"""The stairwell's two moments and its music takes as one page: python3 tools/unruggabull-ii/stairwell/build.py OUT.html

A design page (October 2026), not part of the site, built the way the long ride's prototype was. It inlines the game's
bull.js, sprites.js, art.js, render.js and sets13.js with its music (audio.js and music-floor.js, from --music REF
when the 13th Floor's cold open isn't on this checkout yet, e.g. --music pr95), then music-stairs.js (the takes) and
mock.js (the scenes and the controls) into page.html. With --page climb it builds the playable climb instead
(climb.html, with climb.js), which uses mock.js's art and sounds."""
import subprocess
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SITE = ROOT / 'site' / 'unruggabull-ii'
args = sys.argv[1:]
ref = None
if '--music' in args:
    i = args.index('--music'); ref = args[i + 1]; del args[i:i + 2]


def site(name, from_ref=None):
    if from_ref:
        return subprocess.run(['git', '-C', str(ROOT), 'show', f'{from_ref}:site/unruggabull-ii/{name}'], check=True, capture_output=True, text=True).stdout
    return (SITE / name).read_text()


page = 'page.html'
if '--page' in args:
    i = args.index('--page'); page = args[i + 1] + '.html'; del args[i:i + 2]
t = (HERE / page).read_text()
parts = [('BULL', site('bull.js')), ('SPRITES', site('sprites.js')), ('ART', site('art.js')), ('RENDER', site('render.js')),
         ('SETS', site('sets13.js')), ('FLOORMUSIC', site('music-floor.js', ref)), ('AUDIO', site('audio.js', ref)),
         ('NEON', (HERE / 'neon.js').read_text()), ('STAIRSMUSIC', (HERE / 'music-stairs.js').read_text()), ('MOCK', (HERE / 'mock.js').read_text()), ('CLIMB', (HERE / 'climb.js').read_text())]
for key, src in parts:
    t = t.replace('/*' + key + '*/', src.replace('</script', '<\\/script'))
out = Path(args[0] if args else 'stairwell.html')
out.write_text(t)
print(out, len(t), 'bytes')
