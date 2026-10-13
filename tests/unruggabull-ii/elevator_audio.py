"""The elevator's sound on the real sequencer and audio graph: Please Hold, Horns Up (the storyboard's track in the
pattern format, on the classic voice), the long ride's effects, the operator's and p(Loom)'s blips, the brownout."""
SOUNDS = ('rideCreak', 'rideWind', 'rideSlack', 'rideFall', 'rideBrake', 'rideBurst', 'rideHook', 'rideReel', 'rideSlam',
          'rideDing', 'rideDoors', 'rideCrate', 'swoop', 'wadThrow', 'armorClank', 'thunder')
OFFLINE = '''() => { window.AudioContext = class extends OfflineAudioContext {
  constructor() { super(1, 48000 * SECONDS, 48000); Object.defineProperty(this, 'state', {value: 'running'}); }
}; }'''


def check_elevator_audio(browser, root):
    source = (root / 'site/unruggabull-ii/audio.js').read_text().replace('  return api;', '  window.audioTest = code => eval(code);\n  return api;')
    music = (root / 'site/unruggabull-ii/music-elevator.js').read_text()

    def page_with(seconds):
        page = browser.new_page()
        page.evaluate(OFFLINE.replace('SECONDS', str(seconds)))
        page.add_script_tag(content=music)
        page.add_script_tag(content=source)
        return page
    for hook in ('pleaseHold', 'muzak', 'reel', 'riff', 'brownout', 'operator', 'loom', 'arrival') + SOUNDS:
        page = page_with(4)
        result = page.evaluate('''async hook => {
          UnrugSound.init();
          if (hook === 'pleaseHold' || hook === 'arrival') {
            UnrugSound.music('pleaseHold');
            if (hook === 'arrival') UnrugSound.music(null, {hard:true});
          } else if (['muzak', 'reel', 'riff', 'brownout'].includes(hook)) {
            UnrugSound.music('hornsUp', {slam:true, pattern:hook === 'brownout' ? 'muzak' : hook, loopPattern: hook !== 'reel'});
            if (hook === 'brownout') UnrugSound.brownout(1);
          } else if (hook === 'operator') UnrugSound.say('FLOOR?', 'operator');
          else if (hook === 'loom') UnrugSound.say('RECALCULATING. BRING HIM UP.', 'loom');
          else UnrugSound.play(hook);
          audioTest('clearInterval(P.timer)');
          const b = await audioTest('ctx.startRendering()'), d = b.getChannelData(0);
          return { finite: d.every(Number.isFinite), energy: d.reduce((n,v) => n + v*v, 0) };
        }''', hook)
        assert result['finite'], (hook, result)
        assert (result['energy'] == 0 if hook == 'arrival' else result['energy'] > .001), (hook, result)
        if hook == 'arrival':
            assert page.evaluate("audioTest('P.id === null && P.timer === 0')"), 'arrival leaves the transport stopped'
        page.close()
    # Horns Up: the muzak loops until the game's cue; the reel plays once, then the riff, the breakdown and the solo
    # loop from the riff. A live replacement keeps a held pattern.
    page = page_with(2)
    page.evaluate("UnrugSound.music('hornsUp',{slam:true,pattern:'muzak',loopPattern:true}); UnrugSound.init(); audioTest('clearInterval(P.timer)')")
    assert page.evaluate("UnrugSound.musicState.pattern === 'muzak' && UnrugSound.musicState.patternLoop === 0")
    page.evaluate("audioTest('for(let i=0;i<3;i++){ P.step=P.comp[P.si].steps-1; P.next=ctx.currentTime; pumpPatterns(); }')")
    assert page.evaluate("UnrugSound.musicState.pattern === 'muzak'"), 'the muzak loops until the game cue'
    page.evaluate("UnrugSound.music(null,{hard:true}); UnrugSound.music('hornsUp',{slam:true,pattern:'reel'}); audioTest('clearInterval(P.timer)')")
    order = []
    for _ in range(6):
        order.append(page.evaluate("UnrugSound.musicState.pattern"))
        page.evaluate("audioTest('P.step=P.comp[P.si].steps-1; P.next=ctx.currentTime; pumpPatterns(); clearInterval(P.timer)')")
    assert order == ['reel', 'riff', 'breakdown', 'solo', 'riff', 'breakdown'], order
    page.evaluate("UnrugSound.music(null,{hard:true}); UnrugSound.music('hornsUp',{slam:true,pattern:'muzak',loopPattern:true}); audioTest('clearInterval(P.timer)')")
    page.evaluate("UnrugSound.registerTrack('hornsUp',Object.assign({},window.UnrugElevatorMusic.hornsUp)); audioTest('P.step=16;P.next=ctx.currentTime;pumpPatterns();clearInterval(P.timer)')")
    assert page.evaluate("UnrugSound.musicState.pattern === 'muzak'"), 'live replacement keeps the held muzak'
    page.evaluate("UnrugSound.music(null,{hard:true})")
    assert page.evaluate("audioTest('P.id === null && P.timer === 0')")
    page.close()
    print('PASS elevator audio: Please Hold, Horns Up muzak/reel/riff/loop, brownout, the ride\'s effects, the blips and silence')
