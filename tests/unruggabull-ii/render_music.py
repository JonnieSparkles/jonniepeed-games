"""Render a full first pass through six legacy tracks with repeatable cosmetic noise.
Usage: --source audio.js --out DIR [--compare DIR]. Requires Chromium/Playwright.
"""
import argparse, base64, hashlib, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[2]

def render_legacy(browser, source, out, tracks=None):
    out.mkdir(parents=True, exist_ok=True); report={}
    source=source.replace('  return api;', '  window.audioTest = code => eval(code);\n  return api;')
    for track in tracks or ['theme','tower','staff','dark','copy','shred']:
        page=browser.new_page()
        page.evaluate('''() => {
          window.audioTime=0; let seed=197;
          // Chromium sums unordered node-input sets; different allocation addresses can change the last float bit.
          // Record the connections and use unity-gain binary trees: same synthesis, deterministic addition order.
          const connect=AudioNode.prototype.connect, wires=new Map();
          AudioNode.prototype.connect=function(dest,...args){
            if(dest instanceof AudioNode){if(!wires.has(dest))wires.set(dest,[]);wires.get(dest).push(this);return dest;}
            return connect.call(this,dest,...args);
          };
          window.finishGraph=()=>{for(const [dest,sources] of wires){
            let sum=sources[0];for(let i=1;i<sources.length;i++){
              const next=sum.context.createGain();connect.call(sum,next);connect.call(sources[i],next);sum=next;
            }connect.call(sum,dest);
          }};
          Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
          window.AudioContext=class extends OfflineAudioContext {
            constructor(){ super(1,48000*64,48000); Object.defineProperty(this,'state',{value:'running'});
              Object.defineProperty(this,'currentTime',{get:()=>window.audioTime}); }
          };
        }''')
        page.add_script_tag(content=(ROOT/'site/unruggabull-ii/music-roof.js').read_text())
        page.add_script_tag(content=source)
        data=page.evaluate('''async id=>{
          UnrugSound.init(); UnrugSound.music(id); audioTest('clearInterval(P.timer)');
          const duration=audioTest('P.comp.reduce((n,s)=>n+s.steps*s.stepDur,0)');
          while(window.audioTime<duration+.08){window.audioTime+=.025;audioTest('pump()');}
          window.finishGraph(); const buffer=await audioTest('ctx.startRendering()');
          const bytes=new Uint8Array(buffer.getChannelData(0).buffer,0,Math.ceil((duration+1)*48000)*4);
          let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));
          return {duration,pcm:btoa(s)};
        }''',track)
        pcm=base64.b64decode(data['pcm']);(out/(track+'.f32')).write_bytes(pcm)
        report[track]={'seconds':data['duration'],'bytes':len(pcm),'sha256':hashlib.sha256(pcm).hexdigest()};page.close()
        print('rendered',track,report[track]['sha256'],flush=True)
    (out/'hashes.json').write_text(json.dumps(report,indent=2));return report

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--source',type=Path,default=ROOT/'site/unruggabull-ii/audio.js');ap.add_argument('--out',type=Path,required=True);ap.add_argument('--compare',type=Path);ap.add_argument('--tracks');args=ap.parse_args()
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM'));report=render_legacy(b,args.source.read_text(),args.out,args.tracks.split(',') if args.tracks else None);b.close()
    if args.compare:
        assert report==json.loads((args.compare/'hashes.json').read_text()),'legacy audio changed'
        for track in report: assert (args.out/(track+'.f32')).read_bytes()==(args.compare/(track+'.f32')).read_bytes(),track
        print('PASS: all six full-track PCM renders are byte-identical')
