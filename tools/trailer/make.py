"""Trailers: capture scripted gameplay frame by frame, re-render the game's own sound, add music and text, cut.

    python3 tools/trailer/make.py dont-step-on-a-crack --dry        # plays every take without filming; checks the cut
    python3 tools/trailer/make.py dont-step-on-a-crack              # the whole trailer
    python3 tools/trailer/make.py dont-step-on-a-crack --takes C    # re-shoot one take, keep the others
    python3 tools/trailer/make.py dont-step-on-a-crack --cut-only   # re-cut from the takes you have

Run by hand. Serves site/ itself and launches Chromium like the other harnesses (CHROMIUM selects a system
browser). A game opts in with tests/<slug>/trailer/: trailer.json (page, framing, sound object, frame hook),
takes.json (seeded plans), director.js (plays the game), trailer.css, layers.html, shots.py and, for new music,
music.py.
Output goes to work/trailer/<slug>/ (git-ignored): <slug>-trailer.mp4 (named by game, so a
downloaded or uploaded copy says what it is), sheet.jpg, the takes, music and layers.
See docs/guides/04-trailers.md.
"""
import argparse
import functools
import http.server
import importlib.util
import json
import multiprocessing
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
import capture  # noqa: E402
import cut  # noqa: E402
import inspect  # noqa: E402
import layers  # noqa: E402
import media  # noqa: E402
import sound  # noqa: E402


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def site_dir(cfg):
    """The folder the game is served from: this repo's site/, or trailer.json's "site" for a game kept in its own
    repo (a path from this repo's root, such as ../unruggabull-the-game: a checkout of that repo)."""
    return (ROOT / cfg.get('site', 'site')).resolve()


def serve(directory=None):
    handler = functools.partial(QuietHandler, directory=str(directory or ROOT / 'site'))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, 'http://127.0.0.1:%d/' % server.server_port


def load(path, name):
    sys.path.insert(0, str(path.parent))
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def shoot(job):
    """One take, in its own process and browser, with its own server."""
    slug, name, dry, out = job
    from playwright.sync_api import sync_playwright
    game_dir = ROOT / 'tests' / slug / 'trailer'
    cfg = json.loads((game_dir / 'trailer.json').read_text())
    take = json.loads((game_dir / 'takes.json').read_text())[name]
    server, base = serve(site_dir(cfg))
    try:
        with sync_playwright() as pw:
            d = capture.capture(pw, base, game_dir, cfg, name, take, Path(out) / ('take' + name), dry=dry, log=lambda s: print(s, flush=True))
            # games whose sound is re-rendered in one pass over the cut (audio.score) skip the per-take render
            if not dry and d['done'] and cfg['audio'].get('media'):
                media.render(cfg, site_dir(cfg), Path(out) / ('take' + name), log=lambda s: print(s, flush=True))
            elif not dry and d['done'] and not cfg['audio'].get('score'):
                sound.render(pw, base, cfg, Path(out) / ('take' + name), log=lambda s: print(s, flush=True))
    finally:
        server.shutdown()
    return name, d['done']


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('slug')
    ap.add_argument('--dry', action='store_true', help='play the takes without screenshots or sound, then check the cut can be made')
    ap.add_argument('--takes', help='comma-separated takes to shoot (default: all); the others are reused')
    ap.add_argument('--cut-only', action='store_true', help="don't shoot; re-cut from the takes already in the output folder")
    ap.add_argument('--jobs', type=int, default=3, help='takes shot at once (default 3)')
    ap.add_argument('--out', help='output folder (default work/trailer/<slug>/)')
    args = ap.parse_args()

    game_dir = ROOT / 'tests' / args.slug / 'trailer'
    if not (game_dir / 'trailer.json').is_file():
        sys.exit('tests/%s/trailer/trailer.json not found; see docs/guides/04-trailers.md' % args.slug)
    cfg = json.loads((game_dir / 'trailer.json').read_text())
    names = list(json.loads((game_dir / 'takes.json').read_text()))
    out = Path(args.out) if args.out else ROOT / 'work' / 'trailer' / args.slug
    if args.dry:
        out = out / 'dry'
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    if not args.cut_only:
        todo = args.takes.split(',') if args.takes else names
        unknown = set(todo) - set(names)
        if unknown:
            sys.exit('no such take: %s (takes.json has %s)' % (', '.join(sorted(unknown)), ', '.join(names)))
        with multiprocessing.get_context('spawn').Pool(min(args.jobs, len(todo))) as pool:
            results = pool.map(shoot, [(args.slug, n, args.dry, str(out)) for n in todo])
        failed = [n for n, done in results if not done]
        if failed:
            sys.exit('take %s ran out of time before its plan ended; look at its markers in %s' % (', '.join(failed), out))

    missing = [n for n in names if not (out / ('take' + n) / 'take.json').is_file()]
    if missing:
        sys.exit('no take %s in %s yet; shoot it first' % (', '.join(missing), out))
    takes = {n: cut.Take(out / ('take' + n), n) for n in names}
    quiet = tuple(cfg.get('quiet_marks', []))   # markers too frequent to print
    for n, t in takes.items():
        print('take %s markers: %s' % (n, ', '.join('%s %.2f' % (m['name'], m['t'] - t.marks[0]['t']) for m in t.marks if not m['name'].startswith(quiet))))

    from playwright.sync_api import sync_playwright
    studio, studio_base = serve()                    # layers use the studio's fonts and marks
    with sync_playwright() as pw:
        layers.render(pw, studio_base, game_dir, cfg, out / 'layers')
    studio.shutdown()
    server, base = serve(site_dir(cfg))
    shots = load(game_dir / 'shots.py', 'trailer_shots_' + args.slug.replace('-', '_'))

    def L(name):
        from PIL import Image
        return Image.open(out / 'layers' / (name + '.png')).convert('RGBA')

    try:
        extra = {'site': site_dir(cfg)} if 'site' in inspect.signature(shots.build).parameters else {}
        spec = shots.build(takes, L, ROOT, **extra)
    except KeyError as e:
        server.shutdown()
        sys.exit('the cut needs a marker the takes lack: %s' % e.args[0])
    c = cut.Cut(spec, size=tuple(cfg.get('size', [1920, 1080])), fps=cfg.get('fps', 30), src_scale=cfg.get('scale', 1))
    problems = c.problems()
    if problems or args.dry:
        server.shutdown()
    if problems:
        sys.exit('the cut needs footage that wasn\'t filmed:\n  ' + '\n  '.join(problems))
    if args.dry:
        print('dry run OK: every shot is filmed (%.0fs). Shoot it with the same command without --dry.' % (time.time() - t0))
        return

    score = None
    if spec.get('score'):
        with sync_playwright() as pw:
            score = sound.render_score(pw, base, cfg, spec['score'], c.dur + 0.5, out / 'score.wav')
    server.shutdown()
    music = None
    if (game_dir / 'music.py').is_file():
        music = out / 'music.wav'
        render = load(game_dir / 'music.py', 'trailer_music_' + args.slug.replace('-', '_')).render
        render(music, **({'site': site_dir(cfg)} if 'site' in inspect.signature(render).parameters else {}))
    c.sheet(out / 'sheet.jpg')
    c.mix(out / 'mix.wav', music, score)
    video = out / (args.slug + '-trailer.mp4')   # always named by game
    c.encode(video, out / 'mix.wav', crf=cfg.get('crf', 17))
    print('wrote %s and sheet.jpg in %.0fs' % (video, time.time() - t0))


if __name__ == '__main__':
    main()
