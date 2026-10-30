"""Record a piece of Unruggabull II's own music from its chip synth (site/unruggabull-ii/audio.js), offline and exact:
the game's AudioContext is the trailer tool's live OfflineAudioContext (tools/trailer/capture.py), stepped under a
fake clock. Used for the teaser's handoff into the title theme.

    python3 tests/unruggabull-ii/trailer/chip.py theme 7 out.wav      # the first 7 s of the title theme
"""
import base64
import functools
import http.server
import json
import sys
import threading
from pathlib import Path

import numpy as np
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools' / 'trailer'))
from capture import LIVE_AUDIO_JS  # noqa: E402

SCRIPTS = ['bull.js', 'sprites.js', 'art.js', 'music-roof.js', 'music-floor.js', 'music-elevator.js', 'music-factory.js',
           'music-stairs.js', 'voice.js', 'audio.js']


def record(track, seconds, out, extra_js=''):
    from playwright.sync_api import sync_playwright
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=str(ROOT / 'site'))
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    page_html = '<!doctype html><body>' + ''.join('<script src="/unruggabull-ii/%s"></script>' % s for s in SCRIPTS) + '</body>'
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
            pg = b.new_page()
            pg.route('**/__chip.html', lambda r: r.fulfill(body=page_html, content_type='text/html'))
            pg.clock.install(time=1_700_000_000_000); pg.clock.pause_at(1_700_000_001_000)
            pg.add_init_script(LIVE_AUDIO_JS % (seconds + 3))
            pg.goto('http://127.0.0.1:%d/__chip.html' % srv.server_port)
            pg.evaluate('() => { UnrugSound.init(); ' + extra_js + ' UnrugSound.music(%s); }' % json.dumps(track))
            for _ in range(int(seconds * 60)):
                pg.clock.run_for(16)
                pg.evaluate('window.__audioStep && window.__audioStep()')
            base = pg.evaluate('__audioBase()'); total = pg.evaluate('__audioFinish()')
            n = min(total, int(seconds * 48000)); parts = []
            for i0 in range(0, n, 48000 * 5):
                raw = base64.b64decode(pg.evaluate('([a, b]) => __audioChunk(a, b)', [i0, min(48000 * 5, n - i0)]))
                parts.append(np.frombuffer(raw, np.float32).reshape(-1, 2))
            b.close()
    finally:
        srv.shutdown()
    a = np.concatenate(parts)
    nz = np.where(np.abs(a).max(1) > 1e-4)[0]
    a = a[nz[0]:] if len(nz) else a                      # from its first sound
    wavfile.write(str(out), 48000, a.astype(np.float32))
    return a


if __name__ == '__main__':
    a = record(sys.argv[1], float(sys.argv[2]), sys.argv[3])
    print('%s: %.2f s, peak %.2f' % (sys.argv[3], len(a) / 48000, np.abs(a).max()))
