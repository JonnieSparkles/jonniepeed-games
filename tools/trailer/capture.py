"""Capture one scripted take of a game, frame by frame under Playwright's fake clock.

The page only advances when the clock is run, so every frame is exactly 1/fps apart however slow the screenshots
are. Math.random is seeded, so a take with the same seed and plan plays the same way every time, with or without
screenshots: a dry run (no screenshots, drawn at 1x) gives the same markers in about a third of the time.
"""
import json
import os
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent

# Math.random is seeded at load, and seeded again by the plan's `start` item: how long the page takes to load
# varies a little from run to run, so only what happens after `start` is guaranteed to repeat.
SEED_JS = """(() => { const seed = %d; let a = seed >>> 0;
  window.__rngN = 0;
  Math.random = function () { window.__rngN++; a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  window.__trailerReseed = () => { a = (seed ^ 0x5bd1e995) >>> 0; };
  try { localStorage.clear(); } catch (e) {}
  window.__trailerConfig = %s; })();"""
BRIDGE = 'window.__trailerEval = function (code) { return eval(code); };\n'
GLOBAL_EVAL = 'window.__trailerEval = window.__trailerEval || function (code) { return (0, eval)(code); };'


def capture(pw, base_url, game_dir, cfg, name, take, out, dry=False, log=print):
    """Play one take. Writes out/take.json, and out/f/00000.jpg... unless dry. Returns the take record."""
    out = Path(out)
    frames_dir = out / 'f'
    frames_dir.mkdir(parents=True, exist_ok=True)
    for f in frames_dir.glob('*.jpg'):
        f.unlink()
    fps = cfg.get('fps', 30)
    vw, vh = cfg.get('viewport', [1920, 1080])
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM'), args=['--autoplay-policy=no-user-gesture-required'])
    # a dry run draws at 1x: pixel density only changes drawing, so the take plays the same and runs faster
    ctx = browser.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=1 if dry else cfg.get('scale', 1))
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'Failed to load' not in m.text else None)
    page.route(lambda u: not u.startswith(base_url), lambda route: route.abort())   # no network beyond the local site
    if cfg.get('script'):
        # games that keep their code in a closure get a bridge into it, like the balance bots
        def bridge(route):
            body = route.fetch().text()
            if cfg['inject_before'] not in body:
                raise SystemExit('bridge point %r not found in %s' % (cfg['inject_before'], cfg['script']))
            route.fulfill(body=body.replace(cfg['inject_before'], BRIDGE + cfg['inject_before'], 1), content_type='text/javascript')
        page.route('**/' + cfg['script'] + '*', bridge)
    # Pause the clock before loading, so nothing in the game runs until the clock is run. (A clock that's only
    # installed runs in real time.) The page can still boot a little earlier or later depending on CPU load; the
    # harness re-bases the page's clock so that doesn't reach the game.
    page.clock.install(time=1_700_000_000_000)
    page.clock.pause_at(1_700_000_001_000)
    page.add_init_script(SEED_JS % (take['seed'], json.dumps({'audio': cfg['audio'], 'hook': cfg['hook']})))
    page.goto(base_url + cfg['page'])
    page.wait_for_timeout(800)                       # real time: fonts and images load
    page.evaluate('document.fonts.ready.then(() => 1)')
    page.clock.run_for(500)
    if cfg.get('css'):
        page.add_style_tag(path=str(game_dir / cfg['css']))
    page.evaluate(GLOBAL_EVAL)
    page.add_script_tag(path=str(HERE / 'harness.js'))
    page.evaluate('src => window.__trailerEval(src)', (game_dir / cfg['director']).read_text())
    page.evaluate('p => { __D.plan = p; }', take['plan'])

    t_wall = time.time()
    times, i, prev = [], 0, 0
    nmax = int(take.get('max_s', 300) * fps)
    while i < nmax:
        tgt = round((i + 1) * 1000 / fps)
        page.clock.run_for(tgt - prev)
        st = page.evaluate('dt => { __stepAnims(dt); return {c: __D.capture, d: __D.done, t: performance.now() / 1000}; }', tgt - prev)
        prev = tgt
        if st['c'] and not dry:
            page.screenshot(path=str(frames_dir / ('%05d.jpg' % len(times))), type='jpeg', quality=94)
            times.append(st['t'])
        if st['d']:
            break
        i += 1
    data = page.evaluate('({marks: __D.marks, windows: __D.windows, snd: __snd, done: __D.done, rng: __D.rng})')
    browser.close()
    data.update({'frames': times, 'fps': fps, 'seed': take['seed'], 'dry': dry, 'errors': errors})
    (out / 'take.json').write_text(json.dumps(data))
    status = 'done' if data['done'] else 'HIT max_s before the plan ended'
    filmed = sum((b if b is not None else data['marks'][-1]['t']) - a for a, b in data['windows'])
    log('take %s: %s, %.1fs filmed%s in %.0fs%s' % (name, status, filmed, ' (dry)' if dry else '', time.time() - t_wall,
                                                 ', errors: %s' % errors[:3] if errors else ''))
    return data
