"""The long ride as one playable page: python3 tools/unruggabull-ii/long-ride/build.py OUT.html

A design prototype of the long elevator ride (Oct 2026), not part of the site. It inlines the game's bull.js, sprites.js
and art.js with synth.js (the original storyboard's chip synth and its Horns Up) and ride.js (the scene, the fight and the
controls) into page.html. docs/games/unruggabull-ii/long-ride-plan.md says what it decided and how it moves into the game."""
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2] / 'site' / 'unruggabull-ii'
t = (HERE / 'page.html').read_text()
for key, src in [('BULL', SITE / 'bull.js'), ('SPRITES', SITE / 'sprites.js'), ('ART', SITE / 'art.js'), ('SYNTH', HERE / 'synth.js'), ('RIDE', HERE / 'ride.js')]:
    t = t.replace('/*' + key + '*/', src.read_text().replace('</script', '<\\/script'))
out = Path(sys.argv[1] if len(sys.argv) > 1 else 'long-ride.html')
out.write_text(t)
print(out, len(t), 'bytes')
