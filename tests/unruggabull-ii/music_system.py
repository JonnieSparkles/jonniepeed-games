"""Opt-in pattern transport tests; injection stays out of shipped audio.js."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread

def check_music(browser, root):
    audio=(root/'site/unruggabull-ii/audio.js').read_text().replace('  return api;', '  window.audioTest = code => eval(code);\n  return api;')
    page=browser.new_page()
    page.evaluate('''() => { window.musicNow=0; window.AudioContext=class extends OfflineAudioContext {
      constructor(){super(1,48000*8,48000);Object.defineProperty(this,'state',{value:'running'});
      Object.defineProperty(this,'currentTime',{get:()=>window.musicNow});}
    }; }''')
    page.add_script_tag(content=(root/'site/unruggabull-ii/music-roof.js').read_text());page.add_script_tag(content=audio)
    page.evaluate('''() => {
      const S=UnrugSound, check=(ok,msg)=>{if(!ok)throw new Error(msg);};
      S.init();const catalog=S.tracks().filter(t=>/^roof[ABC]/.test(t.id));
      check(catalog.length===6 && catalog.every(t=>t.key==='Dm'&&t.seconds>=30&&t.seconds<=60),'six D-minor tracks have full 30–60-second A/B orders');
      for(const id of ['A','B','C']){const normal=catalog.find(t=>t.id==='roof'+id),heavy=catalog.find(t=>t.id==='roof'+id+'Heavy');check(heavy.bpm/normal.bpm>=1.1&&heavy.bpm/normal.bpm<=1.15,'heavy tempo rises 10–15%');}
      S.roofCue('fight',{candidate:'b'});audioTest('clearInterval(P.timer)');
      check(S.track==='roofB'&&S.musicState.stems.join(',')==='drums,bass,lead','fight starts selected track with three stems');
      S.roofCue('round2');check(!S.musicState.stems.includes('harmony')&&S.musicState.nextStems.includes('harmony'),'round two queues harmony');
      window.musicNow=.2;audioTest('pump()');check(!S.musicState.stems.includes('harmony'),'stem change waits for bar');
      while(window.musicNow<2){window.musicNow+=.025;audioTest('pump()');}
      check(S.musicState.stems.includes('harmony'),'harmony enters at next bar');
      S.roofCue('round3');S.tempo(1.1);
      while(window.musicNow<4){window.musicNow+=.025;audioTest('pump()');}
      check(S.musicState.stems.includes('power')&&S.musicState.rate===1.1,'round three and tempo enter on bar');
      S.music('roofC',{boundary:'beat'});check(S.musicState.playing==='roofB'&&S.musicState.pending==='roofC','beat switch is queued');
      while(window.musicNow<4.8){window.musicNow+=.025;audioTest('pump()');}
      check(S.musicState.playing==='roofC'&&!S.musicState.pending,'beat boundary switches track');
      S.music('roofA',{boundary:'bar'});check(S.musicState.playing==='roofC','bar switch waits');
      while(window.musicNow<6.9){window.musicNow+=.025;audioTest('pump()');}
      check(S.musicState.playing==='roofA','bar switch applies');
      S.roofCue('spool');check(audioTest('!!musicFx'),'spool power chord plays on the music overlay');
      S.roofCue('cut');check(S.track===null&&audioTest('P.id===null&&P.timer===0&&musicFx===null'),'hard cut kills transport and music overlays');
      S.roofCue('flood');check(S.track===null&&audioTest('musicFx===null'),'the flood leaves the music silent; the returning souls play it');
      S.roofCue('fusion');check(S.track==='roofBHeavy'&&S.musicState.playing==='roofBHeavy','heavy slam remembers selected candidate');
      S.roofCue('one');check(S.track===null&&audioTest('!!musicFx'),'one percent drops to a held note');
      S.roofCue('dawn');check(S.track===null&&audioTest('musicFx===null'),'dawn releases held music and plays the chord');
      S.music(null,{hard:true});
      const line=note=>note+' . . . . . . . . . . . . . . .';
      const makeLoop=note=>({bpm:120,loop:1,order:['intro','verse'],stems:['lead'],patterns:{
        intro:{bars:1,channels:{lead:{stem:'lead',wave:'pulse',vol:.05,notes:line(note)}}},
        verse:{bars:1,channels:{lead:{stem:'lead',wave:'pulse',vol:.05,notes:line('F5')}}}}});
      S.registerTrack('loop-test',makeLoop('D5'));S.music('loop-test',{slam:true});audioTest('clearInterval(P.timer)');
      let deadline=window.musicNow+6.05;while(window.musicNow<deadline){window.musicNow+=.025;audioTest('pump()');}
      check(audioTest('P.si===1'),'order loops to verse without replaying intro');
      S.registerTrack('loop-test',makeLoop('G5'));check(S.musicState.pending==='loop-test','edited playing data queues a bar replacement');
      deadline=window.musicNow+2.05;while(window.musicNow<deadline){window.musicNow+=.025;audioTest('pump()');}
      check(audioTest("P.comp[0].chans[0].byStep[0][0].note==='G5'"),'registered edit applies on next bar');
      audioTest(`(() => {const create=ctx.createOscillator;let n=0;ctx.createOscillator=function(){n++;return create.call(ctx);};
        try {patternNote(musicBus,{wave:'pulse',vol:0},{note:'D5',len:1},ctx.currentTime+.01,.1);if(n!==0)throw new Error('zero volume makes sound');
          patternNote(musicBus,{wave:'pulse',vol:.05,echo:{repeats:3}},{note:'D5',len:1,echo:false},ctx.currentTime+.01,.1);if(n!==1)throw new Error('per-note echo disable failed');}
        finally {ctx.createOscillator=create;}})()`);
      // Per-note and per-channel effects compile without changing the legacy format.
      S.registerTrack('effects',{bpm:120,loop:0,order:['A'],stems:['lead'],patterns:{A:{bars:1,channels:{lead:{wave:'pulse',duty:.125,vol:.06,
        envelope:{attack:.02,decay:.05,sustain:.4,release:.1},vibrato:{rate:6,depth:.01},notes:[{note:'D5',len:2,arp:[0,7,12],echo:{delay:.1,feedback:.3,repeats:2}},
        {note:'A5',len:2,slide:'D5'},'.','.','.','.','.','.','.','.','.','.','.','.']}}}}});
      S.music('effects');audioTest('clearInterval(P.timer)');
      const compiled=audioTest('P.comp');check(compiled[0].chans[0].byStep[0][0].arp.length===3,'per-note effects survive compilation');
      S.music(null,{hard:true});
    }''')
    page.close()
    # The 13th Floor's shuffle: the cold open once, stems that grow on the bar, the copy room on the next bar.
    page=browser.new_page()
    page.evaluate('''() => { window.musicNow=0; window.AudioContext=class extends OfflineAudioContext {
      constructor(){super(1,48000*8,48000);Object.defineProperty(this,'state',{value:'running'});
      Object.defineProperty(this,'currentTime',{get:()=>window.musicNow});}
    }; }''')
    page.add_script_tag(content=(root/'site/unruggabull-ii/music-roof.js').read_text())
    page.add_script_tag(content=(root/'site/unruggabull-ii/music-floor.js').read_text());page.add_script_tag(content=audio)
    page.evaluate('''() => {
      const S=UnrugSound, check=(ok,msg)=>{if(!ok)throw new Error(msg);}, until=t=>{while(window.musicNow<t){window.musicNow+=.025;audioTest('pump()');}};
      const HALL=['drums','bass','lead'], ALL=HALL.concat('harmony','power'), HEAVY=ALL.concat('heavy');
      S.init();
      for(const id of ['floorHall','floorCopy','floorShred']){const tr=S.tracks().find(t=>t.id===id);check(tr&&tr.key==='Em','the floor has '+id);
        check(audioTest("TRACKS['"+id+"'].patterns.A.channels.paLead.stem==='dark'"),id+' carries the muzak for the dark');}
      S.music('floorHall',{stems:HALL});audioTest('clearInterval(P.timer)');
      check(S.musicState.pattern==='I'&&S.musicState.stems.join()===HALL.join(),'the floor opens on the cold open with drums, bass and lead');
      until(3.6);check(S.musicState.pattern==='I','two bars of muzak at 120');
      until(4.1);check(S.musicState.pattern==='A','then the band at 150');
      S.stems(HALL.concat('harmony'));until(5.4);check(!S.musicState.stems.includes('harmony'),'moving day waits for the bar');
      until(5.7);check(S.musicState.stems.includes('harmony'),'and adds the harmony on it');
      S.stems(['dark']);until(7.0);check(S.musicState.stems.includes('lead'),'lights out waits for the bar');
      until(7.35);check(S.musicState.stems.join()==='dark','then only the muzak over the PA');
      until(17);check(S.musicState.pattern==='A'&&audioTest('P.si===1'),'the cold open plays once; the shuffle loops');
      S.music('floorCopy',{boundary:'bar',stems:ALL});check(S.musicState.playing==='floorHall'&&S.musicState.pending==='floorCopy','the copy room waits for the bar');
      until(18.45);check(S.musicState.playing==='floorCopy'&&S.musicState.stems.join()===ALL.join(),'and comes in on it with the full band');
      S.music('floorShred',{slam:true,stems:HEAVY});check(S.musicState.playing==='floorShred'&&S.musicState.stems.join()===HEAVY.join(),'the Shredder slams in heavy');
      S.tempo(1.2);check(S.musicState.rate===1,'a rally speeds it up on the next bar');
      until(window.musicNow+60/168*4+.05);check(S.musicState.rate===1.2,'by then');
      S.music(null,{hard:true});
    }''')
    page.close()
    # The lab uses actual button taps to unlock, has phone-sized targets, and switches every candidate.
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, *args): pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(root)))
    Thread(target=server.serve_forever,daemon=True).start()
    page.goto('http://127.0.0.1:'+str(server.server_port)+'/tools/unruggabull-ii/music-lab.html')
    assert page.evaluate('document.documentElement.scrollWidth')<=390
    for button in page.locator('[data-track]').all():
        assert button.bounding_box()['height']>=56
        button.click();page.wait_for_timeout(100)
        assert page.evaluate('UnrugSound.track')==button.get_attribute('data-track')
    assert page.evaluate('UnrugSound.ready'), 'first tap unlocks audio'
    page.locator('[data-cue="quiet"]').click();assert page.evaluate('UnrugSound.track') is None
    page.locator('#stop').click();assert not errors,errors
    context.close();server.shutdown();server.server_close();print('PASS music system: patterns, effects, stems, tempo, boundaries, cues, the 13th Floor shuffle and phone lab')
