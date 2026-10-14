"""Render every roof hook through the actual Web Audio graph; no shipped test API."""
def check_audio(browser, root):
    audio = (root / 'site/unruggabull-ii/audio.js').read_text().replace('  return api;', '  window.audioTest = code => eval(code);\n  return api;')
    for hook in ['storm', 'thunder', 'snare', 'snareCut', 'gust', 'spoolSnap', 'beam', 'rush', 'pinch', 'snap', 'chord', 'bell', 'hintStream', 'loom', 'roof', 'roofHeavy', 'quiet']:
        page = browser.new_page()
        page.evaluate('''() => { window.AudioContext = class extends OfflineAudioContext {
          constructor() { super(1, 48000 * 4, 48000); Object.defineProperty(this, 'state', {value: 'running'}); }
        }; }''')
        page.add_script_tag(content=(root / 'site/unruggabull-ii/music-roof.js').read_text())
        page.add_script_tag(content=audio)
        result = page.evaluate('''async hook => {
          UnrugSound.init();
          if (hook === 'quiet') { UnrugSound.music('roof'); UnrugSound.music(null); }
          else if (hook === 'loom') UnrugSound.say('UNLIKELY.', 'loom');
          else if (hook === 'roof' || hook === 'roofHeavy') UnrugSound.music(hook);
          else UnrugSound.play(hook);
          audioTest('clearInterval(P.timer)');
          const b = await Promise.race([audioTest('ctx.startRendering()'), new Promise((_, fail) => setTimeout(() => fail(new Error('offline hook timeout: ' + hook)), 10000))]), d = b.getChannelData(0);
          let sum = 0; for (const v of d) sum += v * v;
          return { rms: Math.sqrt(sum / d.length), finite: d.every(Number.isFinite) };
        }''', hook)
        assert result['finite'], (hook, result)
        if hook == 'quiet':
            assert result['rms'] == 0, ('quiet leaks music', result)
        else:
            assert result['rms'] > .00001, (hook, result)
        if hook == 'loom':
            assert page.evaluate("audioTest('VOICES.loom.f < VOICES.shredder.f && VOICES.loom.wave !== VOICES.shredder.wave')")
        if hook == 'roofHeavy':
            assert page.evaluate("audioTest('TRACKS.roofHeavy.bpm > TRACKS.roof.bpm')")
            page.evaluate('UnrugSound.music(null)')
            assert page.evaluate("audioTest('P.id === null && P.timer === 0')"), 'quiet has no active sequencer'
        if hook == 'storm':
            page.evaluate('UnrugSound.roofSound(null)')
            assert page.evaluate("audioTest('stormLoop === null && beamLoop === null')"), 'dawn releases sustained nodes'
        assert page.evaluate("JSON.stringify(UnrugSound.talkTimes('HELLO, UNRUGGABULL.', 'loom')) === JSON.stringify(UnrugSound.talkTimes('HELLO, UNRUGGABULL.', 'announcer'))"), 'caption cadence stays unchanged'
        page.close()
    # Mute routes the sustained sounds and voice through the same master as existing sounds.
    page = browser.new_page()
    page.evaluate('''() => { window.AudioContext = class extends OfflineAudioContext {
      constructor() { super(1, 48000 * 2, 48000); Object.defineProperty(this, 'state', {value: 'running'}); }
    }; }''')
    page.add_script_tag(content=(root / 'site/unruggabull-ii/music-roof.js').read_text())
    page.add_script_tag(content=audio)
    page.evaluate('UnrugSound.init(); UnrugSound.roofSound({storm:true,beam:true,onEye:true}); UnrugSound.toggle()')
    assert page.evaluate("audioTest('!!stormLoop && !!beamLoop && muted')")
    muted_rms = page.evaluate('''async () => {
      UnrugSound.say('HELLO.', 'loom'); UnrugSound.play('snap'); UnrugSound.music('roofHeavy'); audioTest('clearInterval(P.timer)');
      const b = await audioTest('ctx.startRendering()'), d = b.getChannelData(0).slice(48000);
      let sum = 0; for (const v of d) sum += v*v; return Math.sqrt(sum / d.length);
    }''')
    assert muted_rms < 1e-8, ('mute leaks roof sound', muted_rms)
    page.evaluate('UnrugSound.roofSound(null)'); page.close()
    # The Shredder's voice is a machine and carries on a phone speaker: about as loud as Unruggabull's above 300 Hz.
    page = browser.new_page()
    page.evaluate('''() => { window.AudioContext = class extends OfflineAudioContext {
      constructor() { super(1, 48000 * 2.2, 48000); Object.defineProperty(this, 'state', {value: 'running'}); }
    }; }''')
    page.add_script_tag(content=audio)
    level = {}
    for who in ['shredder', 'bull']:
        level[who] = page.evaluate('''async who => {
          UnrugSound.init(); audioTest('clearInterval(P.timer)'); UnrugSound.say('THAT GOES ON YOUR RECORD.', who);
          const b = await audioTest('ctx.startRendering()'), d = b.getChannelData(0).slice(0, 48000 * 1.9);
          let h = 0, y = 0, x0 = 0; const a = Math.exp(-2 * Math.PI * 300 / 48000);
          for (const v of d) { y = a * (y + v - x0); x0 = v; h += y * y; } return Math.sqrt(h / d.length);
        }''', who)
        page.reload(); page.evaluate('''() => { window.AudioContext = class extends OfflineAudioContext {
          constructor() { super(1, 48000 * 2.2, 48000); Object.defineProperty(this, 'state', {value: 'running'}); }
        }; }'''); page.add_script_tag(content=audio)
    assert level['shredder'] >= level['bull'] * .85, ('the Shredder is too quiet on a phone', level)
    page.close()
    print('PASS roof audio: 16 hooks render nonzero finite sound, tracks, cadence, mute and loop cleanup')
