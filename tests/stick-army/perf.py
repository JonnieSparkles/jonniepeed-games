"""Measure real RAF intervals and game-loop CPU time in wave 6 at 4x CPU throttle.
Run python3 tests/stick-army/perf.py with site/ on localhost:8000. CHROMIUM chooses a browser; SITE_URL overrides URL.
--source-ref can compare historical game.js without modifying the checkout.
The response-only fixture retains 500 ink marks and uses a full squad/upgraded
turret. --stress adds an artificial backlog of enemies and fresh corpses. The wall is protected so the sample stays live.
"""
import argparse
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-ref')
parser.add_argument('--seconds', type=int, default=15)
parser.add_argument('--output', type=Path)
parser.add_argument('--trace', type=Path)
parser.add_argument('--stress', action='store_true', help='Add 20 airborne troopers and 12 fresh corpses to the normal wave')
args = parser.parse_args()
source = subprocess.check_output(['git', 'show', args.source_ref + ':site/stick-army/game.js'], cwd=ROOT, text=True) if args.source_ref else (ROOT / 'site/stick-army/game.js').read_text()
source = source.replace('  function loop(now) {', '''  var perfSample = { enabled: false, last: 0, raf: [], cpu: [], max: {} };
  function loop(now) {
    var frameStart = performance.now();
    if (perfSample.enabled) {
      if (perfSample.last) perfSample.raf.push(now - perfSample.last);
      perfSample.last = now;
      S.wallHP = S.mods.maxHP; S.turrets[0].aim = -Math.PI / 2 + Math.sin(S.t * 1.1) * 1.0; S.turrets[0].firing = true;
    }''')
source = source.replace('    requestAnimationFrame(loop);\n  }\n\n  function start', '''    if (perfSample.enabled) {
      perfSample.cpu.push(performance.now() - frameStart);
      ['troopers', 'planes', 'bullets', 'bombs', 'parts'].forEach(function (key) { perfSample.max[key] = Math.max(perfSample.max[key] || 0, S[key].length); });
    }
    requestAnimationFrame(loop);
  }

  function start''')
source = source.replace('  start();', '  window.armyTest = function (code) { return eval(code); };\n  start();')

def stats(values):
    values = sorted(values)
    at = lambda q: round(values[min(len(values)-1, int((len(values)-1)*q))], 2)
    return {'mean_ms': round(sum(values)/len(values), 2), 'p50_ms': at(.5), 'p95_ms': at(.95), 'p99_ms': at(.99), 'max_ms': at(1)}

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
    context = browser.new_context(viewport={'width':390, 'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/stick-army/game.js*', lambda route: route.fulfill(body=source, content_type='application/javascript'))
    page.goto(os.environ.get('SITE_URL','http://127.0.0.1:8000') + '/stick-army/')
    page.evaluate('document.fonts.ready')
    page.click('#startBtn')
    cdp = context.new_cdp_session(page)
    cdp.send('Emulation.setCPUThrottlingRate', {'rate':4})
    page.evaluate('''stress => armyTest(`
      R=mulberry(6); newGame(); StickArmySound.muted=true; if (typeof muted !== 'undefined') muted=true; S.mods.slots=8;
      ['double','spread','flak','rockets','auto','mines'].forEach(function(id){ ITEMS.find(function(it){return it.id===id;}).apply(S); });
      S.mods.fire=2;
      [0,4,1,5,2,6,3,7].forEach(function(slot,i){S.recruits.push(makeRecruit(slot,i<2?'engineer':i<4?'bazooka':'rifle'));});
      startWave(6); S.banner=null;
      for(var i=0;i<620;i++) addDecal({kind:'splat',x:rr(12,388),y:GROUND-rr(0,8),r:rr(1,7),color:RED,a:0.3,seed:i});
      if (${stress}) for(var j=0;j<20;j++){ spawnTrooper(rr(20,380),rr(180,490)); S.troopers[S.troopers.length-1].open=1; }
      if (${stress}) for(var k=0;k<12;k++) killFx({x:rr(30,370),y:GROUND-33},180);
      perfSample.enabled=true;
    `)''', args.stress)
    page.wait_for_timeout(5000)
    page.evaluate('armyTest("perfSample.raf=[]; perfSample.cpu=[]; perfSample.last=0;")')
    completed=[]
    if args.trace:
        cdp.on('Tracing.tracingComplete', lambda event: completed.append(event))
        cdp.send('Tracing.start', {'categories':'devtools.timeline,cc,gpu,viz', 'transferMode':'ReturnAsStream'})
    page.wait_for_timeout(args.seconds*1000)
    data=page.evaluate('armyTest("({raf:perfSample.raf,cpu:perfSample.cpu,max:perfSample.max,wave:S.wave,mode:S.mode,decals:decals.length,scale:K})")')
    page.evaluate('armyTest("perfSample.enabled=false;")')
    if args.trace:
        cdp.send('Tracing.end')
        while not completed: page.wait_for_timeout(10)
        chunks=[]
        while True:
            chunk=cdp.send('IO.read', {'handle':completed[0]['stream']}); chunks.append(chunk['data'])
            if chunk.get('eof'): break
        cdp.send('IO.close', {'handle':completed[0]['stream']})
        args.trace.parent.mkdir(parents=True,exist_ok=True); args.trace.write_text(''.join(chunks))
    assert not errors, errors
    assert data['wave']>=6 and data['mode']=='play', data
    result={'source':args.source_ref or 'working tree', 'scenario':'backlog stress' if args.stress else 'normal wave 6', 'viewport':'390x844 @2x', 'cpu_throttle':4, 'warmup_seconds':5, 'sample_seconds':args.seconds,
            'frames':len(data['cpu']), 'raf':stats(data['raf']), 'loop_cpu':stats(data['cpu']),
            'fps':round(1000/(sum(data['raf'])/len(data['raf'])),1),
            'frames_over_25_ms_percent':round(100*sum(x>25 for x in data['raf'])/len(data['raf']),2),
            'max_entities':data['max'], 'wave':data['wave'], 'retained_decals':data['decals'],
            'canvas_px_per_logical_px':round(data['scale'],3)}
    if args.output:
        args.output.parent.mkdir(parents=True,exist_ok=True); args.output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
    browser.close()
