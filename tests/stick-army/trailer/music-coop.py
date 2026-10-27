"""The co-op cut's music (make.py --cut coop): 26 s, 120 BPM, B-flat major. Original, written to shots-coop.py's grid.
The first cut's march; the solo trailer has moved on to music.py.

A toy-soldier march for a notebook army: tuba oom-pah, snare and bass drum, brass on the tune, a glockenspiel.

Bars 0-1    a snare cadence and pizzicato under the title; the glockenspiel hints at the tune; a roll into the drop
Bars 2-7    the march: the band comes in on the drop, the tune over Bb | F7 | Bb | Eb | Bb F7 | Bb
Bar 8       a G minor hit as the sky goes wrong, then near silence: a low drone and a timpani that quickens under
            the Dreadnought's rumbling (the game's own horn and sting play over it)
Bars 11-12  the end card: the band's chord, the tune's opening once more, one button
"""
import synth
from synth import n, midi, pluck, glock, brass, pad, kick, snare, crash, boom, drone

from importlib import import_module
BPM, DUR, DROP, TEASE, END = (getattr(import_module('shots-coop'), k) for k in ('BPM', 'DUR', 'DROP', 'TEASE', 'END'))

SR = synth.SR


def render(path):
    synth.seed(11)
    m = synth.Mix(DUR, BPM)
    T, put = m.T, m.put
    P = {'tuba': 0.55, 'pah': 0.16, 'lead': 0.34, 'glock': 0.26, 'pizz': 0.5, 'kick': 0.6, 'snare': 0.30, 'ghost': 0.10}
    bar = lambda t: t / m.bar
    D, Q, E = int(bar(DROP)), int(bar(TEASE)), int(bar(END))   # 2, 8, 11

    def sn(b, beat, g=1.0, pan=0.08): put(snare(0.22), T(b, beat), P['snare'] * g, pan, rev=0.15)
    def roll(b, beat0, beats, g0=0.25, g1=1.0):
        k = int(beats * 4)
        for i in range(k): sn(b, beat0 + i / 4, g0 + (g1 - g0) * i / max(1, k - 1))
    def lead(b, beat, note, beats, g=1.0):
        put(brass([n(note)], beats * m.beat * 0.92, fc0=2600, fcmin=900, release=0.08), T(b, beat), P['lead'] * g, 0.05, rev=0.3)
    def gl(b, beat, note, g=1.0, dur=1.0): put(glock(midi(n(note)), dur), T(b, beat), P['glock'] * g, -0.2, rev=0.4)
    def tuba(b, beat, note, g=1.0):
        put(brass([n(note)], m.beat * 0.8, fc0=900, fcmin=300, tau=0.08, release=0.1), T(b, beat), P['tuba'] * g, -0.05)
    def pah(b, beat, notes, g=1.0):
        put(brass([n(s) for s in notes], m.beat * 0.35, fc0=2200, fcmin=700, tau=0.05, release=0.06), T(b, beat), P['pah'] * g, 0.2, rev=0.2)

    # ---------- bars 0-1: the cadence under the title
    for b in (0, 1):
        for beat in range(4):
            put(pluck(midi(n('Bb1' if beat % 2 == 0 else 'F1')), 0.3, decay=0.99, bright=0.3, body=0.9), T(b, beat), P['pizz'] * (1 if beat % 2 == 0 else 0.7), -0.1)
        for beat in (1, 3):
            sn(b, beat, 0.55)
        for beat in (0.5, 1.5, 2.5, 2.75):
            put(snare(0.1), T(b, beat), P['ghost'] * 0.8, 0.1)
    for beat, note in ((2, 'F5'), (2.5, 'Bb5'), (3, 'D6')):
        gl(0, beat, note, 0.8)
    for beat, note in ((0, 'C6'), (1, 'A5'), (1.5, 'F5')):
        gl(1, beat, note, 0.8)
    roll(1, 2, 2, 0.15, 1.1)                                                     # into the drop

    # ---------- bars 2-7: the march
    chords = {2: ('Bb', 'Bb'), 3: ('F7', 'F7'), 4: ('Bb', 'Bb'), 5: ('Eb', 'Eb'), 6: ('Bb', 'F7'), 7: ('Bb', 'Bb')}
    root = {'Bb': ('Bb1', 'F2'), 'F7': ('F1', 'C2'), 'Eb': ('Eb2', 'Bb1')}
    upper = {'Bb': ['D4', 'F4', 'Bb4'], 'F7': ['C4', 'Eb4', 'A4'], 'Eb': ['Eb4', 'G4', 'Bb4']}
    for b in range(D, Q):
        for beat in range(4):
            ch = chords[b][0 if beat < 2 else 1]
            if beat % 2 == 0: tuba(b, beat, root[ch][beat // 2 % 2 if chords[b][0] == chords[b][1] else 0])
            else: pah(b, beat, upper[ch])
            put(kick(0.35), T(b, beat), P['kick'] * (1.0 if beat == 0 else 0.55 if beat == 2 else 0), 0)
            if beat in (1, 3): sn(b, beat)
            put(snare(0.1), T(b, beat + 0.5), P['ghost'], 0.12)
        if b % 2 == 0: put(crash(1.6), T(b, 0), 0.08, -0.25, rev=0.3)
    roll(D + 1, 3, 1, 0.2, 0.7); roll(D + 3, 3, 1, 0.2, 0.7); roll(Q - 1, 2.5, 1.5, 0.2, 1.0)
    put(brass([n('Bb2'), n('F3'), n('Bb3'), n('D4')], 0.9), T(D, 0), 0.5, 0, rev=0.4)   # the band comes in
    put(boom(1.0), T(D, 0), 0.35)
    TUNE = {
        2: [(0, 'F4', .5), (.5, 'Bb4', .5), (1, 'D5', 1), (2, 'F5', 1), (3, 'D5', .5), (3.5, 'Bb4', .5)],
        3: [(0, 'C5', 1.5), (1.5, 'A4', .5), (2, 'F4', 1), (3, 'A4', .5), (3.5, 'C5', .5)],
        4: [(0, 'D5', .5), (.5, 'F5', .5), (1, 'Bb5', 1), (2, 'A5', .5), (2.5, 'G5', .5), (3, 'F5', 1)],
        5: [(0, 'G5', 1), (1, 'Eb5', .5), (1.5, 'C5', .5), (2, 'G4', 1), (3, 'Eb5', .5), (3.5, 'D5', .5)],
        6: [(0, 'D5', 1), (1, 'F5', .5), (1.5, 'D5', .5), (2, 'C5', 1), (3, 'A4', .5), (3.5, 'C5', .5)],
        7: [(0, 'Bb4', .5), (.5, 'D5', .5), (1, 'F5', .5), (1.5, 'Bb5', 1)],
    }
    for b, notes in TUNE.items():
        for beat, note, beats in notes:
            lead(b, beat, note, beats)
            if b >= 4: gl(b, beat, note, 0.35, 0.6)                              # the glockenspiel doubles it, an octave up in feel

    # ---------- bar 8: the sky goes wrong; then the drone and a quickening timpani
    put(brass([n('G2'), n('D3'), n('G3'), n('Bb3')], 1.4, fc0=1800, fcmin=500, release=0.5), T(Q, 0), 0.55, 0, rev=0.5)
    put(boom(2.0), T(Q, 0), 0.6); put(crash(2.2), T(Q, 0), 0.1, 0, rev=0.4)
    tease = END - TEASE
    put(drone([n('G1'), n('D2')], tease - 0.7, att=2.5), TEASE + 0.7, 0.10, 0, rev=0.2)
    put(pad([n('G2'), n('D3')], tease - 1.2, att=2.0, rel=0.6, cutoff=500), TEASE + 1.2, 0.18, 0, rev=0.3)
    timp = lambda t, g: put(synth.lp(boom(1.2), 300), t, g, 0, rev=0.3)
    for t, g in ((TEASE + 2.0, 0.25), (TEASE + 4.0, 0.3), (END - 1.5, 0.32), (END - 1.0, 0.36), (END - 0.5, 0.4), (END - 0.25, 0.44)):
        timp(t, g)

    # ---------- the end card: the band's chord, the tune's opening, one button
    put(brass([n('Bb2'), n('F3'), n('Bb3'), n('D4'), n('F4')], 1.6, release=0.6), T(E, 0), 0.6, 0, rev=0.5)
    put(boom(1.4), T(E, 0), 0.5); put(crash(2.4), T(E, 0), 0.12, 0, rev=0.4)
    for beat in (0, 1, 2, 3):
        tuba(E, beat, 'Bb1' if beat % 2 == 0 else 'F1', 0.8)
        if beat in (1, 3): sn(E, beat, 0.7)
    for beat, note, beats in ((1, 'F4', .5), (1.5, 'Bb4', .5), (2, 'D5', 1), (3, 'F5', 1)):
        lead(E, beat, note, beats, 0.9)
    roll(E, 3.5, 0.5, 0.3, 0.8)
    put(brass([n('Bb1'), n('Bb2'), n('F3'), n('Bb3'), n('Bb4')], 0.5, release=0.25), T(E + 1, 0), 0.6, 0, rev=0.5)
    put(kick(0.4), T(E + 1, 0), 0.8); put(snare(0.25), T(E + 1, 0), 0.4); put(crash(2.0), T(E + 1, 0), 0.1, 0, rev=0.5)
    m.write(path, wet=0.45, fade=0.6)
