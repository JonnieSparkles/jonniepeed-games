// Shared helpers for the game's generated music (roof-music.js, factory-music.js): note names, power-chord riffs,
// lead lines, harmonies, arpeggios and drum bars as short strings, expanded into the sequencer's pattern format
// (docs/games/unruggabull-ii/README.md, "Writing and auditioning music").
'use strict';
const NI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const M = n => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) throw new Error('bad note ' + n); return (+m[3] + 1) * 12 + NI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); };
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const nm = m => NAMES[m % 12] + (Math.floor(m / 12) - 1);
const barsOf = s => s.split('|').map(b => b.trim().split(/\s+/));
const check = (bars, what) => bars.forEach((b, i) => { if (b.length !== 16) throw new Error(what + ' bar ' + (i + 1) + ' has ' + b.length + ' steps'); });

// Guitar: each bar starts "ROOT:", then 16 steps. x = palm-muted chug on the root, O = open power chord on the root,
// a note name = open power chord on that note, mNOTE = muted on that note, - hold, . rest.
function parseGtr(s) {
  return barsOf(s).map(b => { const root = b[0].replace(':', ''); return { root, steps: b.slice(1) }; });
}
function gtr(s, o = {}) {
  const vol = o.vol || .042, mute = o.mute || .036, out = [], bars = parseGtr(s);
  check(bars.map(b => b.steps), 'guitar');
  for (const b of bars) for (const t of b.steps) {
    if (t === '-' || t === '.') { out.push(t); continue; }
    const muted = t === 'x' || /^m[A-G]/.test(t), n = t === 'x' || t === 'O' ? b.root : t.replace(/^m/, ''), r = M(n);
    out.push({ note: r, chord: [r + 7, r + 12], gate: muted ? .32 : .95, vol: muted ? mute : vol });
  }
  return out;
}
function bass(s) {
  const out = [], bars = parseGtr(s);
  for (const b of bars) for (const t of b.steps) {
    if (t === '-' || t === '.') { out.push(t); continue; }
    const muted = t === 'x' || /^m[A-G]/.test(t), n = t === 'x' || t === 'O' ? b.root : t.replace(/^m/, '');
    out.push({ note: M(n) - 12, gate: muted ? .4 : .92 });
  }
  return out;
}
const line = s => { check(barsOf(s), 'line'); return s; };
const rest = bars => Array(bars).fill(Array(16).fill('.').join(' ')).join(' | ');
// Move a melody n steps along D minor (a twin lead a third below is -2). Notes outside the scale snap down first.
const SCALE = [0, 2, 3, 5, 7, 8, 10];   // D minor, counted from D
function harm(s, n) {
  return line(s).split(/\s+/).map(t => {
    if (t === '-' || t === '.' || t === '|') return t;
    let m = M(t), pc = (m % 12 + 12) % 12, back = 0;
    while (SCALE.indexOf((pc - 2 - back + 24) % 12) < 0) back++;
    m -= back; const deg = SCALE.indexOf((m - 2 + 24) % 12), oct = Math.floor((m - 2) / 12);
    const tot = oct * 7 + deg + n, o2 = Math.floor(tot / 7), d2 = ((tot % 7) + 7) % 7;
    return nm(2 + o2 * 12 + SCALE[d2]);
  }).join(' ');
}
// Swap one bar of a line (for twin-lead bars over the A major chord, where the scale's C would clash with C#).
const setBar = (s, i, bar) => { const b = s.split('|').map(x => x.trim()); b[i] = bar; return line(b.join(' | ')); };
const shift = (s, k) => line(s).split(/\s+/).map(t => t === '-' || t === '.' || t === '|' ? t : nm(M(t) + k)).join(' ');
// Retro synth arpeggio: one chord per bar (space-separated notes), 16 sixteenths a bar.
function arp(chords, mode = 'up') {
  return chords.map(c => {
    let tones = c.split(' ').map(M); tones = tones.concat([tones[0] + 12]);
    const seq = mode === 'updown' ? tones.concat(tones.slice(1, -1).reverse()) : tones;
    return Array.from({ length: 16 }, (_, i) => nm(seq[i % seq.length])).join(' ');
  }).join(' | ');
}
const drums = (bars, fill, last) => { const b = Array(bars).fill(fill); if (last) b[bars - 1] = last; check(b.map(x => x.split(' ')), 'drums'); return b.join(' | '); };
const crash = bars => Array.from({ length: bars }, (_, i) => i === 0 ? 'c . . . . . . . . . . . . . . .' : '. . . . . . . . . . . . . . . .').join(' | ');

// One pattern: guitar riff, lead line, and the layers. Heavy swaps the lead to a saw and adds a detuned second saw.
function pattern(heavy, p) {
  const bars = p.bars || (p.gtr ? parseGtr(p.gtr).length : barsOf(p.tap).length), ch = {};
  ch.drums = { stem: 'drums', wave: 'noise', vol: heavy ? .62 : .5, notes: heavy && p.heavyDrums ? p.heavyDrums : p.drums };
  ch.crash = { stem: 'drums', wave: 'noise', vol: heavy ? .5 : .4, notes: p.crash || crash(bars) };
  if (p.gtr) ch.gtr = { stem: 'bass', wave: 'pulse', duty: .25, drive: true, notes: gtr(p.gtr, heavy ? { vol: .048, mute: .042 } : {}) };
  // A tapped single-note guitar riff (Coheed style), distorted like the chords.
  if (p.tap) ch.tap = { stem: 'bass', wave: 'pulse', duty: .25, drive: true, vol: heavy ? .056 : .05, gate: .8, notes: line(p.tap) };
  ch.bass = { stem: 'bass', wave: 'triangle', vol: heavy ? .3 : .27, notes: p.bassLine ? line(p.bassLine) : bass(p.gtr) };
  const lead = p.lead || rest(bars);
  ch.lead = heavy
    ? { stem: 'lead', wave: 'sawtooth', vol: .05, gate: .92, notes: line(lead), vibrato: { rate: 6, depth: .008, delay: .1 }, echo: { delay: .16, feedback: .22, repeats: 2 } }
    : { stem: 'lead', wave: 'pulse', duty: .5, vol: .075, gate: .92, notes: line(lead), vibrato: { rate: 5.5, depth: .007, delay: .12 }, echo: { delay: .17, feedback: .22, repeats: 2 } };
  ch.harmony = { stem: 'harmony', wave: 'pulse', duty: .25, vol: heavy ? .045 : .042, gate: .92, notes: p.harmony || rest(bars), vibrato: { rate: 5.5, depth: .007, delay: .12 } };
  ch.synth = { stem: 'power', wave: 'pulse', duty: .125, vol: p.synthVol || .022, gate: .55, notes: p.synth || rest(bars), echo: p.synthEcho ? { delay: .12, feedback: .3, repeats: 1 } : undefined };
  if (p.kicks) ch.kicks = { stem: 'power', wave: 'noise', vol: heavy ? .38 : .32, notes: p.kicks };
  // The tune doubled an octave down (a bigger chorus), and a clean synthwave saw bass.
  if (p.leadLow) ch.leadLow = { stem: 'lead', wave: 'pulse', duty: .25, vol: heavy ? .045 : .04, gate: .92, notes: shift(lead, -12) };
  if (p.synthBass) ch.sbass = { stem: 'bass', wave: 'sawtooth', vol: heavy ? .045 : .04, gate: .6, envelope: { attack: .002, decay: .05, sustain: .5, release: .03 }, notes: line(p.synthBass) };
  // A clean, echoing arpeggio guitar (intros), and the souls' choir: held chords on two detuned voices that swell in.
  if (p.clean) ch.clean = { stem: 'bass', wave: 'pulse', duty: .125, vol: .05, gate: .7, notes: line(p.clean), echo: { delay: .2, feedback: .35, repeats: 3 } };
  if (p.choir) for (const [k, d] of [['choirA', -10], ['choirB', 9]]) ch[k] = {
    stem: p.choirStem || 'power', wave: 'sawtooth', vol: (heavy ? .022 : .018) * (p.choirLevel || 1), detune: d,
    envelope: { attack: .35, decay: .2, sustain: .85, release: .4 }, vibrato: { rate: 4.8, depth: .006, delay: .2 },
    notes: p.choir.map(c => { const n = c.split(' '); return { note: n[0], chord: n.slice(1), len: 16, gate: .98 }; })
  };
  if (heavy) ch.lead2 = { stem: 'heavy', wave: 'sawtooth', vol: .028, gate: .92, detune: 14, notes: line(lead) };
  return { bars, channels: ch };
}
function track(name, bpm, order, pats, heavy) {
  const patterns = {};
  for (const k of Object.keys(pats)) patterns[k] = pattern(heavy, pats[k]);
  return {
    name: name + (heavy ? ' (heavy)' : ''), key: 'Dm', bpm, swing: 0, loop: 0, order,
    stems: ['drums', 'bass', 'lead', 'harmony', 'power'].concat(heavy ? ['heavy'] : []),
    patterns
  };
}

module.exports = { NI, M, NAMES, nm, barsOf, check, parseGtr, gtr, bass, line, rest, SCALE, harm, setBar, shift, arp, drums, crash, pattern, track };
