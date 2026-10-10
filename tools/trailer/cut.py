"""Cut a trailer from captured takes: shots placed by markers, camera moves, text layers, an end card, the mix.

A game's shots.py describes the cut with these pieces; make.py renders it. Shots name their source by a marker
plus an offset ("the crack hit, 0.47 s before the cut"), never by frame number, so a re-shot take re-cuts itself.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.io import wavfile

SR = 48000


def ease(u):
    u = min(1, max(0, u))
    return u * u * (3 - 2 * u)


# cameras: shot-local time -> (zoom, cx, cy), centre in CSS px of the captured page
def full(w=1920, h=1080):
    return lambda u: (1.0, w / 2, h / 2)


def push(z0, z1, cx, cy, dur, delay=0.0):
    return lambda u: (z0 + (z1 - z0) * ease((u - delay) / dur), cx, cy)


class Take:
    def __init__(self, path, name):
        self.path, self.name = Path(path), name
        d = json.loads((self.path / 'take.json').read_text())
        self.frames, self.marks, self.windows, self.dry = np.array(d['frames']), d['marks'], d.get('windows', []), d.get('dry', False)
        self.snd, self.upscale = d.get('snd', []), d.get('upscale') or 1
        self._audio = None

    def mark(self, name, after=None, nth=0):
        """Time of the nth marker called `name` (or `name:...`) after the marker `after`."""
        t0 = self.mark(after) if after else -1e18
        hits = [m['t'] for m in self.marks if (m['name'] == name or m['name'].startswith(name + ':')) and m['t'] > t0]
        if len(hits) <= nth:
            raise KeyError('take %s has no marker %r%s%s' % (self.name, name, ' #%d' % nth if nth else '', ' after %r' % after if after else ''))
        return hits[nth]

    def covers(self, t0, t1):
        """Was every moment from t0 to t1 filmed?"""
        return any(a - 0.02 <= t0 and (b is None or t1 <= b + 0.02) for a, b in self.windows)

    def frame(self, t):
        i = int(np.argmin(np.abs(self.frames - t)))
        if abs(self.frames[i] - t) > 0.02:
            raise ValueError('take %s: no frame at %.3f (nearest %.3f)' % (self.name, t, self.frames[i]))
        png = self.path / 'f' / ('%05d.png' % i)
        if png.is_file():   # a canvas capture: its own pixels, scaled up whole so pixel art stays sharp
            im = Image.open(png).convert('RGB')
            return im.resize((im.width * self.upscale, im.height * self.upscale), Image.NEAREST) if self.upscale > 1 else im
        return Image.open(self.path / 'f' / ('%05d.jpg' % i))

    def audio(self):
        if self._audio is None:
            a = json.loads((self.path / 'audio.json').read_text())
            self._audio = (a['base'], wavfile.read(str(self.path / 'game.wav'))[1].astype(np.float32))
        return self._audio


def score_calls(shots, keep):
    """The game's sound calls under each shot, moved to the trailer's time. For games whose sound is re-rendered
    in one pass over the whole cut (see Cut.mix), so music that the game schedules itself plays on without a jump
    at the cuts. `keep` names the sound object's methods to carry over: the effects, not the music controls."""
    out = []
    for s0, s1, take, src0, cam in shots:
        out += [dict(e, t=s0 + e['t'] - src0) for e in take.snd if e.get('m') in keep and src0 <= e['t'] < src0 + (s1 - s0)]
    return sorted(out, key=lambda e: e['t'])


def wipe(img, u, x0, x1, soft=90):
    """Reveal a layer left to right, like writing it."""
    if u >= 1: return img
    a = np.array(img.split()[3], dtype=np.float32)
    edge = x0 - soft + (x1 - x0 + 2 * soft) * ease(u)
    a *= np.clip((edge - np.arange(img.width)) / soft, 0, 1)[None, :]
    out = img.copy(); out.putalpha(Image.fromarray(a.astype(np.uint8)))
    return out


def fade(img, k, rise=0):
    """Fade a layer in (k from 0 to 1), optionally rising into place by `rise` px."""
    if k >= 1: return img
    out = img.copy(); a = np.array(out.split()[3], dtype=np.float32) * max(0, k)
    out.putalpha(Image.fromarray(a.astype(np.uint8)))
    if rise: out = out.transform(out.size, Image.AFFINE, (1, 0, 0, 0, 1, -rise * (1 - k)), resample=Image.BILINEAR)
    return out


class Cut:
    def __init__(self, spec, size=(1920, 1080), fps=30, src_scale=1.0):
        self.spec, (self.w, self.h), self.fps, self.src_scale = spec, size, fps, src_scale
        self.dur = spec['dur']

    def problems(self):
        """Shots whose source wasn't filmed. Works on dry runs too: it checks capture windows, not frames."""
        out = []
        for s0, s1, take, src0, cam in self.spec['shots']:
            if not take.covers(src0, src0 + (s1 - s0)):
                out.append('%.2f-%.2fs needs take %s from %.2f to %.2f, which wasn\'t filmed (windows %s)' % (
                    s0, s1, take.name, src0, src0 + s1 - s0, [[round(a, 2), b and round(b, 2)] for a, b in take.windows]))
        return out

    def game_frame(self, take, t, cam):
        z, cx, cy = cam
        src = take.frame(t)
        sw, sh = src.size
        w = sw / z; h = w * self.h / self.w
        x0 = min(max(cx * self.src_scale - w / 2, 0), sw - w); y0 = min(max(cy * self.src_scale - h / 2, 0), sh - h)
        return src.resize((self.w, self.h), Image.LANCZOS, box=(x0, y0, x0 + w, y0 + h)).convert('RGBA')

    def render(self, t):
        end0, end = self.spec['end']
        if t >= end0:
            return end(t - end0)
        if 'open' in self.spec and t < self.spec['open'][0]:   # an opening card (cover art, a title screen) before the shots
            return self.spec.get('overlay', lambda t, im: im)(t, self.spec['open'][1](t))
        for s0, s1, take, src0, cam in self.spec['shots']:
            if s0 <= t < s1:
                im = self.game_frame(take, src0 + t - s0, cam(t - s0))
                break
        else:
            raise ValueError('no shot at %.3fs' % t)
        return self.spec.get('overlay', lambda t, im: im)(t, im)

    def sheet(self, path):
        times = []
        if 'open' in self.spec:
            times += [0.02, self.spec['open'][0] / 2, self.spec['open'][0] - 0.04]
        for s0, s1, *_ in self.spec['shots']:
            times += [s0 + 0.02, (s0 + s1) / 2, s1 - 0.04]
        e0 = self.spec['end'][0]
        times += [e0 + 0.1, (e0 + self.dur) / 2, self.dur - 0.05]
        tiles = [self.render(t).convert('RGB').resize((480, 270)) for t in times]
        cols = 6
        sheet = Image.new('RGB', (480 * cols, 270 * ((len(tiles) + cols - 1) // cols)), 'black')
        for k, im in enumerate(tiles):
            sheet.paste(im, ((k % cols) * 480, (k // cols) * 270))
        sheet.save(path, quality=85)

    def mix(self, path, music=None, score=None):
        """The game's own sound, the music on top, a soft limiter. The game's sound is either each shot's take
        (8 ms fades at cuts) or `score`, one render of the whole cut (spec['score'], made by make.py)."""
        m = self.spec.get('mix', {})
        n = int(self.dur * SR)
        game = np.zeros((n, 2), np.float32)
        f = int(0.008 * SR)
        if score is not None:
            a = wavfile.read(str(score))[1][:n].astype(np.float32)
            game[:len(a)] = a
        else:
            for s0, s1, take, src0, cam in self.spec['shots']:
                base, audio = take.audio()
                i0, i1 = int(round(s0 * SR)), int(round(s1 * SR))
                j0 = int(round((src0 - base) * SR))
                seg = audio[j0:j0 + (i1 - i0)].copy()
                seg[:f] *= np.linspace(0, 1, f)[:, None]; seg[-f:] *= np.linspace(1, 0, f)[:, None]
                game[i0:i0 + len(seg)] += seg
        out = game * m.get('game', 0.9)
        if music is not None:
            mus = wavfile.read(str(music))[1][:n].astype(np.float32)
            out[:len(mus)] += mus * m.get('music', 0.6)
        peak = np.abs(out).max()
        drive = m.get('drive', 1.45)
        out = np.tanh(out / max(peak, 1e-6) * drive) / np.tanh(drive) * 0.89
        wavfile.write(str(path), SR, out.astype(np.float32))

    def encode(self, path, wav, crf=17):
        """H.264 and AAC, tagged BT.709 so players don't guess the colors, with the first frame attached as the
        file's cover picture: file browsers and chat apps show it as the preview instead of a frame of their own
        choosing (which can land on a flash)."""
        path = Path(path)
        body = path.with_name(path.stem + '.body.mp4')
        enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '%dx%d' % (self.w, self.h),
                                '-r', str(self.fps), '-i', '-', '-i', str(wav),
                                '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
                                '-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-profile:v', 'high',
                                '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
                                '-c:a', 'aac', '-b:a', '256k', '-shortest', str(body)], stdin=subprocess.PIPE)
        first = None
        for k in range(int(round(self.dur * self.fps))):
            im = self.render(k / self.fps).convert('RGB')
            if first is None: first = im
            enc.stdin.write(im.tobytes())
        enc.stdin.close()
        if enc.wait():
            raise SystemExit('ffmpeg failed')
        cover = path.with_name(path.stem + '.cover.jpg')
        first.save(cover, quality=92)
        if subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(body), '-i', str(cover), '-map', '0', '-map', '1', '-c', 'copy',
                           '-disposition:v:1', 'attached_pic', '-movflags', '+faststart', str(path)]).returncode:
            raise SystemExit('ffmpeg failed attaching the cover picture')
        body.unlink(); cover.unlink()


class Cover:
    """An end card from cover art: a 16:9 window of it, pushing in slowly."""

    def __init__(self, path, size=(1920, 1080), top=0, push=0.055, drift=8, dur=3.75):
        self.img = (path if isinstance(path, Image.Image) else Image.open(path)).convert('RGB')   # a file, or an image made in shots.py
        self.size, self.top, self.push, self.drift, self.dur = size, top, push, drift, dur

    def frame(self, u):
        cw, ch = self.img.size
        k = ease(u / self.dur)
        z = 1.0 + self.push * k
        w = cw / z; h = w * self.size[1] / self.size[0]
        cy = self.top + cw * self.size[1] / self.size[0] / 2 + self.drift * k
        cy = min(max(cy, h / 2), ch - h / 2)
        box = (cw / 2 - w / 2, cy - h / 2, cw / 2 + w / 2, cy + h / 2)
        return self.img.resize(self.size, Image.LANCZOS, box=box).convert('RGBA')
