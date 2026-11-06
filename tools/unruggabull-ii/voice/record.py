"""Record Unruggabull's lines: python3 tools/unruggabull-ii/voice/record.py [port]

Serves record.html on http://127.0.0.1:8765 (browsers allow the mic on localhost). One card per line: Record, then hear
the take as recorded or in Chip voice, trim it, and Accept. Accept writes takes/<key>.wav (the whole take, mono 16-bit)
and its trim to takes/trims.json; takes/ is gitignored, so the recordings stay on this machine. Build runs voice.py,
which crushes every accepted take into site/unruggabull-ii/voice.js; commit that. Only Python's standard library here;
voice.py needs ffmpeg and numpy."""
import json
import re
import subprocess
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HERE = Path(__file__).resolve().parent
TAKES = HERE / 'takes'
TRIMS = TAKES / 'trims.json'
VOICE_JS = HERE.parents[2] / 'site' / 'unruggabull-ii' / 'voice.js'
KEY = re.compile(r'^[A-Za-z0-9]{1,24}$')


def trims():
    try:
        return json.loads(TRIMS.read_text())
    except (OSError, ValueError):
        return {}


class Handler(BaseHTTPRequestHandler):
    def send(self, code, body, kind='application/json'):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        self.send_response(code)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ('/', '/index.html'):
            return self.send(200, (HERE / 'record.html').read_bytes(), 'text/html; charset=utf-8')
        if path == '/voice.js':
            return self.send(200, VOICE_JS.read_bytes(), 'text/javascript; charset=utf-8')
        if path == '/takes':
            return self.send(200, {k: v for k, v in trims().items() if (TAKES / f'{k}.wav').exists()})
        m = re.match(r'^/takes/([A-Za-z0-9]+)\.wav$', path)
        if m and (TAKES / f'{m[1]}.wav').exists():
            return self.send(200, (TAKES / f'{m[1]}.wav').read_bytes(), 'audio/wav')
        self.send(404, {'error': 'not found'})

    def do_POST(self):
        url = urlparse(self.path)
        if url.path == '/build':
            r = subprocess.run([sys.executable, str(HERE / 'voice.py')], capture_output=True, text=True)
            return self.send(200 if r.returncode == 0 else 500, {'ok': r.returncode == 0, 'out': (r.stdout + r.stderr).strip()})
        m = re.match(r'^/takes/([A-Za-z0-9]+)$', url.path)
        if not m or not KEY.match(m[1]):
            return self.send(404, {'error': 'not found'})
        q = {k: float(v[0]) for k, v in parse_qs(url.query).items() if k in ('start', 'end', 'fade')}
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if body[:4] != b'RIFF' or len(q) != 3:
            return self.send(400, {'error': 'expected a WAV body and start, end and fade'})
        TAKES.mkdir(exist_ok=True)
        (TAKES / f'{m[1]}.wav').write_bytes(body)
        t = trims()
        t[m[1]] = {k: round(q[k], 3) for k in ('start', 'end', 'fade')}
        TRIMS.write_text(json.dumps(t, indent=2) + '\n')
        self.send(200, {'ok': True})

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f'Recording page: http://127.0.0.1:{port}  (Ctrl+C to stop)')
    try:
        ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
    except KeyboardInterrupt:
        pass
