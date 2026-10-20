"""The trailers' music: 36 s, a 6/8 quickstep at 120 dotted-quarter beats a minute (a beat is 0.5 s, a bar of two
beats 1 s; the edit's grid counts bars of 2 s, four beats), C major. Original, written to shots.py's grid.

A field band for a notebook army, built on the game's own bugle call (G C E G, which the wave start and the title
march play): a field snare in triplets, bass drum and timpani, a tuba, a bugle and a fife. Nothing from Don't Step
on a Crack's palette (no pizzicato, no glockenspiel), and a compound swing it never has.

0-4      the bugle call alone over snare rolls, under the title
4-8      the quickstep: fife tune over tuba and snare
8-18     the squad and the gun: the tune goes on, brass joins, a crash at each section
18-26    the enemies: A minor, low brass ostinato, a timpani hit on every cut
26-32    a hit, then a low drone and a quickening timpani; a slam when the CLASSIFIED stamp lands
32-36    the end card: the bugle call by the whole band, one button
"""
import numpy as np

import synth
from synth import n, midi, brass, kick, snare, crash, boom, drone, bp, lp, tt

from shots import BPM, DUR, DROP, SQUAD, ENEMY, TEASE, STAMP, END

SR = synth.SR
E8 = 1 / 3          # an eighth note, in beats (three to a beat in 6/8)


def fife(f, dur):
    """A wooden fife: a sine with a little second harmonic and breath, vibrato after the attack."""
    t = tt(dur)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 6.0 * t) * np.minimum(1, t / 0.25)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    s = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
    s += bp(synth.rng.normal(0, 1, len(t)), f * 0.9, min(f * 3, 18000)) * 0.08
    env = (1 - np.exp(-t / 0.018)) * np.exp(-t / (dur * 2.5))
    r = int(min(0.04, dur / 3) * SR); env[-r:] *= np.linspace(1, 0, r)
    return s * env / 1.3


def timp(f, dur=1.1):
    """A timpani: a struck membrane, pitched, with a felt thud."""
    t = tt(dur)
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.04 * np.exp(-t / 0.05))) / SR
    s = np.sin(ph) * np.exp(-t / 0.45) + 0.35 * np.sin(1.5 * ph) * np.exp(-t / 0.2)
    s += lp(synth.rng.normal(0, 1, len(t)), 400) * np.exp(-t / 0.03) * 0.6
    return s


def render(path):
    synth.seed(23)
    m = synth.Mix(DUR, BPM)
    beat = m.beat
    at = lambda bar2, b: bar2 * 2.0 + b * beat            # bar2: the edit's 2 s bars; b: beats (0.5 s)
    put = m.put
    P = {'snare': 0.26, 'ghost': 0.07, 'kick': 0.55, 'tuba': 0.5, 'chord': 0.13, 'fife': 0.24, 'bugle': 0.36, 'timp': 0.5}

    def sn(t, g=1.0): put(snare(0.18), t, P['snare'] * g, 0.1, rev=0.15)
    def roll(t0, dur, g0, g1, step=1 / 12):
        k = int(dur / step)
        for i in range(k): put(snare(0.08), t0 + i * step, P['snare'] * (g0 + (g1 - g0) * i / max(1, k - 1)), 0.1, rev=0.1)
    def bugle(t, note, beats, g=1.0):
        put(brass([n(note)], beats * beat * 0.95, fc0=2400, fcmin=1000, tau=0.06, release=0.06), t, P['bugle'] * g, -0.05, rev=0.35)
    def tuba(t, note, g=1.0):
        put(brass([n(note)], beat * 0.55, fc0=700, fcmin=260, tau=0.05, release=0.08), t, P['tuba'] * g, -0.1)
    def chord(t, notes, g=1.0):
        put(brass([n(s) for s in notes], beat * E8 * 0.9, fc0=1800, fcmin=600, tau=0.03, release=0.04), t, P['chord'] * g, 0.25, rev=0.2)
    def fi(t, note, eighths, g=1.0):
        put(fife(midi(n(note)), eighths * E8 * beat * 0.95), t, P['fife'] * g, 0.15, rev=0.3)

    # ---------- 0-4: the bugle call alone, over field-snare rolls
    roll(0.0, 1.5, 0.15, 0.6); sn(1.5, 0.8)
    for b, note, beats in ((3, 'G4', E8), (3 + E8, 'C5', E8), (3 + 2 * E8, 'E5', E8), (4, 'G5', 1.5)):
        bugle(at(0, b), note, beats)
    for b, note, beats in ((6, 'E5', E8 * 2), (6 + 2 * E8, 'C5', E8), (7, 'G4', 1.0)):
        bugle(at(0, b), note, beats, 0.9)
    put(timp(midi(n('C2'))), at(0, 4), P['timp'] * 0.7)
    roll(at(1, 2), 1.0, 0.2, 1.0)                                                   # into the drop

    # ---------- 4-26: the quickstep (bars counted in 2 s, four beats of three eighths)
    HARM = {2: 'C C G G', 3: 'C C G C', 4: 'F F C C', 5: 'G G C C', 6: 'F F G G', 7: 'C C F F', 8: 'G G C C'}
    ROOT = {'C': ('C2', 'G1'), 'G': ('G1', 'D2'), 'F': ('F1', 'C2'), 'Am': ('A1', 'E2'), 'E': ('E2', 'B1'), 'Dm': ('D2', 'A1')}
    UP = {'C': ['E4', 'G4', 'C5'], 'G': ['D4', 'G4', 'B4'], 'F': ['F4', 'A4', 'C5'], 'Am': ['E4', 'A4', 'C5'], 'E': ['E4', 'G#4', 'B4'], 'Dm': ['D4', 'F4', 'A4']}
    q0, e0 = int(DROP / 2), int(ENEMY / 2)
    for bar in range(q0, int(TEASE / 2)):
        harm = (HARM.get(bar) or {9: 'Am Am E E', 10: 'Am Am Dm E', 11: 'Am Am E E', 12: 'Dm Dm E E'}[bar]).split()
        for b in range(4):
            t = at(bar, b); ch = harm[b]
            put(kick(0.3), t, P['kick'] * (1.0 if b % 2 == 0 else 0.6))
            tuba(t, ROOT[ch][b % 2])
            chord(t + 2 * E8 * beat, UP[ch])                                         # the "pah" on the third eighth
            sn(t, 0.8 if b % 2 else 0.3)                                             # backbeat on beats 2 and 4
            put(snare(0.06), t + E8 * beat, P['ghost'], 0.1); put(snare(0.06), t + 2 * E8 * beat, P['ghost'] * 0.8, 0.1)
        if bar in (q0, int(SQUAD / 2), 7, e0): put(crash(1.8), at(bar, 0), 0.09, -0.2, rev=0.3)
    put(boom(1.0), DROP, 0.4)
    put(brass([n('C3'), n('G3'), n('C4'), n('E4')], 0.8), DROP, 0.45, 0, rev=0.4)

    # the fife's tune, in eighths: (eighth from the bar's start, note, eighths)
    TUNE = {
        2: [(0, 'G5', 2), (2, 'E5', 1), (3, 'C5', 2), (5, 'E5', 1), (6, 'G5', 1), (7, 'A5', 1), (8, 'G5', 1), (9, 'E5', 3)],
        3: [(0, 'F5', 2), (2, 'A5', 1), (3, 'C6', 2), (5, 'A5', 1), (6, 'G5', 1), (7, 'F5', 1), (8, 'E5', 1), (9, 'D5', 3)],
        4: [(0, 'C6', 2), (2, 'A5', 1), (3, 'F5', 2), (5, 'A5', 1), (6, 'G5', 2), (8, 'E5', 1), (9, 'C5', 3)],
        5: [(0, 'D5', 1), (1, 'E5', 1), (2, 'F5', 1), (3, 'G5', 2), (5, 'B5', 1), (6, 'C6', 3), (9, 'G5', 1), (10, 'E5', 1), (11, 'G5', 1)],
        6: [(0, 'A5', 2), (2, 'C6', 1), (3, 'A5', 2), (5, 'F5', 1), (6, 'G5', 1), (7, 'A5', 1), (8, 'B5', 1), (9, 'D6', 3)],
        7: [(0, 'E6', 2), (2, 'D6', 1), (3, 'C6', 2), (5, 'G5', 1), (6, 'A5', 2), (8, 'C6', 1), (9, 'F6', 3)],
        8: [(0, 'D6', 1), (1, 'C6', 1), (2, 'B5', 1), (3, 'D6', 3), (6, 'C6', 3), (9, 'G5', 1), (10, 'E5', 1), (11, 'G5', 1)],
    }
    for bar, notes in TUNE.items():
        for k, note, ln in notes:
            fi(at(bar, k * E8), note, ln)
    for bar in (7, 8):                                                              # the gun: the bugle answers
        for k, note, ln in ((0, 'C5', 2), (3, 'E5', 2), (6, 'G5', 5)):
            bugle(at(bar, k * E8), note, ln * E8, 0.6)

    # 18-26: the enemies: a low brass ostinato and a timpani on every cut (every beat pair)
    OST = [('A2', 0), ('A2', 2), ('E3', 3), ('C3', 5), ('A2', 6), ('B2', 8), ('C3', 9), ('E3', 11)]
    for bar in range(e0, int(TEASE / 2)):
        for note, k in OST:
            put(brass([n(note)], E8 * beat * 1.6, fc0=1100, fcmin=400, tau=0.04, release=0.05), at(bar, k * E8), 0.3, 0.05, rev=0.2)
        for b in (0, 2):
            put(timp(midi(n('A1'))), at(bar, b), P['timp'] * 0.8)
        for k, note, ln in ((0, 'E6', 1), (1, 'D6', 1), (2, 'C6', 1), (3, 'B5', 3), (6, 'C6', 1), (7, 'B5', 1), (8, 'A5', 1), (9, 'G#5', 3)):
            fi(at(bar, k * E8), note, ln, 0.75)
    roll(at(int(TEASE / 2) - 1, 2.5), 1.5 * beat, 0.2, 1.0)

    # ---------- 26-32: the hit, the drone, the quickening timpani, the stamp
    put(brass([n('A1'), n('E2'), n('A2'), n('C3')], 1.6, fc0=1500, fcmin=400, release=0.6), TEASE, 0.55, 0, rev=0.5)
    put(boom(2.0), TEASE, 0.6); put(crash(2.2), TEASE, 0.1, 0, rev=0.4)
    put(drone([n('A1'), n('E2')], END - TEASE - 0.6, att=2.0), TEASE + 0.6, 0.10, 0, rev=0.2)
    for t, g in ((TEASE + 1.5, 0.4), (TEASE + 2.5, 0.45), (STAMP - 0.75, 0.5), (STAMP - 0.5, 0.55), (STAMP - 0.25, 0.6)):
        put(timp(midi(n('A1'))), t, P['timp'] * g)
    put(boom(1.6), STAMP, 0.75); put(snare(0.3), STAMP, 0.5, 0, rev=0.3)          # the stamp lands
    put(brass([n('A1'), n('Bb1'), n('E2'), n('F2')], 0.9, fc0=900, fcmin=300, release=0.4), STAMP, 0.4, 0, rev=0.4)
    put(timp(midi(n('E1')), 2.0), STAMP, P['timp'] * 0.5)

    # ---------- 32-36: the bugle call by the whole band, and one button
    put(brass([n('C3'), n('G3'), n('C4'), n('E4'), n('G4')], 1.4, release=0.5), END, 0.55, 0, rev=0.5)
    put(boom(1.4), END, 0.45); put(crash(2.4), END, 0.12, 0, rev=0.4)
    for b, note, beats in ((1, 'G4', E8), (1 + E8, 'C5', E8), (1 + 2 * E8, 'E5', E8), (2, 'G5', 1.0), (3, 'E5', E8 * 2), (3 + 2 * E8, 'G5', E8)):
        bugle(at(END / 2, b), note, beats, 1.0)
        fi(at(END / 2, b), {'G4': 'G5', 'C5': 'C6', 'E5': 'E6', 'G5': 'G6'}[note], 1, 0.5)
    for b in range(4):
        tuba(at(END / 2, b), 'C2' if b % 2 == 0 else 'G1', 0.8)
        put(kick(0.3), at(END / 2, b), P['kick'] * 0.7)
    roll(at(END / 2, 3.5), beat * 0.5, 0.3, 0.9)
    btn = at(END / 2 + 1, 0)
    put(brass([n('C2'), n('C3'), n('G3'), n('C4'), n('C5')], 0.5, release=0.25), btn, 0.6, 0, rev=0.5)
    put(kick(0.4), btn, 0.8); put(snare(0.25), btn, 0.4); put(timp(midi(n('C2'))), btn, 0.5); put(crash(2.0), btn, 0.1, 0, rev=0.5)
    m.write(path, wet=0.45, fade=0.6)
