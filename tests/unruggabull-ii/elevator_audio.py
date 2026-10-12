"""The replaceable muzak, operator voice and ding use the real sequencer/audio graph."""
def check_elevator_audio(browser, root):
    source = (root / 'site/unruggabull-ii/audio.js').read_text().replace('  return api;', '  window.audioTest = code => eval(code);\n  return api;')
    for hook in ('pleaseHold', 'hornsIntro', 'hornsHeavy', 'cableSnap', 'ding', 'operator', 'arrival'):
        page = browser.new_page()
        page.evaluate('''() => { window.AudioContext = class extends OfflineAudioContext {
          constructor() { super(1, 48000 * 4, 48000); Object.defineProperty(this, 'state', {value: 'running'}); }
        }; }''')
        page.add_script_tag(content=(root / 'site/unruggabull-ii/music-elevator.js').read_text())
        page.add_script_tag(content=source)
        result = page.evaluate('''async hook => {
          UnrugSound.init();
          if (hook === 'pleaseHold' || hook === 'arrival') {
            UnrugSound.music('pleaseHold');
            if (hook === 'arrival') UnrugSound.music(null, {hard:true});
          } else if (hook === 'hornsIntro' || hook === 'hornsHeavy') {
            UnrugSound.music('hornsUp', {slam:true, pattern:hook === 'hornsIntro' ? 'intro' : 'heavy'});
          } else if (hook === 'operator') UnrugSound.say('Floor?', 'operator');
          else UnrugSound.play('ding');
          audioTest('clearInterval(P.timer)');
          const b = await audioTest('ctx.startRendering()'), d = b.getChannelData(0);
          return { finite: d.every(Number.isFinite), energy: d.reduce((n,v) => n + v*v, 0) };
        }''', hook)
        assert result['finite'], (hook, result)
        assert (result['energy'] == 0 if hook == 'arrival' else result['energy'] > .001), (hook, result)
        if hook == 'arrival':
            assert page.evaluate("audioTest('P.id === null && P.timer === 0')"), 'ding leaves the transport stopped'
        page.close()
    # The intro cannot advance itself into heavy, even across multiple complete patterns.
    # Named same-track heavy jumps start at step zero, repeat only heavy, and survive pre-unlock cues.
    page = browser.new_page()
    page.evaluate("""() => { window.AudioContext = class extends OfflineAudioContext {
      constructor() { super(1,48000*2,48000); Object.defineProperty(this,'state',{value:'running'}); }
    }; }""")
    page.add_script_tag(content=(root / 'site/unruggabull-ii/music-elevator.js').read_text())
    page.add_script_tag(content=source)
    page.evaluate("UnrugSound.music('hornsUp',{slam:true,pattern:'intro'}); UnrugSound.init(); audioTest('clearInterval(P.timer)')")
    assert page.evaluate("UnrugSound.musicState.pattern === 'intro' && UnrugSound.musicState.patternLoop === 0")
    page.evaluate("audioTest('for(let i=0;i<3;i++){ P.step=P.comp[P.si].steps-1; P.next=ctx.currentTime; pumpPatterns(); }')")
    assert page.evaluate("UnrugSound.musicState.pattern === 'intro'"), 'intro loops until the game cue'
    page.evaluate("UnrugSound.music(null,{hard:true}); UnrugSound.music('hornsUp',{slam:true,pattern:'heavy'}); audioTest('clearInterval(P.timer)')")
    assert page.evaluate("UnrugSound.musicState.pattern === 'heavy' && UnrugSound.musicState.patternLoop === 1"), 'same track jumps into heavy'
    page.evaluate("audioTest('for(let i=0;i<3;i++){ P.step=P.comp[P.si].steps-1; P.next=ctx.currentTime; pumpPatterns(); }')")
    assert page.evaluate("UnrugSound.musicState.pattern === 'heavy'"), 'heavy loops only heavy'
    page.evaluate("UnrugSound.registerTrack('hornsUp',Object.assign({},window.UnrugElevatorMusic.hornsUp)); audioTest('P.step=16;P.next=ctx.currentTime;pumpPatterns();clearInterval(P.timer)')")
    assert page.evaluate("UnrugSound.musicState.pattern === 'heavy'"), 'live replacement preserves held section'
    page.evaluate("UnrugSound.music(null,{hard:true})")
    assert page.evaluate("audioTest('P.id === null && P.timer === 0')")
    page.close()
    print('PASS elevator audio: Please Hold, Horns Up intro/heavy/loop/jump, snap, ding, operator and silence')
