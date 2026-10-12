"""The replaceable muzak, operator voice and ding use the real sequencer/audio graph."""
def check_elevator_audio(browser, root):
    source = (root / 'site/unruggabull-ii/audio.js').read_text().replace('  return api;', '  window.audioTest = code => eval(code);\n  return api;')
    for hook in ('pleaseHold', 'ding', 'operator', 'arrival'):
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
    print('PASS elevator audio: muzak, ding, operator and hard-cut silence')
