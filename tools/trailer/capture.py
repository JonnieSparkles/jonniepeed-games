"""Capture one scripted take of a game, frame by frame under Playwright's fake clock.

The page only advances when the clock is run, so every frame is exactly 1/fps apart however slow the screenshots
are. Math.random is seeded, so a take with the same seed and plan plays the same way every time, with or without
screenshots: a dry run (no screenshots, drawn at 1x) gives the same markers in about a third of the time.
Pixel-art games can save their canvas's own pixels instead of screenshots (trailer.json "canvas"), which is faster
and stays crisp however far the cut pushes in.
"""
import base64
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
# one frame: step CSS animations, report the plan's state, and hand back the canvas's pixels when filming one
STEP_JS = """([dt, sel]) => { __stepAnims(dt);
  const st = {c: __D.capture, d: __D.done, t: performance.now() / 1000};
  if (st.c && sel) st.png = document.querySelector(sel).toDataURL('image/png').slice(22);
  return st; }"""
# Live sound (audio.live): the game's own AudioContext is one OfflineAudioContext that renders in step with the fake
# clock, a frame at a time, so the take's sound is exactly what the game played, mixed by its own code. Its state reads
# "running" and its suspend/resume belong to the capture, not the game.
LIVE_AUDIO_JS = """(() => { const SR = 48000, LEN = %f, raw = performance.now.bind(performance), Real = window.OfflineAudioContext;
  let ctx = null, t0 = 0, done = null;
  const make = () => {
    if (ctx) return ctx;
    ctx = new Real(2, Math.ceil(SR * LEN), SR); t0 = raw();
    const suspend = ctx.suspend.bind(ctx), resume = ctx.resume.bind(ctx), Q = 128 / SR;
    Object.defineProperty(ctx, 'state', { get: () => 'running' });
    ctx.resume = ctx.suspend = ctx.close = () => Promise.resolve();
    window.__audioStep = async () => {
      const target = Math.floor(Math.min(LEN - 0.5, (raw() - t0) / 1000) / Q) * Q;
      if (target <= ctx.currentTime + Q / 2) return;
      const hit = new Promise(ok => suspend(target).then(ok));
      if (!done) done = ctx.startRendering(); else resume();
      await hit;
    };
    // the take's time (harness clock) at the sound's sample 0
    window.__audioBase = () => performance.now() / 1000 - (raw() - t0) / 1000;
    window.__audioFinish = async () => { if (!done) done = ctx.startRendering(); else resume(); window.__audioBuf = await done; return window.__audioBuf.length; };
    window.__audioChunk = (i0, n) => {
      // float, so a mix that goes over full scale (the game has no limiter) isn't clipped here; the cut levels it
      const L = window.__audioBuf.getChannelData(0), R = window.__audioBuf.getChannelData(1), out = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { out[2 * i] = L[i0 + i]; out[2 * i + 1] = R[i0 + i]; }
      const b = new Uint8Array(out.buffer); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      return btoa(s);
    };
    return ctx;
  };
  window.AudioContext = window.webkitAudioContext = function () { return make(); };
})();"""
GLOBAL_EVAL ='window.__trailerEval = window.__trailerEval || function (code) { return (0, eval)(code); };'


def save_live_audio(page, out, t_end, log):
    """The live take's sound, rendered to the end of the take, as game.wav and audio.json (like sound.render)."""
    import numpy as np
    from scipy.io import wavfile
    sr = 48000
    base = page.evaluate('__audioBase()')
    total = page.evaluate('__audioFinish()')
    n = min(total, int((t_end - base + 1.0) * sr))
    parts, step = [], sr * 5
    for i0 in range(0, n, step):
        b = base64.b64decode(page.evaluate('([a, b]) => __audioChunk(a, b)', [i0, min(step, n - i0)]))
        parts.append(np.frombuffer(b, dtype=np.float32).reshape(-1, 2))
    a = np.concatenate(parts) if parts else np.zeros((1, 2), np.float32)
    wavfile.write(str(out / 'game.wav'), sr, a)
    (out / 'audio.json').write_text(json.dumps({'base': base, 'dur': len(a) / sr}))
    log('sound %s: %.1fs, live, peak %.2f' % (out.name, len(a) / sr, float(np.abs(a).max())))


def capture(pw, base_url, game_dir, cfg, name, take, out, dry=False, log=print):
    """Play one take. Writes out/take.json, and out/f/00000.jpg... unless dry. Returns the take record."""
    out = Path(out)
    frames_dir = out / 'f'
    frames_dir.mkdir(parents=True, exist_ok=True)
    for f in list(frames_dir.glob('*.jpg')) + list(frames_dir.glob('*.png')):
        f.unlink()
    fps = cfg.get('fps', 30)
    # a take can override the framing: its own viewport, pixel density, a touch screen, screenshots instead of the canvas
    vw, vh = take.get('viewport', cfg.get('viewport', [1920, 1080]))
    live = cfg['audio'].get('live')
    browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM'), args=['--autoplay-policy=no-user-gesture-required'])
    # a dry run draws at 1x: pixel density only changes drawing, so the take plays the same and runs faster.
    # A canvas capture saves the canvas's own pixels, so pixel density doesn't matter there either.
    canvas = None if take.get('screen') else cfg.get('canvas')
    touch = bool(take.get('touch'))
    ctx = browser.new_context(viewport={'width': vw, 'height': vh}, has_touch=touch, is_mobile=touch,
                              device_scale_factor=1 if dry or canvas else take.get('scale', cfg.get('scale', 1)))
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
    if live:
        page.add_init_script(LIVE_AUDIO_JS % (take.get('max_s', 300) + 5))
    page.goto(base_url + cfg['page'])
    page.wait_for_timeout(cfg.get('settle_ms', 800))   # real time: fonts, images and decoded sound load
    page.evaluate('document.fonts.ready.then(() => 1)')
    page.clock.run_for(500)
    if cfg.get('css'):
        page.add_style_tag(path=str(game_dir / cfg['css']))
    page.evaluate(GLOBAL_EVAL)
    page.add_script_tag(path=str(HERE / 'harness.js'))
    if cfg.get('scripts'):
        # helper scripts for the director (a game's balance bot, say), as text it evaluates where it needs them
        page.evaluate('s => { window.__trailerScripts = s; }', {k: (game_dir / v).read_text() for k, v in cfg['scripts'].items()})
    page.evaluate('src => window.__trailerEval(src)', (game_dir / cfg['director']).read_text())
    page.evaluate('p => { __D.plan = p; }', take['plan'])

    t_wall = time.time()
    times, i, prev = [], 0, 0
    nmax = int(take.get('max_s', 300) * fps)
    while i < nmax:
        tgt = round((i + 1) * 1000 / fps)
        page.clock.run_for(tgt - prev)
        st = page.evaluate(STEP_JS, [tgt - prev, canvas['selector'] if canvas and not dry else None])
        if live:
            page.evaluate('window.__audioStep && window.__audioStep()')
        prev = tgt
        if st['c'] and not dry:
            if canvas:
                (frames_dir / ('%05d.png' % len(times))).write_bytes(base64.b64decode(st['png']))
            else:
                page.screenshot(path=str(frames_dir / ('%05d.jpg' % len(times))), type='jpeg', quality=94)
            times.append(st['t'])
        if st['d']:
            break
        i += 1
    data = page.evaluate('({marks: __D.marks, windows: __D.windows, snd: __snd, done: __D.done, rng: __D.rng})')
    if live and not dry and page.evaluate('!!window.__audioBase'):
        save_live_audio(page, out, page.evaluate('performance.now() / 1000'), log)
    browser.close()
    data.update({'frames': times, 'fps': fps, 'seed': take['seed'], 'dry': dry, 'errors': errors,
                 'upscale': canvas.get('upscale', 1) if canvas else None, 'screen': bool(take.get('screen'))})
    (out / 'take.json').write_text(json.dumps(data))
    status = 'done' if data['done'] else 'HIT max_s before the plan ended'
    filmed = sum((b if b is not None else data['marks'][-1]['t']) - a for a, b in data['windows'])
    log('take %s: %s, %.1fs filmed%s in %.0fs%s' % (name, status, filmed, ' (dry)' if dry else '', time.time() - t_wall,
                                                 ', errors: %s' % errors[:3] if errors else ''))
    return data
