"""Cut F: D with the first game up front (owner, Oct 30, "let's try your idea"): the remaster's own title screen (its
painting and UNRUGGABULL wordmark, the menu hidden), punched on RugCo Alley's beats for 2 s, then the tape stop drains
it to black, and the new game takes over from D's picture and sound.

    python3 tests/unruggabull-ii/trailer/firstgame.py OUTDIR      # needs OUTDIR/frames-D and teaser-D.wav from film.py D
"""
import functools
import http.server
import io
import shutil
import subprocess
import sys
import threading
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[3]
FPS, DROP_END, STOP_END, WAKE = 30, 2.0, 2.55, 2.85
HIDE = '#menu,#best,#home,#title-edge,#snd-btn,#fs-btn,#pause-btn,#hud,#rotate{display:none!important}'


def title_frames(n):
    """The remaster's title screen, live (its slow push-in and embers) under a stepped clock, one frame per 1/30 s."""
    from playwright.sync_api import sync_playwright
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'site')))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    out = []
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1920, 'height': 1080})
            pg.clock.install(time=1_700_000_000_000)
            pg.goto('http://127.0.0.1:%d/unruggabull-remastered/' % srv.server_port)
            pg.add_style_tag(content=HIDE)
            pg.clock.run_for(1500)                                  # the painting loaded and the embers going
            for _ in range(n):
                pg.clock.run_for(1000 // FPS)
                out.append(Image.open(io.BytesIO(pg.screenshot())).convert('RGB'))
            b.close()
    finally:
        srv.shutdown()
    return out


def punch(im, t):
    """RugCo Alley's beats (every 0.5 s from the drop): a zoom punch and a warm flash, decaying."""
    p = np.exp(-(t % .5) / .1)
    z = 1.03 + .05 * p
    w, h = im.size; cw, ch = w / z, h / z
    sx = (np.sin(np.floor(t / .5) * 12.9898) * 43758.5453 % 1 - .5) * 10 * p
    box = ((w - cw) / 2 + sx, (h - ch) / 2, (w + cw) / 2 + sx, (h + ch) / 2)
    im = im.resize((w, h), Image.LANCZOS, box=box)
    warm = Image.new('RGB', im.size, (255, 216, 160))
    return Image.blend(im, warm, .07 * p)


def tape(im, k, seed):
    """The tape stopping: drained of colour, darker and sagging, with tracking bands; k from 0 to 1."""
    im = ImageEnhance.Color(im).enhance(1 - k)
    im = ImageEnhance.Contrast(im).enhance(1 + k)
    im = ImageEnhance.Brightness(im).enhance(1 - .85 * k)
    w, h = im.size; out = Image.new('RGB', (w, h))
    out.paste(im, (0, int(k * k * 200)))
    a = np.array(out); rng = np.random.default_rng(seed)
    for _ in range(5):
        y = rng.integers(0, h - 40); bh = rng.integers(12, 40); dx = int((rng.random() - .5) * 160 * k)
        a[y:y + bh] = np.roll(a[y:y + bh], dx, axis=1)
    return Image.fromarray((a * (1 - k * k)).astype(np.uint8))


def main(out):
    out = Path(out); src, dst = out / 'frames-D', out / 'frames-F'
    if dst.exists(): shutil.rmtree(dst)
    dst.mkdir()
    n_drop, n_stop = int(DROP_END * FPS), int(STOP_END * FPS)
    live = title_frames(n_drop + 1)
    for i in range(int(np.ceil(WAKE * FPS))):
        t = i / FPS
        if t < DROP_END: im = punch(live[i], t)
        elif t < STOP_END: im = tape(punch(live[n_drop], DROP_END - .001), (t - DROP_END) / (STOP_END - DROP_END), i)
        else: im = Image.new('RGB', (1920, 1080))
        im.save(dst / ('%05d.png' % i))
    for f in sorted(src.glob('*.png')):
        if int(f.stem) >= int(np.ceil(WAKE * FPS)): shutil.copy(f, dst / f.name)
    mp4 = out / 'unruggabull-ii-teaser-F.mp4'
    # D's frames are 480 x 270 and the title's 1920 x 1080: both scaled to 1080p (nearest, so the pixel art stays sharp)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', str(dst / '%05d.png'), '-i', str(out / 'teaser-D.wav'),
                    '-vf', 'scale=1920:1080:flags=neighbor', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', str(mp4)], check=True)
    print('F ->', mp4)


if __name__ == '__main__':
    main(sys.argv[1])
