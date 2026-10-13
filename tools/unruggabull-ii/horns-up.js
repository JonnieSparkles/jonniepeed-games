// Writes Horns Up (the original storyboard's track, tools/unruggabull-ii/long-ride/synth.js) into
// site/unruggabull-ii/music-elevator.js in the game sequencer's pattern format, one pattern per storyboard section.
// Each section is compiled as the storyboard compiled it, then written out note for note; the channels use the
// sequencer's `synth: 'classic'` voice (the storyboard's tones and drums), so it sounds as it did there.
//   node tools/unruggabull-ii/horns-up.js          (rewrites the hornsUp block; Please Hold is left alone)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..', '..');
const synth = fs.readFileSync(path.join(__dirname, 'long-ride', 'synth.js'), 'utf8');
const box = {}; vm.createContext(box);
vm.runInContext(synth + '\n;this.TRACKS = TRACKS; this.compile = compile;', box);
const horns = box.TRACKS.horns;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const name = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const SECTIONS = ['muzak', 'reel', 'riff', 'breakdown', 'solo'];
const out = {};
horns.sections.forEach((sec, si) => {
  const c = box.compile(sec), labels = [];
  if (sec.lead) labels.push(['lead', 'lead']);
  (sec.leads || []).forEach((_, i) => labels.push(['harmony' + (i + 1), 'harmony']));
  if (sec.riff) labels.push(['riff', 'power']);
  [sec.arp].concat(sec.arps || []).filter(Boolean).forEach((_, i) => labels.push(['arp' + (i + 1), 'arp']));
  if (sec.bass) labels.push(['bass', 'bass']);
  if (labels.length !== c.chans.length) throw new Error('channel count');
  const channels = {};
  c.chans.forEach((ch, i) => {
    const tokens = [];
    for (let s = 0; s < c.steps;) {
      const evs = ch.byStep[s];
      if (!evs) { tokens.push('.'); s++; continue; }
      const e = evs[0], len = Math.min(e.len, c.steps - s), rest = evs.slice(1).map(x => name(x.m));
      if (!rest.length && e.g == null) { tokens.push(name(e.m)); for (let k = 1; k < len; k++) tokens.push('-'); }
      else { const o = { note: name(e.m), len }; if (rest.length) o.chord = rest; if (e.g != null) o.gate = e.g; tokens.push(o); }
      s += len;
    }
    const cfg = { stem: labels[i][1], synth: 'classic', wave: ch.wave, vol: ch.vol };
    if (ch.gate) cfg.gate = ch.gate; if (ch.vib) cfg.vib = true; if (ch.drive) cfg.drive = true;
    cfg.notes = tokens.every(x => typeof x === 'string') ? bars(tokens) : tokens;
    channels[labels[i][0]] = cfg;
  });
  const drums = c.drums.map(d => d === '.' ? '.' : d), crash = c.drums.map((_, s) => c.crash.has(s) ? 'c' : '.');
  channels.drums = { stem: 'drums', synth: 'classic', wave: 'noise', notes: bars(drums) };
  if (crash.includes('c')) channels.crash = { stem: 'drums', synth: 'classic', wave: 'noise', notes: bars(crash) };
  out[SECTIONS[si]] = { bars: c.steps / 16, bpm: sec.bpm, channels };
});
function bars(tokens) { const b = []; for (let i = 0; i < tokens.length; i += 16) b.push(tokens.slice(i, i + 16).join(' ')); return b.join(' | '); }
const stems = ['lead', 'harmony', 'power', 'arp', 'bass', 'drums'];
const track = { name: 'Horns Up', key: 'Em', bpm: horns.sections[0].bpm, swing: 0, order: SECTIONS, loop: 2, startPattern: 'muzak', stems, patterns: out };
const body = JSON.stringify(track, null, 1).replace(/\n\s*/g, ' ').replace(/"(\w+)":/g, '$1:').replace(/"/g, "'");
const lines = body.replace(/ (muzak|reel|riff|breakdown|solo): \{ bars/g, '\n  $1: { bars').replace(/ (lead|harmony\d|riff|arp\d|bass|drums|crash): \{ stem/g, '\n    $1: { stem');
const file = path.join(root, 'site', 'unruggabull-ii', 'music-elevator.js');
const src = fs.readFileSync(file, 'utf8'), at = src.indexOf('// Horns Up');
if (at < 0) throw new Error('no Horns Up block');
fs.writeFileSync(file, src.slice(0, at) + '// Horns Up: the original storyboard\'s track (written by tools/unruggabull-ii/horns-up.js; edit synth.js and rerun).\n' +
  '// muzak until p(Loom) takes the cable, then the reel: power chords, the riff, the breakdown and the solo, looping from the riff.\n' +
  'window.UnrugElevatorMusic.hornsUp = ' + lines + ';\n');
console.log('hornsUp:', SECTIONS.map(k => k + ' ' + out[k].bars + ' bars').join(', '));
