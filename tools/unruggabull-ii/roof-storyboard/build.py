"""The roof storyboard as one page: python3 tools/unruggabull-ii/roof-storyboard/build.py OUT.html

Inlines the game's bull.js, sprites.js and art.js with board.js (the frames) into page.html. Not part of the site."""
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2] / 'site' / 'unruggabull-ii'
t = (HERE / 'page.html').read_text()
for key, src in [('BULL', SITE / 'bull.js'), ('SPRITES', SITE / 'sprites.js'), ('ART', SITE / 'art.js'), ('BOARD', HERE / 'board.js')]:
    t = t.replace('/*' + key + '*/', src.read_text().replace('</script', '<\\/script'))
out = Path(sys.argv[1] if len(sys.argv) > 1 else 'roof-storyboard.html')
out.write_text(t)
print(out, len(t), 'bytes')
