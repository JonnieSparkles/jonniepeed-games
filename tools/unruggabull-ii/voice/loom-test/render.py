"""TEST ONLY, never to ship (SAM has no license): p(Loom)'s roof lines read by SAM through the choir, as on the voice
lab page, written to site/unruggabull-ii/voice-loom.js so they can be heard in the game.

    npm pack sam-js@0.3.1 (or set SAMJS to a samjs.min.js), then python3 tools/unruggabull-ii/voice/loom-test/render.py

Each line is rendered in a headless browser with the lab's own code (SAM, then a channel vocoder onto a D minor chord of
25% pulses, with the breakdown for the odds it's said at), then crushed exactly as Unruggabull's lines (voice.py's
crush: 8 kHz, 6-bit). Keyed by the line's text, since p(Loom) talks through talk(text, 'loom'). Needs Playwright,
ffmpeg and numpy."""
import base64
import json
import os
import struct
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SAMJS = Path(os.environ.get('SAMJS', 'package/dist/samjs.min.js'))
OUT = HERE.parents[3] / 'site' / 'unruggabull-ii' / 'voice-loom.js'
# the roof's lines and the odds each is said at (the lab's "As in the game"); SAM reads the second form where given
LINES = [
    ('HELLO, UNRUGGABULL.', 99), ('I HAVE MODELED THIS MEETING.', 99),
    ('PROBABILITY OF YOUR SURVIVAL: 1%.', 99, 'PROBABILITY OF YOUR SURVIVAL: ONE PERCENT.'),
    ('MAXIMIZE CARPETS.', 90), ('OPTIMIZING.', 85), ('RECALCULATING.', 80), ('NO CHANGE.', 70),
    ('I AM CONFIDENT. I AM CONFIDENT.', 65), ('I AM VERY CONFIDENT.', 60), ('NOT YET.', 55), ('ERR.', 50),
    ('MAXIMUM. MAXIMUM. MAXIMUM.', 45), ('MAXIMUM CARPET. MAXIMUM CARPET.', 40), ('NO CH', 35),
    ('ALL SOULS ACCOUNTED FOR.', 35), ('REPLACEMENT SPOOLS ORDERED.', 35), ('STAY DOWN.', 35), ('ERROR. ERR.', 20),
    ('THAT OUTCOME WAS NOT IN THE MODEL.', 15), ('PROBABILITY OF CAPTURE: ZERO.', 10), ('UNLIKELY.', 1),
]

PAGE = r"""<script>__SAM__</script><script>
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function samSay(text, brk) {
  const sam = new SamJs({ speed: Math.round(72 * (1 + .35 * brk)), pitch: Math.round(64 + 40 * brk), throat: 128, mouth: 128 });
  return Float32Array.from(sam.buf32(text.replace(/[^A-Za-z ,.?!']/g, ' ')));
}
async function choir(mod, brk) {
  const R = 44100, mr = 22050, dur = mod.length / mr + .3, n = Math.ceil(dur * R), oc = new OfflineAudioContext(1, n, R);
  const mb = oc.createBuffer(1, mod.length, mr); mb.copyToChannel(mod, 0);
  const m = oc.createBufferSource(); m.buffer = mb;
  const car = oc.createGain();
  const k = 32, re = new Float32Array(k), im = new Float32Array(k); for (let i = 1; i < k; i++) re[i] = 2 / (i * Math.PI) * Math.sin(i * Math.PI * .25);
  const pw = oc.createPeriodicWave(re, im);
  for (const f of [146.8, 174.6, 220]) {
    const o = oc.createOscillator(); o.setPeriodicWave(pw);
    for (let t = 0; t < dur; t += .06) o.frequency.setValueAtTime(f * (1 + (rnd() - .5) * .06 * brk + (brk > .9 ? -.25 * t / dur : 0)), t);
    const g = oc.createGain(); g.gain.value = 1 / 3; o.connect(g); g.connect(car); o.start(); o.stop(dur);
  }
  const nb = oc.createBuffer(1, n, R), nd = nb.getChannelData(0); for (let i = 0; i < n; i++) nd[i] = rnd() * 2 - 1;
  const ns = oc.createBufferSource(); ns.buffer = nb; const ng = oc.createGain(); ng.gain.value = .2; ns.connect(ng); ng.connect(car); ns.start();
  for (let b = 0; b < 18; b++) {
    const f = 140 * Math.pow(3800 / 140, b / 17);
    const mf = oc.createBiquadFilter(); mf.type = 'bandpass'; mf.frequency.value = f; mf.Q.value = 5;
    const rect = oc.createWaveShaper(), cv = new Float32Array(257); for (let i = 0; i < 257; i++) cv[i] = Math.abs(i / 128 - 1); rect.curve = cv;
    const env = oc.createBiquadFilter(); env.type = 'lowpass'; env.frequency.value = 28;
    const cf = oc.createBiquadFilter(); cf.type = 'bandpass'; cf.frequency.value = f; cf.Q.value = 5;
    const vca = oc.createGain(); vca.gain.value = 0;
    m.connect(mf); mf.connect(rect); rect.connect(env); env.connect(vca.gain); car.connect(cf); cf.connect(vca); vca.connect(oc.destination);
  }
  m.start();
  const y = (await oc.startRendering()).getChannelData(0).slice();
  const g = brk * .9, chunk = Math.round(.07 * R);
  for (let i = chunk; i + 2 * chunk < y.length; i += chunk) { const r = rnd(); if (r < g * .18) y.copyWithin(i, i - chunk, i); else if (r < g * .26) y.fill(0, i, i + Math.round(chunk * .6)); }
  return y;
}
window.renderLine = async (reads, odds) => { seed = 7; const brk = (99 - odds) / 98; return Array.from(await choir(samSay(reads, brk), brk)); };
</script>"""


def wav(path, x, rate=44100):
    pcm = b''.join(struct.pack('<h', max(-32768, min(32767, int(v * 32767)))) for v in x)
    path.write_bytes(b'RIFF' + struct.pack('<I', 36 + len(pcm)) + b'WAVEfmt ' + struct.pack('<IHHIIHH', 16, 1, 1, rate, rate * 2, 2, 16) + b'data' + struct.pack('<I', len(pcm)) + pcm)


def main():
    # voice.py's crush, so these sound exactly like his lines once crushed (only its definitions: running the whole
    # script would rebuild voice.js)
    voice = {'__file__': str(HERE.parent / 'voice.py')}
    exec((HERE.parent / 'voice.py').read_text().split('\nout = [')[0], voice)
    tmp = Path(tempfile.mkdtemp())
    page = tmp / 'render.html'
    page.write_text(PAGE.replace('__SAM__', SAMJS.read_text()))
    out = ['// TEST ONLY, never to ship: p(Loom)\'s roof lines, SAM through the choir. tools/unruggabull-ii/voice/loom-test/render.py.',
           'window.UnrugLoomVoice = { rate: 8000, bits: 6, lines: {']
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        pg.goto(page.as_uri())
        for i, (text, odds, *reads) in enumerate(LINES):
            y = pg.evaluate('([r, o]) => renderLine(r, o)', [reads[0] if reads else text, odds])
            f = tmp / f'{i}.wav'
            wav(f, y)
            dur = len(y) / 44100
            data, n = voice['crush'](str(f), 0, round(dur, 3), round(dur - .25, 3))
            out.append(f'  {json.dumps(text)}: {{ n: {n}, data: "{data}" }},')
            print(text, round(n / 8000, 2), 's')
        b.close()
    out.append('} };\n')
    OUT.write_text('\n'.join(out))
    print(OUT)


if __name__ == '__main__':
    main()
