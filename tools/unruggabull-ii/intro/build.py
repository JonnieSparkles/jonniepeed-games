"""The intro as one page, to try on a phone before it goes in the game:
    python3 tools/unruggabull-ii/intro/build.py OUT.html [--artifact]

Inlines the game's bull.js, sprites.js, art.js, audio.js, portrait.js, intro-stills.js and intro.js into page.html.
The page plays the intro the way the game will (the same narration timing, taps and Skip). Not part of the site."""
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
SITE = HERE.parents[2] / 'site' / 'unruggabull-ii'
t = (HERE / 'page.html').read_text()
for key in ['bull', 'sprites', 'art', 'audio', 'portrait', 'intro-stills', 'intro']:
    t = t.replace('/*' + key + '*/', (SITE / (key + '.js')).read_text().replace('</script', '<\\/script'))
if '--artifact' in sys.argv:   # the artifact host adds its own doctype, html, head and body
    import re
    t = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', t, count=1)
    t = t.replace('</head>\n<body>\n', '', 1).replace('</body>\n</html>\n', '')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
out = Path(args[0] if args else 'intro.html')
out.write_text(t)
print(out, len(t), 'bytes')
