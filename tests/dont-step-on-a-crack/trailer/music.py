"""The trailer's music: 15 s, 128 BPM, D major. Original; written to the edit's grid in shots.py.

Bright and bouncy on purpose: a first version in D minor, with a diminished stab, came out sounding like Halloween.

Bar 1     tiptoe pizzicato intro; the glockenspiel plays "Step on a..." as a pickup into bar 2
Bar 2     downbeat hit (an open fifth, neither sad nor spooky) = the foot lands on the crack; "...break your mother's back"
Bars 3-5  montage groove: D | G | Em A7
Bar 6     a B-flat major "uh-oh" = the last pothole, then silence for the heartbeat and Mom's phone
Bars 7-8  end card: warm D major, the rhyme's opening again, one staccato button
"""
import synth
from synth import n, midi, pluck, glock, brass, pad, kick, snare, clap, hat, shaker, boom, crash

BPM, DUR = 128, 15.0


def render(path):
    synth.seed(7)
    m = synth.Mix(DUR, BPM)
    T, put = m.T, m.put
    P = {'bass': 0.62, 'chord': 0.13, 'glock': 0.30, 'brass': 0.55, 'kick': 0.75, 'snare': 0.30, 'clap': 0.22, 'hat': 0.07, 'shk': 0.06}

    def bass(bar, beat, note, g=1.0, dur=0.26):
        put(pluck(midi(n(note)), dur, decay=0.992, bright=0.35, body=0.9), T(bar, beat), P['bass'] * g, -0.05)

    def gl(bar, beat, note, g=1.0, dur=1.3, pan=0.15):
        put(glock(midi(n(note)), dur), T(bar, beat), P['glock'] * g, pan, rev=0.5)

    def offchord(bar, beat, notes, g=1.0):
        for i, s in enumerate(notes):
            put(pluck(midi(n(s)), 0.18, decay=0.985, bright=0.6, body=0.2), T(bar, beat) + i * 0.004, P['chord'] * g, 0.25 - 0.25 * i, rev=0.25)

    # bar 1: tiptoe intro
    for b, note, g in ((0, 'D2', 1.0), (1, 'A1', 0.75), (2, 'D2', 0.9), (3, 'A1', 0.8)):
        bass(0, b, note, g)
    for b, note in ((0.5, 'D3'), (1.5, 'A2'), (2.5, 'D3')):
        bass(0, b, note, 0.35, 0.18)
    for k in range(8):
        put(shaker(), T(0, k * 0.5), P['shk'] * (1.0 if k % 2 else 0.6), 0.3)
    for b, ns in ((0.5, ('F#5', 'A5')), (1.5, ('E5', 'G5')), (2.5, ('F#5', 'A5'))):
        for s in ns: gl(0, b, s, 0.38, 0.5)
    gl(0, 3, 'A4', 0.9); gl(0, 3.5, 'D5', 0.8); gl(0, 3.75, 'E5', 0.85)             # "Step on a..."

    # bar 2: the crack, then "...break your mother's back"
    put(brass([n('D3'), n('A3'), n('D4')], 0.75), T(1, 0), P['brass'], 0, rev=0.45)
    put(boom(), T(1, 0), 0.55); put(crash(), T(1, 0), 0.10, 0.2, rev=0.3)
    gl(1, 0, 'F#5', 1.1, 1.6); gl(1, 0, 'D6', 0.45, 1.4, -0.2)                         # "CRACK"
    for b, note in ((1, 'E5'), (1.5, 'D5'), (1.75, 'C#5'), (2, 'D5')):
        gl(1, b, note, 0.85)
    gl(1, 3, 'A4', 1.05, 1.0)                                                           # "BACK"
    for b, note, g in ((1, 'D2', 0.8), (2, 'D2', 0.8), (3, 'A1', 1.1)):
        bass(1, b, note, g)
    put(snare(), T(1, 3), P['snare'] * 1.1, 0.05); put(clap(), T(1, 3), P['clap'], -0.05, rev=0.3)
    offchord(1, 3, ['A3', 'C#4', 'E4', 'G4'], 1.2)
    for i, b in enumerate((3.5, 3.625, 3.75, 3.875)):
        put(snare(), T(1, b), P['snare'] * (0.35 + 0.18 * i), 0.05)

    # bars 3-5: the montage groove
    chords = {2: [('D', 'D')], 3: [('G', 'G')], 4: [('E', 'Em'), ('A', 'A7')]}
    tones = {'D': ['D4', 'F#4', 'A4'], 'G': ['D4', 'G4', 'B4'], 'Em': ['E4', 'G4', 'B4'], 'A7': ['C#4', 'E4', 'G4']}
    for bar in (2, 3, 4):
        for k in range(8):
            beat = k * 0.5
            root, ch = chords[bar][0] if len(chords[bar]) == 1 or beat < 2 else chords[bar][1]
            low = root + ('1' if root in ('G', 'A', 'Bb') else '2')
            bass(bar, beat, low if k % 2 == 0 else root + str(int(low[-1]) + 1), 1.0 if k % 2 == 0 else 0.55, 0.22)
            if k % 2 == 1: offchord(bar, beat, tones[ch])
            put(hat(open_=(k % 2 == 1)), T(bar, beat), P['hat'] * (1.0 if k % 2 else 0.7), 0.35)
        for b in (0, 2, 2.75):
            put(kick(), T(bar, b), P['kick'] * (1.0 if b != 2.75 else 0.6))
        for b in (1, 3):
            put(snare(), T(bar, b), P['snare'], 0.05); put(clap(), T(bar, b), P['clap'], -0.05, rev=0.3)
    put(crash(), T(2, 0), 0.08, -0.3, rev=0.3)
    melody = {2: ['A5', 'F#5', 'D5', 'F#5', 'E5', 'D5', 'C#5', 'E5'],
              3: ['D6', 'B5', 'G5', 'B5', 'A5', 'G5', 'F#5', 'D5'],
              4: ['G5', 'B5', 'E6', 'B5', 'C#6', 'E6', 'G6', 'A6']}
    for bar, notes in melody.items():
        for k, s in enumerate(notes):
            gl(bar, k * 0.5, s, 0.75 if k % 2 == 0 else 0.6, 0.9)
            if bar == 4 and k >= 4:
                gl(bar, k * 0.5, s[:-1] + str(int(s[-1]) - 1), 0.3, 0.6, -0.2)
    for i in range(8):                                                                   # snare roll into the stab
        put(snare(0.15), T(4, 3 + i * 0.125), P['snare'] * (0.25 + 0.1 * i), 0.05)

    # bar 6: the pothole, a B-flat major "uh-oh", then silence so the heartbeat and the phone carry it
    put(brass([n('Bb2'), n('D3'), n('F3'), n('Bb3')], 0.9, fcmin=500), T(5, 0), P['brass'] * 1.1, 0, rev=0.5)
    put(boom(1.8), T(5, 0), 0.65); put(crash(2.2), T(5, 0), 0.11, -0.2, rev=0.4)
    gl(5, 0, 'Bb5', 0.9, 1.8); gl(5, 0, 'F5', 0.7, 1.8, -0.2)

    # bars 7-8: the end card in D major
    put(pad([n('D3'), n('F#3'), n('A3'), n('D4'), n('F#4')], 2.2, att=0.25, rel=1.0), T(6, 0), 0.32, 0, rev=0.6)
    bass(6, 0, 'D2', 1.1, 0.5)
    put(kick(), T(6, 0), P['kick'] * 0.8)
    put(crash(2.5), T(6, 0), 0.07, 0.3, rev=0.4)
    for i, s in enumerate(('D5', 'F#5', 'A5', 'D6')):
        gl(6, i * 0.25 * 0.5, s, 0.55, 1.4, -0.3 + 0.2 * i)
    gl(6, 1, 'A5', 0.95); gl(6, 1.5, 'D6', 0.85); gl(6, 1.75, 'E6', 0.85); gl(6, 2, 'F#6', 1.0, 2.0)   # "Step on a crack"
    bass(6, 2, 'D2', 0.7); bass(6, 3, 'A1', 0.8); bass(6, 3.5, 'C#2', 0.8)
    put(brass([n('D4'), n('F#4'), n('A4'), n('D5')], 0.35, fc0=4200, tau=0.05, release=0.12), T(7, 0), P['brass'] * 0.75, 0, rev=0.6)
    bass(7, 0, 'D2', 1.1, 0.4); put(kick(), T(7, 0), P['kick'] * 0.8)
    put(snare(), T(7, 0), P['snare'] * 0.8, 0.05)
    gl(7, 0, 'D6', 0.9, 2.2); gl(7, 0, 'A5', 0.5, 2.0, -0.2)

    m.write(path)
