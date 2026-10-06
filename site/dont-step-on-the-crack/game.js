// Don't Step on the Crack. A first-person walk home: hold a side of the screen to lift that foot, let go to step.
// Every crack, line or pothole you land on breaks one of Mom's vertebrae, and the Mom Cam shows it.
// World units are feet: a sidewalk slab is 5 by 5 and your shoe is 1 long. The canvas is drawn flat
// and tilted back with a CSS 3D transform, so all the game logic stays in plain 2D.
// Flow: title (a demo walk runs behind it) -> play <-> paused -> over (Mom calls) -> play or title.
'use strict';
'use strict';
const $=s=>document.querySelector(s);
const view=$('#view'), cv=$('#world'), ctx=cv.getContext('2d');
const msgEl=$('#msg'), msgM=msgEl.querySelector('.m'), msgS=msgEl.querySelector('.s');
const overEl=$('#over'), phoneEl=$('#phone'), callerEl=$('#caller'), callingEl=$('#calling'), afterEl=$('#after');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=matchMedia('(pointer: coarse)').matches;

/* ---------- world units: 1 unit = 1 ft = one shoe length ---------- */
const S=5, WS=5, R=0.18, DMIN=0.45, DMAX=2.25, LAT=1.7, MAXHP=6, LIFT=1.0;
const WOB=0.85;                                  // seconds of wobble before the foot snaps back
const GIANT={dmax:3.6,lat:2.2}, GIANT_MAX=3, STREAK_EVERY=10;
const STAGE_START=[0,6,14,24,34];
const STAGES=[
  {name:'Maple Ave',  note:'fresh pour',      stamp:'MAPLE AVE · 2024',  T:1.05},
  {name:'Linden St',  note:'hairline cracks', stamp:'LINDEN ST · 1998',  T:0.9},
  {name:'Oak St',     note:'root heave',      stamp:'OAK ST · 1971',     T:0.78},
  {name:'Old Mill Rd',note:'old flagstone',   stamp:'OLD MILL RD · 1923',T:0.68},
  {name:'Quarry Ln',  note:'condemned',       stamp:'QUARRY LN · 1938',  T:0.6}
];
const MOMTXT=['',
  'Is technically flooring now.',
  "The cat's ottoman.",
  'Folded in half. Still on 7 across.',
  "Technically an 'L' now.",
  'Heard a pop. Ignoring it.',
  'Fine. Doing the crossword.'];
const ENDINGS=[
  "She's been folded up and put in the linen closet. She says it's actually very cozy.",
  "She can see her own heels now. She says hi to them. She says hi to you too.",
  "The chiropractor took one look and quit chiropractic. He's opening a bakery.",
  "She's shaped like a paperclip. Your father is using her to hold the bills.",
  "She's flat on the kitchen floor. The Roomba keeps bumping into her and apologizing."];
const GRAF=['sorry mom','she felt that','walk softer','L4 was here','no cracks no cry','mom says hi','step light',"it's not the cracks. it's you",'nice try','chiro 555-0142'];
const LEAFC=['#e2b53a','#d98a3a','#b8642e','#8e3b2a','#c9a27a','#a9b04a','#e6c25a'];

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const slabIdx=d=>Math.floor(d/S);
function stageOf(i){let s=0;for(let j=1;j<5;j++) if(i>=STAGE_START[j]) s=j;return s;}
function swingTime(i){const s=stageOf(i);return s<4?STAGES[s].T:Math.max(0.45,0.6-(i-STAGE_START[4])*0.004);}

/* ---------- geometry ---------- */
function psd(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy;let t=l?((px-ax)*dx+(py-ay)*dy)/l:0;t=t<0?0:t>1?1:t;const qx=ax+t*dx-px,qy=ay+t*dy-py;return Math.sqrt(qx*qx+qy*qy);}
function orient(ax,ay,bx,by,cx,cy){return (bx-ax)*(cy-ay)-(by-ay)*(cx-ax);}
function ssd(ax,ay,bx,by,cx,cy,dx,dy){
  const o1=orient(ax,ay,bx,by,cx,cy),o2=orient(ax,ay,bx,by,dx,dy),o3=orient(cx,cy,dx,dy,ax,ay),o4=orient(cx,cy,dx,dy,bx,by);
  if(((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0))) return 0;
  return Math.min(psd(ax,ay,cx,cy,dx,dy),psd(bx,by,cx,cy,dx,dy),psd(cx,cy,ax,ay,bx,by),psd(dx,dy,ax,ay,bx,by));
}
// sole = capsule from heel to toe, radius R
function footHits(x,d,list,margin){
  margin=margin||0;
  const ay=d-0.5+R, by=d+0.5-R, out=[];
  for(const sl of list){
    for(const c of sl.cracks){
      const bb=c.bb; if(x+R+margin<bb[0]||x-R>bb[1]||d+0.5<bb[2]||d-0.5>bb[3]) continue;
      const lim=R+c.hw-0.01+margin, p=c.pts;
      for(let j=0;j<p.length-1;j++){ if(ssd(x,ay,x,by,p[j][0],p[j][1],p[j+1][0],p[j+1][1])<lim){out.push({c});break;} }
    }
    for(const h of sl.holes){ if(psd(h.x,h.d,x,ay,x,by)<R+h.R*0.82+margin) out.push({h}); }
  }
  return out;
}

/* ---------- slab generation ---------- */
const slabs=new Map(), tiles=new Map();
let seedBase=1, genNext=0, frontier=[];
function slabsNear(d){const a=slabIdx(d-0.7),b=slabIdx(d+0.7),o=[];for(let i=a;i<=b;i++){const s=slabs.get(i);if(s)o.push(s);}return o;}

function addCrack(sl,c){
  let a=1e9,b=-1e9,e=1e9,f=-1e9;
  for(const p of c.pts){a=Math.min(a,p[0]);b=Math.max(b,p[0]);e=Math.min(e,p[1]);f=Math.max(f,p[1]);}
  c.bb=[a-c.hw,b+c.hw,e-c.hw,f+c.hw]; sl.cracks.push(c); return c;
}
function walk(rng,x,d,ang,len,step,wob,d0,d1){
  const pts=[[x,d]];let a=ang,L=0;
  while(L<len){
    a+=(rng()-0.5)*wob; a+=(ang-a)*0.12;
    x+=Math.cos(a)*step; d+=Math.sin(a)*step; L+=step;
    let stop=false;
    if(x<0){x=0;stop=true;} else if(x>WS){x=WS;stop=true;}
    if(d<d0+0.03){d=d0+0.03;stop=true;} else if(d>d1-0.03){d=d1-0.03;stop=true;}
    pts.push([x,d]); if(stop) break;
  }
  return pts;
}
function hairline(rng,sl,d0,d1){
  let x,d,ang; const r=rng();
  if(r<0.3){ x=rng()<0.5?0:WS; d=d0+0.4+rng()*(S-0.8); ang=(x===0?0:Math.PI)+(rng()-0.5)*1.4; }
  else if(r<0.55){ x=0.5+rng()*(WS-1); d=d0+0.03; ang=Math.PI/2+(rng()-0.5)*1.6; }
  else { x=0.6+rng()*(WS-1.2); d=d0+0.6+rng()*(S-1.2); ang=rng()*Math.PI*2; }
  addCrack(sl,{kind:'crack',hw:0.016+rng()*0.008,pts:walk(rng,x,d,ang,1.2+rng()*2.0,0.16,0.7,d0,d1)});
}
function mainCrack(rng,sl,d0,d1,branches){
  const left=rng()<0.5, x=left?0:WS, d=d0+0.8+rng()*(S-1.6), ang=(left?0:Math.PI)+(rng()-0.5)*0.9;
  const pts=walk(rng,x,d,ang,8,0.22,0.55,d0,d1);
  addCrack(sl,{kind:'crack',hw:0.03+rng()*0.012,pts,main:true});
  for(let b=0;b<branches;b++){
    if(rng()<0.35||pts.length<4) continue;
    const p=pts[1+((rng()*(pts.length-2))|0)];
    const a2=ang+(rng()<0.5?1:-1)*(0.6+rng()*0.7);
    addCrack(sl,{kind:'crack',hw:0.018,pts:walk(rng,p[0],p[1],a2,0.7+rng()*1.2,0.16,0.6,d0,d1)});
  }
}
function nearestD(pts,x){let best=pts[0][1],bd=1e9;for(const p of pts){const dd=Math.abs(p[0]-x);if(dd<bd){bd=dd;best=p[1];}}return best;}
function flagstones(rng,sl,d0,d1,k){
  const cnt=Math.floor(2.4*k+rng()*Math.min(1,k));
  const ys=cnt>=3?[1.25,2.5,3.75]:cnt===2?[1.65,3.35]:cnt===1?[2.5]:[];
  const rows=[[[0,d0],[WS,d0]]];
  for(const yy of ys){
    const pts=walk(rng,0,d0+yy+(rng()-0.5)*0.5,(rng()-0.5)*0.35,9,0.3,0.25,d0+0.3,d1-0.3);
    rows.push(pts); addCrack(sl,{kind:'line',hw:0.04,pts});
  }
  rows.push([[0,d1],[WS,d1]]);
  for(let r=0;r<rows.length-1;r++){
    const ns=(rng()*2.2*k)|0;
    for(let s=0;s<ns;s++){
      const x=0.7+rng()*(WS-1.4), xb=clamp(x+(rng()-0.5)*0.6,0.3,WS-0.3);
      const a=nearestD(rows[r],x), b=nearestD(rows[r+1],xb);
      addCrack(sl,{kind:'line',hw:0.04,pts:[[x,a],[(x+xb)/2+(rng()-0.5)*0.15,(a+b)/2],[xb,b]]});
    }
  }
}
function spider(rng,sl,d0,d1,k){
  const cx=1+rng()*(WS-2), cd=d0+1.2+rng()*(S-2.4), n=5+(rng()*3|0), a0=rng()*Math.PI*2, spokes=[];
  for(let j=0;j<n;j++){
    const a=a0+j*2*Math.PI/n+(rng()-0.5)*0.5;
    const pts=walk(rng,cx,cd,a,(0.8+rng()*0.9)*Math.max(0.5,k),0.18,0.35,d0,d1);
    spokes.push(pts); addCrack(sl,{kind:'crack',hw:0.022,pts});
  }
  for(let j=0;j<n;j++){
    if(rng()<0.45) continue;
    const A=spokes[j], B=spokes[(j+1)%n], m=2+(rng()*2|0);
    if(A.length>m&&B.length>m){const p=A[m],q=B[m];addCrack(sl,{kind:'crack',hw:0.016,pts:[p,[(p[0]+q[0])/2+(rng()-0.5)*0.1,(p[1]+q[1])/2+(rng()-0.5)*0.1],q]});}
  }
  sl.spiderC={x:cx,d:cd};
}
function hole(rng,sl,d0,d1){
  const R0=0.32+rng()*0.28, x=R0+0.3+rng()*(WS-2*R0-0.6), d=d0+R0+0.3+rng()*(S-2*R0-0.6), poly=[];
  for(let j=0;j<11;j++){const a=j/11*Math.PI*2, r=R0*(0.78+rng()*0.27); poly.push([x+Math.cos(a)*r,d+Math.sin(a)*r]);}
  sl.holes.push({x,d,R:R0,poly,seed:(rng()*1e9)|0});
}
function branch(rng,d0){
  const left=rng()<0.5; let x=left?-0.8:WS+0.8, d=d0+rng()*S, a=(left?0:Math.PI)+(rng()-0.5)*1.0;
  const pts=[], len=3+rng()*3;
  for(let L=0;L<=len;L+=0.3){pts.push([x,d]); a+=(rng()-0.5)*0.3; x+=Math.cos(a)*0.3; d+=Math.sin(a)*0.3;}
  const twigs=[], tn=2+(rng()*3|0);
  for(let j=0;j<tn;j++){
    const bi=2+((rng()*(pts.length-3))|0), p=pts[bi];
    const q=pts[Math.min(bi+1,pts.length-1)], dir=Math.atan2(q[1]-p[1],q[0]-p[0]);
    const ta=dir+(rng()<0.5?1:-1)*(0.5+rng()*0.8), tl=0.6+rng()*1.0;
    twigs.push({bi,pts:[[p[0],p[1]],[p[0]+Math.cos(ta)*tl*0.5+(rng()-0.5)*0.1,p[1]+Math.sin(ta)*tl*0.5],[p[0]+Math.cos(ta)*tl,p[1]+Math.sin(ta)*tl]]});
  }
  const blobs=twigs.map(t=>({x:t.pts[2][0],d:t.pts[2][1],r:0.35+rng()*0.35}));
  const e=pts[pts.length-1]; blobs.push({x:e[0],d:e[1],r:0.5+rng()*0.3});
  return {pts,twigs,blobs,phase:rng()*6.28,w:0.09+rng()*0.05};
}

function buildSlab(i,seed,k){
  const rng=mulberry32(seed>>>0), st=stageOf(i), d0=i*S, d1=d0+S;
  const sl={i,seed:seed>>>0,stage:st,cracks:[],holes:[],leaves:[],shadows:[],weeds:[],gum:[],spall:[],grassLeaves:[],chalk:null,stamp:null,heave:0,spiderC:null,coupon:null,tint:(rng()-0.5)*0.09};
  addCrack(sl,{kind:'line',joint:true,hw:0.045,pts:[[0,d0],[WS,d0]]});
  if(i===1) sl.chalk='title'; else if(i===2) sl.chalk='howto';
  const si=STAGE_START.indexOf(i); if(si>=0) sl.stamp=STAGES[si].stamp;
  const late=st===4?Math.min(1,(i-STAGE_START[4])/30):0;
  const n=b=>Math.floor(b*k+rng()*Math.min(1,k));
  if(i>=3&&k>0){
    if(st===1){ for(let j=n(1.6);j>0;j--) hairline(rng,sl,d0,d1); }
    else if(st===2){ for(let j=n(1.1);j>0;j--) mainCrack(rng,sl,d0,d1,2); for(let j=n(1.2);j>0;j--) hairline(rng,sl,d0,d1); if(rng()<0.35) sl.heave=rng()<0.5?-1:1; }
    else if(st===3){ flagstones(rng,sl,d0,d1,k); for(let j=n(0.9);j>0;j--) hairline(rng,sl,d0,d1); }
    else if(st===4){ if(rng()<(0.55+0.35*late)*k) spider(rng,sl,d0,d1,k); for(let j=n(0.8);j>0;j--) mainCrack(rng,sl,d0,d1,1); for(let j=n(0.9+late);j>0;j--) hole(rng,sl,d0,d1); for(let j=n(1+late);j>0;j--) hairline(rng,sl,d0,d1); }
  }
  // decoration (no effect on play)
  const nonJoint=sl.cracks.filter(c=>!c.joint);
  const leafN=[2,3,5,6,8][st]+(rng()*3|0);
  for(let j=0;j<leafN;j++){
    let x=0.25+rng()*(WS-0.5), d=d0+0.3+rng()*(S-0.6);
    if(st>=2&&nonJoint.length&&rng()<0.4){const c=nonJoint[(rng()*nonJoint.length)|0], p=c.pts[(rng()*c.pts.length)|0]; if(p[1]>d0+0.3&&p[1]<d1-0.3&&p[0]>0.2&&p[0]<WS-0.2){x=p[0];d=p[1];}}
    sl.leaves.push({x,d,s:0.24+rng()*0.22,a:rng()*6.283,c:LEAFC[(rng()*LEAFC.length)|0],t:rng()<0.3?'oak':'oval'});
  }
  if(st>=1&&i>=3) for(let j=(rng()*(st+1))|0;j>0;j--) sl.gum.push({x:0.3+rng()*(WS-0.6),d:d0+0.3+rng()*(S-0.6),r:0.045+rng()*0.05});
  if(st>=2&&nonJoint.length) for(let j=2+st+(rng()*3|0);j>0;j--){const c=nonJoint[(rng()*nonJoint.length)|0], p=c.pts[(rng()*c.pts.length)|0]; if(p[1]>d0+0.25&&p[1]<d1-0.25) sl.weeds.push({x:p[0],d:p[1],s:0.1+rng()*0.08+st*0.015,seed:(rng()*1e9)|0});}
  if(st>=3) for(let j=(rng()*(st-1))|0;j>0;j--) sl.spall.push({x:0.6+rng()*(WS-1.2),d:d0+0.7+rng()*(S-1.4),r:0.25+rng()*0.4,seed:(rng()*1e9)|0});
  if(i>=3&&rng()<0.3+st*0.14) sl.shadows.push(branch(rng,d0));
  if(i>=4&&rng()<0.2) sl.graffiti={t:GRAF[(rng()*GRAF.length)|0],x:1.4+rng()*2.2,d:d0+1+rng()*3,r:(rng()-0.5)*0.5,c:['#f7a8c4','#f4e27a','#9fd3f0','#fbf8f1'][(rng()*4)|0]};
  const gl=6+st*3+(rng()*4|0);
  for(let j=0;j<gl;j++){const left=rng()<0.5, off=0.12+rng()*rng()*3.4; sl.grassLeaves.push({x:left?-off:WS+off,d:d0+0.3+rng()*(S-0.6),s:0.22+rng()*0.24,a:rng()*6.283,c:LEAFC[(rng()*LEAFC.length)|0],t:rng()<0.35?'oak':'oval'});}
  if(i>=1&&rng()<(sl.heave?0.9:st===2?0.4:0.1)){
    const side=sl.heave||(rng()<0.5?-1:1), r=0.42+rng()*0.25, off=0.75+r+rng()*0.35;
    sl.tree={x:side<0?-off:WS+off,d:d0+1.5+rng()*(S-3),r,seed:(rng()*1e9)|0};
  }
  if(st>=2&&nonJoint.length&&rng()<0.3){
    const c=nonJoint[(rng()*nonJoint.length)|0];
    if(c.pts.length>=4){
      const cum=[0]; for(let j=1;j<c.pts.length;j++) cum.push(cum[j-1]+Math.hypot(c.pts[j][0]-c.pts[j-1][0],c.pts[j][1]-c.pts[j-1][1]));
      const n=5+(rng()*6|0);
      sl.ants={c,cum,len:cum[cum.length-1],n,off:rng()*10,v:(rng()<0.5?1:-1)*(0.12+rng()*0.08),gaps:Array.from({length:n},()=>0.1+rng()*0.18),side:rng()<0.5?1:-1};
    }
  }
  return sl;
}

// Reachability check so a slab never forces a hit (conservative stride limits)
const DMINC=0.6, DMAXC=2.0, LATC=1.4;
function reach(sl,fr){
  const d0=sl.i*S, d1=d0+S, samples=[], one=[sl];
  for(let d=d0+0.56; d<=d1-0.56+1e-9; d+=0.15)
    for(let x=R+0.06; x<=WS-R-0.06+1e-9; x+=0.2)
      if(!footHits(x,d,one).length) samples.push({x,d});
  const src=fr.slice(), reachable=[];
  for(const s of samples){
    for(let j=src.length-1;j>=0;j--){
      const p=src[j], dd=s.d-p.d;
      if(dd>=DMINC&&dd<=DMAXC&&Math.abs(s.x-p.x)<=LATC){src.push(s);reachable.push(s);break;}
    }
  }
  const need=d1+0.56-DMAXC;
  const nf=src.filter(p=>p.d>=need-1e-4);
  return {ok:nf.some(p=>p.d>=need+0.12),frontier:nf,reachable};
}
function genSlab(i,fr){
  let sl,r;
  for(let a=0;a<7;a++){
    const k=a===6?0:Math.pow(0.68,a);
    sl=buildSlab(i,seedBase+i*7919+a*104729,k); r=reach(sl,fr);
    if(r.ok) break;
  }
  let nf=r.frontier;
  if(!nf.length){nf=[];for(let x=R+0.06;x<=WS-R-0.06;x+=0.2) nf.push({x,d:(i+1)*S-0.56});}
  const rr=mulberry32((sl.seed^0x51ed)>>>0), prob=[0.07,0.12,0.1,0.08,0.06][sl.stage];
  if(i>=3&&r.reachable.length&&rr()<prob){const p=r.reachable[(rr()*r.reachable.length)|0]; sl.coupon={x:p.x,d:p.d,a:(rr()-0.5)*0.8,taken:false,tt:0};}
  return {sl,frontier:nf};
}
function ensureSlabs(upTo){while(genNext<=upTo){const r=genSlab(genNext,frontier);slabs.set(genNext,r.sl);frontier=r.frontier;genNext++;}}

/* ---------- layout & perspective ---------- */
let Wg=400,Hv=800,Wc=600,Hc=1200,K=58,X0=0,yAnchor=800,dpr=1,P=1000;
const TH=20*Math.PI/180;
let aggCv=null, grassCv=null;
const AGG_SZ=240, GRASS_SZ=200;
function layout(){
  const iw=window.innerWidth, ih=window.innerHeight;
  Hv=ih; Wg=iw;
  P=1.25*Hv;
  const c=Math.cos(TH), s=Math.sin(TH);
  const h0=Hv*P/(P*c-Hv*s), scaleTop=P/(P+h0*s);
  Hc=Math.ceil(h0*1.03); Wc=Math.ceil(Wg/scaleTop*1.05);
  const wEff=Math.min(Wg,ih*0.66,640);
  K=(wEff*0.8)/WS; X0=(Wc-WS*K)/2;
  const hs=0.32*Hv, ha=hs*P/(P*c-hs*s); yAnchor=Hc-ha;
  dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(2.2e6/(Wc*Hc)));
  cv.width=Math.round(Wc*dpr); cv.height=Math.round(Hc*dpr);
  cv.style.width=Wc+'px'; cv.style.height=Hc+'px';
  cv.style.left=((Wg-Wc)/2)+'px'; cv.style.top=(Hv-Hc)+'px';
  cv.style.transform=`perspective(${P.toFixed(1)}px) rotateX(20deg)`;
  // landscape and desktop: if the grass beside the far end of the sidewalk is wide enough, the HUD lives there
  const side=(iw-WS*K*scaleTop)/2-28;
  const useSide=iw>ih&&side>=270;
  view.classList.toggle('side',useSide);
  view.style.setProperty('--hudw',Math.round(Math.min(420,side))+'px');
  aggCv=makeAggregate(); grassCv=makeGrass(); tiles.clear(); camBg=null;
}
const X=x=>X0+x*K;
const Y=d=>yAnchor-(d-camD)*K;

/* ---------- textures ---------- */
function wrap(x,y,m,sz,fn){for(const ox of [0,-sz,sz]) for(const oy of [0,-sz,sz]){const px=x+ox,py=y+oy; if(px<-m||px>sz+m||py<-m||py>sz+m) continue; fn(px,py);}}
function makeAggregate(){
  const sz=AGG_SZ, c=document.createElement('canvas'); c.width=c.height=Math.round(sz*dpr);
  const g=c.getContext('2d'), sc=c.width/sz; g.setTransform(sc,0,0,sc,0,0);
  const rng=mulberry32(9137), sk=Math.max(0.6,K/58);
  g.fillStyle='#a0988e'; g.fillRect(0,0,sz,sz);
  for(let n=0;n<40;n++){const x=rng()*sz,y=rng()*sz,r=10+rng()*30,light=rng()<0.5; wrap(x,y,r,sz,(px,py)=>{const gr=g.createRadialGradient(px,py,0,px,py,r); gr.addColorStop(0,light?'rgba(255,250,240,0.07)':'rgba(40,30,20,0.07)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(px-r,py-r,2*r,2*r);});}
  for(let n=0;n<6000;n++){g.fillStyle=rng()<0.5?'rgba(255,255,255,0.12)':'rgba(30,24,20,0.12)'; g.fillRect(rng()*sz,rng()*sz,0.9,0.9);}
  const cols=['#cdc6bb','#8b8279','#6c645d','#b9a690','#9d7f67','#ddd8d0','#5b5651','#a98b71','#e8e3da','#7a6a5c','#b06f4f','#c2b8a8','#938a80'];
  for(let n=0;n<2300;n++){
    const x=rng()*sz,y=rng()*sz,r=(0.55+rng()*rng()*2.4)*sk,col=cols[(rng()*cols.length)|0],a=rng()*Math.PI,e=0.6+rng()*0.35;
    wrap(x,y,r+1,sz,(px,py)=>{g.fillStyle='rgba(20,16,12,0.28)';g.beginPath();g.ellipse(px+0.35*sk,py+0.45*sk,r,r*e,a,0,6.283);g.fill();g.fillStyle=col;g.beginPath();g.ellipse(px,py,r,r*e,a,0,6.283);g.fill();});
  }
  return c;
}
function makeGrass(){
  const sz=GRASS_SZ, c=document.createElement('canvas'); c.width=c.height=Math.round(sz*dpr);
  const g=c.getContext('2d'), sc=c.width/sz; g.setTransform(sc,0,0,sc,0,0);
  const rng=mulberry32(4242), sk=Math.max(0.6,K/58);
  g.fillStyle='#4a6628'; g.fillRect(0,0,sz,sz);
  for(let n=0;n<30;n++){const x=rng()*sz,y=rng()*sz,r=12+rng()*30,light=rng()<0.5; wrap(x,y,r,sz,(px,py)=>{const gr=g.createRadialGradient(px,py,0,px,py,r); gr.addColorStop(0,light?'rgba(150,180,80,0.14)':'rgba(20,35,10,0.18)'); gr.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=gr; g.fillRect(px-r,py-r,2*r,2*r);});}
  const cols=['#6a8a34','#577629','#7e9b44','#43602a','#8ca851','#3a5322','#9aae55'];
  g.lineCap='round';
  for(let n=0;n<2600;n++){
    const x=rng()*sz,y=rng()*sz,a=rng()*6.283,l=(2.5+rng()*6)*sk,col=cols[(rng()*cols.length)|0],lw=(0.7+rng()*0.8)*sk;
    wrap(x,y,l+1,sz,(px,py)=>{g.strokeStyle=col;g.lineWidth=lw;g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(a)*l,py+Math.sin(a)*l);g.stroke();});
  }
  return c;
}
function setPat(p,ox,oy){try{p.setTransform(new DOMMatrix([1/dpr,0,0,1/dpr,ox,oy]));}catch(e){}}

function leafPath(g,s,t){
  g.beginPath();
  if(t==='oak'){for(let j=0;j<=40;j++){const a=j/40*Math.PI*2, lob=0.78+0.22*Math.abs(Math.sin(a*3.5)), x=Math.cos(a)*s*0.5*lob, y=Math.sin(a)*s*0.3*lob*(0.75+0.25*Math.cos(a)); j?g.lineTo(x,y):g.moveTo(x,y);} g.closePath();}
  else {g.moveTo(-s*0.5,0); g.quadraticCurveTo(-s*0.05,-s*0.36,s*0.5,0); g.quadraticCurveTo(-s*0.05,s*0.36,-s*0.5,0); g.closePath();}
}
function drawLeaf(g,x,y,s,a,col,t){
  g.save(); g.translate(x,y); g.rotate(a);
  g.save(); g.translate(s*0.04,s*0.06); leafPath(g,s,t); g.fillStyle='rgba(0,0,0,0.22)'; g.fill(); g.restore();
  leafPath(g,s,t); g.fillStyle=col; g.fill();
  g.strokeStyle='rgba(70,40,18,0.4)'; g.lineWidth=Math.max(0.6,s*0.035); g.beginPath(); g.moveTo(-s*0.64,s*0.03); g.lineTo(s*0.45,0); g.stroke();
  g.restore();
}
function rrect(g,x,y,w,h,r){g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function drawStamp(g,text,cx,cy){
  const w=2.9*K, h=0.56*K, r=0.08*K;
  g.save(); g.translate(cx,cy);
  let fs=0.25*K; g.font=`700 ${fs}px "Atkinson Hyperlegible", system-ui, sans-serif`;
  const tw=g.measureText(text).width; if(tw>w-0.3*K){fs*=(w-0.3*K)/tw; g.font=`700 ${fs}px "Atkinson Hyperlegible", system-ui, sans-serif`;}
  g.textAlign='center'; g.textBaseline='middle'; g.lineWidth=Math.max(1,0.028*K);
  const box=()=>{g.beginPath();rrect(g,-w/2,-h/2,w,h,r);};
  g.save(); g.translate(0.7,0.9); g.strokeStyle=g.fillStyle='rgba(255,252,245,0.26)'; box(); g.stroke(); g.fillText(text,0,0); g.restore();
  g.save(); g.translate(-0.5,-0.5); g.strokeStyle=g.fillStyle='rgba(30,24,18,0.5)'; box(); g.stroke(); g.fillText(text,0,0); g.restore();
  g.restore();
}
function drawJoint(g,y,idx){
  const r=mulberry32((seedBase*7+idx*31337)>>>0), w=0.09*K;
  g.fillStyle='rgba(255,250,240,0.16)'; g.fillRect(X0,y-w/2-1.2,WS*K,1.2);
  g.fillStyle='rgba(24,20,16,0.92)'; g.fillRect(X0,y-w/2,WS*K,w);
  for(let n=0;n<30;n++){const x=X0+r()*WS*K, s=(0.02+r()*0.05)*K, up=r()<0.5; g.fillRect(x,up?y-w/2-s*0.45:y+w/2-s*0.15,s*1.6,s*0.6);}
  for(let n=0;n<46;n++){const x=X0+r()*WS*K, yy=y+(r()-0.5)*w*0.7; g.fillStyle=`rgba(${(66+r()*34)|0},${(92+r()*36)|0},40,${(0.45+r()*0.45).toFixed(2)})`; g.beginPath(); g.arc(x,yy,(0.012+r()*0.022)*K,0,6.283); g.fill();}
}

function renderTile(sl){
  const i=sl.i, d0=i*S, d1=d0+S, st=sl.stage, hpx=S*K;
  const c=document.createElement('canvas'); c.width=Math.round(Wc*dpr); c.height=Math.ceil(hpx*dpr);
  const g=c.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  const tx=x=>X0+x*K, ty=d=>(d1-d)*K;
  const rng=mulberry32((sl.seed^0x2545F491)>>>0), sk=K/58;
  // grass, continuous between tiles
  const gper=grassCv.width/dpr;
  const gp=g.createPattern(grassCv,'repeat'); setPat(gp,0,((d1*K)%gper+gper)%gper);
  g.fillStyle=gp; g.fillRect(0,0,Wc,hpx+1);
  const gt=[0,0.05,0.1,0.16,0.24][st]; if(gt){g.fillStyle=`rgba(152,122,58,${gt})`; g.fillRect(0,0,Wc,hpx+1);}
  if(sl.tree) drawTree(g,tx(sl.tree.x),ty(sl.tree.d),sl.tree.r*K,sl.tree.seed);
  for(const side of [-1,1]){
    const xe=side<0?tx(0):tx(WS);
    g.fillStyle='rgba(36,28,18,0.85)'; g.beginPath(); g.moveTo(xe,-1);
    for(let y=0;y<=hpx+4*sk;y+=4*sk) g.lineTo(xe+side*(0.03+rng()*0.06)*K,y);
    g.lineTo(xe,hpx+1); g.closePath(); g.fill();
  }
  // concrete
  g.save(); g.beginPath(); g.rect(tx(0),0,WS*K,hpx+1); g.clip();
  const ap=g.createPattern(aggCv,'repeat'); setPat(ap,rng()*AGG_SZ,rng()*AGG_SZ);
  g.fillStyle=ap; g.fillRect(tx(0),0,WS*K,hpx+1);
  const tint=[[255,250,240,0.07],[0,0,0,0],[64,50,36,0.07],[56,46,34,0.13],[42,36,30,0.21]][st];
  if(tint[3]){g.fillStyle=`rgba(${tint[0]},${tint[1]},${tint[2]},${tint[3]})`; g.fillRect(tx(0),0,WS*K,hpx+1);}
  g.fillStyle=sl.tint>0?`rgba(255,250,240,${sl.tint.toFixed(3)})`:`rgba(30,25,20,${(-sl.tint).toFixed(3)})`; g.fillRect(tx(0),0,WS*K,hpx+1);
  for(let j=3+(rng()*3|0);j>0;j--){const x=tx(rng()*WS), y=rng()*hpx, r=(0.8+rng()*1.4)*K, gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(255,238,205,0.2)'); gr.addColorStop(1,'rgba(255,238,205,0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,2*r,2*r);}
  for(const side of [0,1]){const x=side?tx(WS):tx(0), w=0.22*K, gr=g.createLinearGradient(x,0,x+(side?-w:w),0); gr.addColorStop(0,'rgba(40,32,24,0.28)'); gr.addColorStop(1,'rgba(40,32,24,0)'); g.fillStyle=gr; g.fillRect(side?x-w:x,0,w,hpx+1);}
  if(sl.heave){
    const x=sl.heave<0?tx(0):tx(WS), gr=g.createLinearGradient(x,0,tx(2.5),0); gr.addColorStop(0,'rgba(20,16,12,0.26)'); gr.addColorStop(1,'rgba(20,16,12,0)'); g.fillStyle=gr; g.fillRect(tx(0),0,WS*K,hpx+1);
    const g2=g.createLinearGradient(0,hpx,0,hpx-0.35*K); g2.addColorStop(0,'rgba(20,16,12,0.32)'); g2.addColorStop(1,'rgba(20,16,12,0)'); g.fillStyle=g2; g.fillRect(tx(0),hpx-0.35*K,WS*K,0.35*K);
  }
  for(const sp of sl.spall){
    const r2=mulberry32(sp.seed); g.beginPath();
    for(let j=0;j<10;j++){const a=j/10*6.283, rr=sp.r*(0.6+r2()*0.5)*K, px=tx(sp.x)+Math.cos(a)*rr, py=ty(sp.d)+Math.sin(a)*rr*0.8; j?g.lineTo(px,py):g.moveTo(px,py);}
    g.closePath(); g.fillStyle='rgba(200,190,172,0.28)'; g.fill(); g.strokeStyle='rgba(40,32,24,0.35)'; g.lineWidth=1; g.stroke();
  }
  for(const gm of sl.gum){const x=tx(gm.x), y=ty(gm.d), r=gm.r*K; g.fillStyle='rgba(58,56,54,0.55)'; g.beginPath(); g.ellipse(x,y,r,r*0.85,0,0,6.283); g.fill(); g.fillStyle='rgba(120,116,110,0.35)'; g.beginPath(); g.ellipse(x-r*0.2,y-r*0.2,r*0.45,r*0.35,0,0,6.283); g.fill();}
  if(sl.stamp) drawStamp(g,sl.stamp,tx(2.5),ty(d0+4.15));
  if(sl.spiderC){const x=tx(sl.spiderC.x), y=ty(sl.spiderC.d), r=0.22*K, gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(25,20,15,0.5)'); gr.addColorStop(1,'rgba(25,20,15,0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,2*r,2*r);}
  for(const h of sl.holes){
    const r2=mulberry32(h.seed);
    const path=()=>{g.beginPath(); h.poly.forEach((p,j)=>{const x=tx(p[0]),y=ty(p[1]); j?g.lineTo(x,y):g.moveTo(x,y);}); g.closePath();};
    path(); g.fillStyle='#4a443d'; g.fill();
    g.save(); path(); g.clip();
    const pc=['#6d665e','#857b70','#5a534c','#9a8f82','#3e3934','#7a6a5a'];
    for(let n=0;n<70;n++){const a=r2()*6.283, rr=Math.sqrt(r2())*h.R*K, x=tx(h.x)+Math.cos(a)*rr, y=ty(h.d)+Math.sin(a)*rr; g.fillStyle=pc[(r2()*pc.length)|0]; g.beginPath(); g.arc(x,y,(0.02+r2()*0.05)*K,0,6.283); g.fill();}
    g.strokeStyle='rgba(15,12,9,0.6)'; g.lineWidth=0.1*K; path(); g.stroke();
    g.restore();
    g.save(); g.translate(0,1); path(); g.strokeStyle='rgba(255,250,240,0.18)'; g.lineWidth=1.2; g.stroke(); g.restore();
    path(); g.strokeStyle='rgba(20,16,12,0.8)'; g.lineWidth=1.5; g.stroke();
  }
  g.lineJoin='round'; g.lineCap='round';
  for(const c2 of sl.cracks){
    if(c2.joint) continue;
    const w=Math.max(1.1,c2.hw*2*K);
    const path=()=>{g.beginPath(); c2.pts.forEach((p,j)=>{const x=tx(p[0]),y=ty(p[1]); j?g.lineTo(x,y):g.moveTo(x,y);});};
    g.save(); g.translate(0.4,1); path(); g.strokeStyle='rgba(255,250,240,0.18)'; g.lineWidth=w+0.8; g.stroke(); g.restore();
    path(); g.strokeStyle='rgba(26,22,18,0.9)'; g.lineWidth=w; g.stroke();
    if(c2.kind==='line'){
      const r2=mulberry32((c2.pts.length*977+((c2.pts[0][1]*1000)|0))>>>0);
      for(let j=0;j<c2.pts.length-1;j++) for(let m=0;m<3;m++){const t=r2(), x=tx(c2.pts[j][0]+(c2.pts[j+1][0]-c2.pts[j][0])*t), y=ty(c2.pts[j][1]+(c2.pts[j+1][1]-c2.pts[j][1])*t); g.fillStyle=`rgba(${(66+r2()*34)|0},${(92+r2()*36)|0},40,${(0.4+r2()*0.4).toFixed(2)})`; g.beginPath(); g.arc(x+(r2()-0.5)*w*0.5,y+(r2()-0.5)*w*0.5,(0.012+r2()*0.02)*K,0,6.283); g.fill();}
    }
    if(c2.main){for(let j=1;j<c2.pts.length-1;j+=3){const x=tx(c2.pts[j][0]), y=ty(c2.pts[j][1]), s=(0.03+rng()*0.04)*K; g.fillStyle='rgba(30,26,20,0.55)'; g.beginPath(); g.moveTo(x-s,y); g.lineTo(x,y-s*0.7); g.lineTo(x+s*0.8,y+s*0.3); g.closePath(); g.fill();}}
  }
  drawJoint(g,hpx,i); drawJoint(g,0,i+1);
  for(const wd of sl.weeds){
    const r2=mulberry32(wd.seed), x=tx(wd.x), y=ty(wd.d);
    g.lineWidth=Math.max(1,0.025*K);
    for(let b=0;b<6;b++){const a=r2()*6.283, L=wd.s*(0.5+r2()*0.6)*K; g.strokeStyle=r2()<0.5?'#6f8f36':'#87a54a'; g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+Math.cos(a+0.3)*L*0.5,y+Math.sin(a+0.3)*L*0.5,x+Math.cos(a)*L,y+Math.sin(a)*L); g.stroke();}
  }
  for(const L of sl.leaves) drawLeaf(g,tx(L.x),ty(L.d),L.s*K,L.a,L.c,L.t);
  if(sl.chalk||sl.graffiti) drawChalk(g,c,sl,d0,tx,ty);
  g.restore();
  for(const L of sl.grassLeaves) drawLeaf(g,tx(L.x),ty(L.d),L.s*K,L.a,L.c,L.t);
  return c;
}
function drawChalk(g,c,sl,d0,tx,ty){
  const tmp=document.createElement('canvas'); tmp.width=c.width; tmp.height=c.height;
  const h=tmp.getContext('2d'); h.setTransform(dpr,0,0,dpr,0,0);
  h.textBaseline='middle';
  if(sl.chalk==='title'){
    let fs=0.95*K; const font=f=>`700 ${f}px "Cabin Sketch", "Schoolbell", cursive`;
    h.font=font(fs);
    const w=Math.max(h.measureText("DON'T STEP").width,h.measureText('ON THE CRACK').width);
    fs*=Math.min(1,4.3*K/w); h.font=font(fs);
    h.textAlign='center'; h.fillStyle='#fbf8f1'; h.fillText("DON'T STEP",tx(2.5),ty(d0+3.55));
    const a='ON THE ', b='CRACK', wa=h.measureText(a).width, wb=h.measureText(b).width, x0=tx(2.5)-(wa+wb)/2, y2=ty(d0+2.3);
    h.textAlign='left'; h.fillText(a,x0,y2); h.fillStyle='#f7a8c4'; h.fillText(b,x0+wa,y2);
    h.strokeStyle='#f7a8c4'; h.lineWidth=0.05*K; h.lineCap='round'; h.beginPath();
    for(let x=0;x<=wb;x+=4){const yy=y2+fs*0.58+Math.sin(x*0.25)*fs*0.05; x?h.lineTo(x0+wa+x,yy):h.moveTo(x0+wa+x,yy);} h.stroke();
  } else if(sl.graffiti){
    const gf=sl.graffiti; let fs=0.4*K; h.font=`${fs}px "Schoolbell", cursive`;
    const w=h.measureText(gf.t).width; fs*=Math.min(1,3.4*K/w); h.font=`${fs}px "Schoolbell", cursive`;
    h.save(); h.translate(tx(gf.x),ty(gf.d)); h.rotate(gf.r); h.textAlign='center'; h.fillStyle=gf.c; h.fillText(gf.t,0,0); h.restore();
  }
  if(sl.chalk==='howto'){
    let fs=0.46*K; const font=f=>`${f}px "Schoolbell", cursive`;
    const lines=coarse?['left side: left foot','right side: right foot','tap to shuffle']:['A or left half: left foot','D or right half: right foot','tap to shuffle'];
    h.font=font(fs); const w=Math.max(...lines.map(s=>h.measureText(s).width)); fs*=Math.min(1,4.2*K/w); h.font=font(fs);
    h.textAlign='center'; h.fillStyle='#f4e27a';
    lines.forEach((s,j)=>h.fillText(s,tx(2.5),ty(d0+3.75-j*0.95)));
  }
  h.setTransform(1,0,0,1,0,0); h.globalCompositeOperation='destination-out';
  let ex=0, ey=0, ew=tmp.width, eh=tmp.height;
  if(!sl.chalk&&sl.graffiti){const cx=tx(sl.graffiti.x)*dpr, cy=ty(sl.graffiti.d)*dpr, hw=2*K*dpr, hh=0.7*K*dpr; ex=Math.max(0,cx-hw); ey=Math.max(0,cy-hh); ew=Math.min(tmp.width-ex,2*hw); eh=Math.min(tmp.height-ey,2*hh);}
  const r=mulberry32((sl.seed^0xc0ffee)>>>0), n=(ew*eh/70)|0;
  for(let j=0;j<n;j++){h.fillStyle=`rgba(0,0,0,${(0.3+r()*0.7).toFixed(2)})`; const s=dpr*(0.6+r()*1.4); h.fillRect(ex+r()*ew,ey+r()*eh,s,s);}
  g.save(); g.setTransform(1,0,0,1,0,0); g.globalAlpha=0.88; g.drawImage(tmp,0,0); g.restore();
}
function getTile(sl){let c=tiles.get(sl.i); if(!c){c=renderTile(sl); tiles.set(sl.i,c);} return c;}

/* ---------- feet ---------- */
const SHOE_R=[[0.03,-0.5],[0.15,-0.43],[0.2,-0.28],[0.195,-0.08],[0.17,0.15],[0.15,0.33],[0.09,0.46],[0,0.5],[-0.09,0.46],[-0.14,0.33],[-0.13,0.14],[-0.15,-0.06],[-0.185,-0.26],[-0.15,-0.41],[-0.07,-0.49]];
const SHOE_L=SHOE_R.map(p=>[-p[0],p[1]]);
function spline(g,pts){
  const n=pts.length; g.beginPath(); g.moveTo(pts[0][0],pts[0][1]);
  for(let i=0;i<n;i++){const p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n]; g.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6,p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6,p2[0],p2[1]);}
  g.closePath();
}
function drawShoe(px,py,sc,side,shadowA){
  const pts=side>0?SHOE_R:SHOE_L, s=K*sc;
  ctx.save(); ctx.translate(px,py); ctx.scale(s,s);
  if(shadowA>0.01){ctx.save(); ctx.translate(0.04,0.05); spline(ctx,pts); ctx.fillStyle=`rgba(0,0,0,${(0.32*shadowA).toFixed(3)})`; ctx.fill(); ctx.restore();}
  spline(ctx,pts); ctx.fillStyle='#d7d5ce'; ctx.fill(); ctx.lineWidth=1.2/s; ctx.strokeStyle='rgba(20,20,20,0.45)'; ctx.stroke();
  ctx.save(); ctx.scale(0.85,0.93); spline(ctx,pts); ctx.fillStyle='#878b8d'; ctx.fill(); ctx.clip();
  ctx.fillStyle='#48535a'; ctx.beginPath(); ctx.ellipse(0.005*side,-0.31,0.125,0.16,0,0,6.283); ctx.fill();
  ctx.strokeStyle='#9da1a2'; ctx.lineWidth=0.03; ctx.beginPath(); ctx.ellipse(0.005*side,-0.31,0.125,0.16,0,Math.PI*1.1,Math.PI*1.9); ctx.stroke();
  ctx.strokeStyle='#777b7d'; ctx.lineWidth=0.035; ctx.beginPath(); ctx.moveTo(-0.1,-0.15); ctx.lineTo(-0.11,0.26); ctx.moveTo(0.1,-0.15); ctx.lineTo(0.11,0.26); ctx.stroke();
  ctx.fillStyle='#a3a7a8'; ctx.beginPath(); rrect(ctx,-0.075,-0.17,0.15,0.44,0.05); ctx.fill();
  ctx.strokeStyle='#f3f2ec'; ctx.lineWidth=0.03; ctx.lineCap='round'; ctx.beginPath();
  for(let j=0;j<5;j++){const y=-0.13+j*0.085; ctx.moveTo(-0.1,y); ctx.lineTo(0.1,y+0.05); ctx.moveTo(0.1,y); ctx.lineTo(-0.1,y+0.05);}
  ctx.stroke();
  ctx.restore(); ctx.restore();
}
function drawLeg(sx,sy,sc,hx,hy){
  const hw=0.235*K*sc, hemY=sy+0.17*K*sc, hipW=0.85*K;
  const gr=ctx.createLinearGradient(Math.min(sx-hw,hx-hipW),0,Math.max(sx+hw,hx+hipW),0);
  gr.addColorStop(0,'#22261d'); gr.addColorStop(0.45,'#40463a'); gr.addColorStop(1,'#20231b');
  const hem=()=>{ctx.moveTo(sx-hw,hemY+0.03*K); ctx.quadraticCurveTo(sx,hemY-0.09*K*sc,sx+hw,hemY+0.03*K);};
  ctx.beginPath(); hem(); ctx.lineTo(hx+hipW,hy); ctx.lineTo(hx-hipW,hy); ctx.closePath(); ctx.fillStyle=gr; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1.2; ctx.beginPath(); hem(); ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=Math.max(1,0.03*K); ctx.beginPath(); ctx.moveTo(sx+hw*0.25,hemY+0.1*K); ctx.quadraticCurveTo(sx+hw*0.6,hemY+0.9*K,(sx+hx)/2+hw*0.4,(hemY+hy)/2); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=Math.max(1,0.06*K); ctx.beginPath(); ctx.moveTo(sx-hw*0.5,hemY+0.15*K); ctx.lineTo((sx+hx)/2-hw*0.9,(hemY+hy)/2); ctx.stroke();
}
function drawOutline(x,d,u,side,giant,wob){
  const pts=side>0?SHOE_R:SHOE_L;
  ctx.save(); ctx.translate(X(x),Y(d)); ctx.scale(K,K);
  spline(ctx,pts); ctx.fillStyle='rgba(15,13,10,0.2)'; ctx.fill();
  const warn=clamp((u-0.75)/0.25,0,1);
  const col=wob?'rgb(255,105,70)':giant?`rgb(255,${(214-warn*50)|0},${(110-warn*30)|0})`:`rgb(255,${(255-warn*85)|0},${(255-warn*170)|0})`;
  if(giant){
    ctx.lineWidth=6/K; ctx.strokeStyle='rgba(255,200,90,0.3)'; ctx.stroke();
    ctx.lineWidth=2.2/K; ctx.strokeStyle=col; ctx.stroke();
  } else {
    ctx.setLineDash([0.07,0.05]);
    ctx.lineWidth=2.4/K; ctx.strokeStyle='rgba(0,0,0,0.38)'; ctx.stroke();
    ctx.lineWidth=(wob?2:1.4)/K; ctx.strokeStyle=col; ctx.stroke();
  }
  ctx.restore();
}
function drawFeet(){
  const hipD=camD-(Hc-yAnchor)/K-1.6, hy=Y(hipD);
  const hipX=f=>X(bodyX+f.side*0.72);
  const air=phase==='swing'?sw.foot:phase==='drop'?drop.foot:null;
  const planted=feet.filter(f=>f!==air).sort((a,b)=>b.d-a.d);
  for(const f of planted) drawShoe(X(f.x),Y(f.d),1,f.side,1);
  for(const f of planted) drawLeg(X(f.x),Y(f.d),1,hipX(f),hy);
  if(air){
    let x,d,lift;
    if(phase==='swing'){
      x=sw.dx+(sw.wob?Math.sin(performance.now()*0.075)*0.035:0); d=sw.dd; lift=sw.lift;
      drawOutline(sw.tx,sw.td,sw.u,air.side,sw.giant,sw.wob>0);
    }
    else {const e=Math.min(1,drop.t/drop.dur), ee=e*e; x=drop.fx+(drop.x-drop.fx)*ee; d=drop.fd+(drop.d-drop.fd)*ee; lift=drop.fl*(1-ee);}
    const sc=1+0.12*lift, yy=Y(d-LIFT*lift);
    drawShoe(X(x),yy,sc,air.side,1-lift);
    drawLeg(X(x),yy,sc,hipX(air),hy);
  }
}

/* ---------- per-frame world extras ---------- */
function drawCoupon(x,d,a,alpha,lift){
  ctx.save(); ctx.translate(X(x),Y(d)-lift); ctx.rotate(a); ctx.globalAlpha=alpha;
  const w=0.56*K, h=0.38*K;
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(-w/2+1.5,-h/2+2,w,h);
  ctx.fillStyle='#f4f1e8'; ctx.fillRect(-w/2,-h/2,w,h);
  ctx.fillStyle='#2f7d78'; ctx.fillRect(-w/2,-h/2,w,h*0.3);
  ctx.fillStyle='rgba(255,255,255,0.85)'; ctx.fillRect(-w/2+w*0.1,-h/2+h*0.11,w*0.6,h*0.08);
  ctx.fillStyle='#2f7d78'; for(let j=0;j<4;j++) ctx.fillRect(-w/2+w*0.1,-h/2+h*0.4+j*h*0.14,w*0.12,h*0.09);
  ctx.fillStyle='rgba(40,40,40,0.55)'; for(let j=0;j<3;j++) ctx.fillRect(-w/2+w*0.32,-h/2+h*0.43+j*h*0.16,w*(0.55-j*0.12),h*0.06);
  ctx.restore();
}
function drawCoupons(now,lo,hi){
  for(let i=lo;i<=hi;i++){
    const sl=slabs.get(i); if(!sl||!sl.coupon) continue; const cp=sl.coupon;
    if(cp.taken){const a=(now-cp.tt)/0.6; if(a<1) drawCoupon(cp.x,cp.d,cp.a,1-a,a*0.8*K);}
    else drawCoupon(cp.x,cp.d,cp.a,1,0);
  }
}
// a soft dark dot, made once and drawn scaled (cheaper than a fresh radial gradient every frame)
const SOFT=(()=>{const n=96, c=document.createElement('canvas'); c.width=c.height=n; const g=c.getContext('2d'), gr=g.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);
  gr.addColorStop(0,'rgba(18,22,14,1)'); gr.addColorStop(0.55,'rgba(18,22,14,0.55)'); gr.addColorStop(1,'rgba(18,22,14,0)'); g.fillStyle=gr; g.fillRect(0,0,n,n); return c;})();
function softDot(x,y,r,a){ctx.globalAlpha=a; ctx.drawImage(SOFT,x-r,y-r,2*r,2*r); ctx.globalAlpha=1;}
function drawShadows(now,lo,hi){
  ctx.lineCap='round'; ctx.lineJoin='round';
  for(let i=lo;i<=hi;i++){
    const sl=slabs.get(i); if(!sl) continue;
    for(const b of sl.shadows){
      const sway=(Math.sin(now*0.8+b.phase)*0.1+Math.sin(now*1.9+b.phase*1.7)*0.035)*(reduceMotion?0.2:1);
      const n=b.pts.length, P2=(p,w)=>[X(p[0]+sway*w),Y(p[1]+sway*0.5*w)];
      for(const [al,wm] of [[0.06,2.4],[0.1,1]]){
        ctx.strokeStyle=`rgba(18,22,12,${al})`;
        ctx.lineWidth=b.w*K*wm; ctx.beginPath(); b.pts.forEach((p,j)=>{const q=P2(p,j/(n-1)); j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);}); ctx.stroke();
        ctx.lineWidth=b.w*0.6*K*wm;
        for(const tw of b.twigs){const w0=tw.bi/(n-1); ctx.beginPath(); tw.pts.forEach((p,j)=>{const q=P2(p,w0+j*0.15); j?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);}); ctx.stroke();}
      }
      for(const bl of b.blobs){const q=P2([bl.x,bl.d],1.15); softDot(q[0],q[1],bl.r*K,0.16);}
    }
  }
}
function drawHitFx(now){
  hitFx=hitFx.filter(f=>now-f.t<1.3);
  ctx.lineCap='round'; ctx.lineJoin='round';
  for(const f of hitFx){
    const a=1-(now-f.t)/1.3;
    if(f.c){
      const path=()=>{ctx.beginPath(); f.c.pts.forEach((p,j)=>{const x=X(p[0]),y=Y(p[1]); j?ctx.lineTo(x,y):ctx.moveTo(x,y);});};
      path(); ctx.strokeStyle=`rgba(255,80,50,${(0.3*a).toFixed(3)})`; ctx.lineWidth=(f.c.hw*2+0.16)*K; ctx.stroke();
      path(); ctx.strokeStyle=`rgba(255,130,90,${(0.95*a).toFixed(3)})`; ctx.lineWidth=Math.max(1.6,f.c.hw*2*K); ctx.stroke();
    } else if(f.h){
      ctx.beginPath(); f.h.poly.forEach((p,j)=>{const x=X(p[0]),y=Y(p[1]); j?ctx.lineTo(x,y):ctx.moveTo(x,y);}); ctx.closePath();
      ctx.strokeStyle=`rgba(255,110,70,${(0.9*a).toFixed(3)})`; ctx.lineWidth=0.07*K; ctx.stroke();
    }
  }
}
function drawPuffs(now){
  puffs=puffs.filter(p=>now-p.t<0.4);
  for(const p of puffs){
    const a=(now-p.t)/0.4;
    for(let j=0;j<7;j++){const ang=j/7*6.283+p.r, rr=(0.3+a*0.35)*K*(p.s||1), x=X(p.x)+Math.cos(ang)*rr*0.8, y=Y(p.d)+Math.sin(ang)*rr*0.5+0.3*K; ctx.fillStyle=`rgba(225,215,195,${(0.35*(1-a)).toFixed(3)})`; ctx.beginPath(); ctx.arc(x,y,(0.05+a*0.06)*K,0,6.283); ctx.fill();}
  }
}

/* ---------- Mom cam ---------- */
// Mom is a small rig (legs, three spine segments, neck, arms) that eases between one designed pose per health level.
// The camera zooms in and follows her as she sinks. Room units: the floor is at y=100, the window around x=10..40.
const camEl=$('#cam'), camCv=$('#camcv'), cc=camCv.getContext('2d'), camStateEl=$('#camState');
const CW=120, CH=120, FLOOR=100, CAM_CSS=150;
const BGX=-34, BGY=-14, BGW=190, BGH=142;           // the backdrop covers more room than the camera ever shows
const VERT=['L5','L4','L3','L2','L1','T12'];
const LT=14, LS=14, SEGL=8.5, UA=10.5, FA=9.5, NECK=11, HEAD=8;
const INK='#2a1d1a';
// angles in degrees, absolute: 0 = facing right, 90 = down, -90 = up
const POSES={
  6:{hx:50, th:91,  sh:90,  ft:0,   sp:[-90,-89,-87], nk:-85, ua:78,  fa:-20, bu:100, bf:96},   // upright, coffee, crossword
  5:{hx:48, th:95,  sh:88,  ft:0,   sp:[-78,-58,-40], nk:-26, ua:72,  fa:-12, bu:132, bf:24},   // hunched, hand on her back
  4:{hx:38, th:90,  sh:90,  ft:0,   sp:[-18,-4,2],    nk:18,  ua:90,  fa:95,  bu:-165,bf:175},  // an "L"
  3:{hx:40, th:100, sh:94,  ft:0,   sp:[50,75,88],    nk:20,  ua:84,  fa:78,  bu:96,  bf:86},   // folded over, reading the floor
  2:{hx:52, th:70,  sh:182, ft:95,  sp:[-6,10,32],    nk:60,  ua:25,  fa:5,   bu:30,  bf:8},    // kneeling. the cat's ottoman
  1:{hx:34, th:180, sh:180, ft:95,  sp:[0,0,1],       nk:4,   ua:172, fa:178, bu:168, bf:178, hy:FLOOR-6}, // flat. flooring now
  0:{hx:70, th:-88, sh:-92, ft:0,   sp:[180,180,182], nk:180, ua:-140,fa:-115,bu:160, bf:175, hy:FLOOR-6}  // flat on her back, legs straight up
};
const rad=a=>a*Math.PI/180;
const dirv=(a,r)=>({x:Math.cos(rad(a))*r,y:Math.sin(rad(a))*r});
const add=(p,v)=>({x:p.x+v.x,y:p.y+v.y});
function poseHipY(P){return P.hy!==undefined?P.hy:FLOOR-2-(Math.sin(rad(P.th))*LT+Math.sin(rad(P.sh))*LS);}
function clonePose(P){return {hx:P.hx,hy:poseHipY(P),th:P.th,sh:P.sh,ft:P.ft,sp:P.sp.slice(),nk:P.nk,ua:P.ua,fa:P.fa,bu:P.bu,bf:P.bf};}
let kinks=[], camFlinch=0, xrayUntil=0, xrayJ=-1, camBg=null, curPose=clonePose(POSES[6]), lastCamT=0;
const camView={z:1.2,x:58,y:62};
const dadA={on:false,t:0,healed:false};

function camSetup(){
  const dp=CAM_CSS/CW*Math.min(2.5,window.devicePixelRatio||1);
  camCv.width=Math.round(CW*dp); camCv.height=Math.round(CH*dp);
  const db=dp*1.3;                                   // the backdrop gets zoomed a little, so draw it a bit sharper
  camBg=document.createElement('canvas'); camBg.width=Math.round(BGW*db); camBg.height=Math.round(BGH*db);
  const g=camBg.getContext('2d'); g.setTransform(db,0,0,db,-BGX*db,-BGY*db);
  g.fillStyle='#e6d8bd'; g.fillRect(BGX,BGY,BGW,FLOOR-BGY);
  g.fillStyle='rgba(160,120,80,0.08)'; for(let x=BGX;x<BGX+BGW;x+=10) g.fillRect(x,BGY,4,FLOOR-BGY);
  g.fillStyle='#d9c9aa'; g.fillRect(BGX,FLOOR-9,BGW,9); g.fillStyle='rgba(0,0,0,0.08)'; g.fillRect(BGX,FLOOR-9,BGW,1);   // baseboard
  // calendar
  g.fillStyle='#fbf6ec'; g.fillRect(-22,16,14,18); g.fillStyle='#d97b6c'; g.fillRect(-22,16,14,5);
  g.fillStyle='rgba(0,0,0,0.25)'; for(let r=0;r<3;r++) for(let c=0;c<4;c++) g.fillRect(-20.5+c*3.2,23.5+r*3.3,1.6,1.6);
  // window
  g.fillStyle='#b9d6e6'; g.fillRect(10,18,30,26); g.fillStyle='#d9ecf3'; g.fillRect(10,18,30,9);
  g.strokeStyle='#fbf6ec'; g.lineWidth=3; g.strokeRect(10,18,30,26); g.lineWidth=1.5; g.beginPath(); g.moveTo(25,18); g.lineTo(25,44); g.stroke();
  // clock
  g.fillStyle='#fbf6ec'; g.beginPath(); g.arc(100,24,7,0,6.283); g.fill(); g.strokeStyle='#6b5a48'; g.lineWidth=1.1; g.stroke();
  g.beginPath(); g.moveTo(100,24); g.lineTo(100,19.5); g.moveTo(100,24); g.lineTo(103,25.5); g.stroke();
  // counter, toaster, fridge
  g.fillStyle='#9a7b5c'; g.fillRect(90,68,40,FLOOR-68); g.fillStyle='#86684d'; for(const x of [100,115]) g.fillRect(x,72,1,FLOOR-76);
  g.fillStyle='#d9d2c4'; g.fillRect(88,64,42,5);
  g.fillStyle='#c8c2b6'; g.fillRect(100,55,12,9); g.fillStyle='#8f897e'; g.fillRect(102,54,3,2); g.fillRect(107,54,3,2);
  g.fillStyle='#eef0ee'; g.fillRect(131,18,26,FLOOR-18); g.fillStyle='rgba(0,0,0,0.1)'; g.fillRect(131,50,26,1.2); g.fillStyle='#b8bcbc'; g.fillRect(133,30,1.6,12); g.fillRect(133,56,1.6,14);
  // floor
  g.fillStyle='#c7b18d'; g.fillRect(BGX,FLOOR,BGW,BGY+BGH-FLOOR);
  for(let x=BGX;x<BGX+BGW;x+=12) for(let y=FLOOR;y<BGY+BGH;y+=8) if((((x-BGX)/12)+(y-FLOOR)/8)%2===0){g.fillStyle='rgba(90,70,40,0.12)'; g.fillRect(x,y,12,8);}
  g.fillStyle='rgba(0,0,0,0.18)'; g.fillRect(BGX,FLOOR,BGW,2);
}
function tweenPose(dt){
  const T=POSES[clamp(hp,0,6)], k=1-Math.exp(-dt*7);
  curPose.hx+=(T.hx-curPose.hx)*k; curPose.hy+=(poseHipY(T)-curPose.hy)*k;
  for(const key of ['th','sh','ft','nk','ua','fa','bu','bf']) curPose[key]+=(T[key]-curPose[key])*k;
  for(let i=0;i<3;i++) curPose.sp[i]+=(T.sp[i]-curPose.sp[i])*k;
}
function rig(){
  const P=curPose, f=camFlinch, j=()=>(Math.random()-0.5)*f;
  const sip=hp===MAXHP&&!dadA.on?sipAmount(performance.now()/1000):0;
  const hip={x:P.hx+j()*3,y:P.hy+j()*2};
  const fl=y=>Math.min(FLOOR-1.5,y);
  const sp=[hip];
  for(let i=0;i<3;i++){const q=add(sp[i],dirv(P.sp[i]+j()*14,SEGL)); q.y=fl(q.y); sp.push(q);}
  const sh=sp[3];
  const head=add(sh,dirv(P.nk+j()*10,NECK)); head.y=Math.min(FLOOR-HEAD-0.5,head.y);
  const leg=(dth,dsh)=>{const knee=add(hip,dirv(P.th+dth,LT)); knee.y=fl(knee.y); const ank=add(knee,dirv(P.sh+dsh,LS)); ank.y=fl(ank.y); return {knee,ank};};
  const arm=(u,fo)=>{const el=add(sh,dirv(u,UA)); el.y=fl(el.y); const hn=add(el,dirv(fo,FA)); hn.y=fl(hn.y); return {el,hn};};
  return {hip,sp,sh,head,nk:P.nk,ft:P.ft,front:leg(0,0),back:leg(7,5),farm:arm(P.ua-sip*70,P.fa-sip*95),barm:arm(P.bu,P.bf)};
}
// 0..1..0 over 1.4 s, once every 7 s
function sipAmount(t){const u=(t%7)/1.4; if(u>=1) return 0; return Math.sin(u*Math.PI)**2;}
function line(g,pts){g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y)); g.stroke();}
// a limb or the torso: dark outline first, then the colour, so overlapping parts stay separate
function limb(g,pts,w,col){g.strokeStyle=INK; g.lineWidth=w+2.4; line(g,pts); g.strokeStyle=col; g.lineWidth=w; line(g,pts);}
function blob(g,x,y,r,col){g.fillStyle=INK; g.beginPath(); g.arc(x,y,r+1.2,0,6.283); g.fill(); g.fillStyle=col; g.beginPath(); g.arc(x,y,r,0,6.283); g.fill();}
function topPoint(R_){return R_.sp.slice(1).reduce((m,p)=>p.y<m.y?p:m,R_.sp[1]);}
function drawCat(g,x,y,face){
  g.save(); g.translate(x,y); g.scale(face,1);
  g.strokeStyle='#3b3a3e'; g.lineWidth=2; g.lineCap='round'; g.beginPath(); g.moveTo(-6,1); g.quadraticCurveTo(-12,-2,-10,-9); g.stroke();
  g.fillStyle='#3b3a3e'; g.beginPath(); g.ellipse(0,0,7,5,0,0,6.283); g.fill();
  g.beginPath(); g.arc(6,-5,3.8,0,6.283); g.fill();
  g.beginPath(); g.moveTo(3.5,-7.5); g.lineTo(4.5,-11.5); g.lineTo(6.5,-8.5); g.closePath(); g.moveTo(6.5,-8.5); g.lineTo(8.8,-11.2); g.lineTo(9.3,-7); g.closePath(); g.fill();
  g.fillStyle='#f0d34a'; g.fillRect(7,-6,1.4,1.4);
  g.restore();
}
function slipper(g,ank,ft){
  g.save(); g.translate(ank.x,ank.y); g.rotate(rad(ft));
  g.fillStyle=INK; g.beginPath(); g.ellipse(2.4,0.2,4.4,2.6,0,0,6.283); g.fill();
  g.fillStyle='#f2a7b8'; g.beginPath(); g.ellipse(2.4,0.2,3.4,1.7,0,0,6.283); g.fill();
  g.fillStyle='#fff6f8'; g.beginPath(); g.arc(4.6,-0.6,1.5,0,6.283); g.fill();
  g.restore();
}
// Mom's face. Expressions go with how folded she is.
function momFace(g,head,nk,expr){
  const F=dirv(nk+90,1), U=dirv(nk,1), P=(a,b)=>({x:head.x+F.x*a+U.x*b,y:head.y+F.y*a+U.y*b});
  const eye=P(4,1.3), m=P(5.3,-3.4);
  blob(g,P(7.7,-0.4).x,P(7.7,-0.4).y,1.5,'#efd2b6');                      // nose
  g.lineCap='round'; g.lineJoin='round'; g.strokeStyle=INK; g.fillStyle=INK; g.lineWidth=1;
  const at=(c,a,b)=>({x:c.x+F.x*a+U.x*b,y:c.y+F.y*a+U.y*b});
  const seg=(c,pts)=>{g.beginPath(); pts.forEach((q,i)=>{const p=at(c,q[0],q[1]); i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}); g.stroke();};
  // eyes
  if(expr==='flinch'||expr==='wince') seg(eye,[[-1.1,1],[0.6,0],[-1.1,-1]]);
  else if(expr==='dead') seg(eye,[[-1.1,0],[1,0]]);
  else if(expr==='x'){seg(eye,[[-1,1],[1,-1]]); seg(eye,[[-1,-1],[1,1]]);}
  else if(expr==='relief') seg(eye,[[-1.1,-0.4],[0,0.7],[1.1,-0.4]]);
  else {g.beginPath(); g.arc(eye.x,eye.y,1.05,0,6.283); g.fill();}
  // glasses
  g.lineWidth=0.9; g.beginPath(); g.arc(eye.x,eye.y,2.7,0,6.283); g.stroke();
  const tmp=at(eye,-2.7,0.4), ear=P(-1.5,0.6); g.beginPath(); g.moveTo(tmp.x,tmp.y); g.lineTo(ear.x,ear.y); g.stroke();
  // mouth
  g.lineWidth=1;
  if(expr==='smile'){g.beginPath(); const a=at(m,-1.6,0.6), c=at(m,0,-1.3), b=at(m,1.6,0.6); g.moveTo(a.x,a.y); g.quadraticCurveTo(c.x,c.y,b.x,b.y); g.stroke();}
  else if(expr==='relief'){g.beginPath(); const c=at(m,0,-0.4); g.ellipse(c.x,c.y,1.4,1.1,0,0,6.283); g.fill();}
  else if(expr==='meh') seg(m,[[-1.4,0.1],[1.4,-0.3]]);
  else if(expr==='wince'||expr==='flinch') seg(m,[[-1.5,0],[-0.7,0.6],[0,-0.3],[0.8,0.5],[1.5,-0.1]]);
  else if(expr==='oof'){g.beginPath(); const c=at(m,0.2,-0.2); g.arc(c.x,c.y,1.15,0,6.283); g.fill();}
  else seg(m,[[-1.4,0],[1.4,0]]);
  if(expr==='sweat'){const d=P(-2.5,5.5); g.fillStyle='#8ccbf0'; g.beginPath(); g.ellipse(d.x,d.y,1,1.5,0,0,6.283); g.fill();}
}
function momHead(g,head,nk,expr){
  const bun=add(head,dirv(nk-50,9.6));
  blob(g,bun.x,bun.y,3.6,'#d3cbc2');
  g.fillStyle=INK; g.beginPath(); g.arc(head.x,head.y,HEAD+1.2,0,6.283); g.fill();
  const curls=[]; for(let i=0;i<7;i++) curls.push(add(head,dirv(nk-130+i*24,6.4)));
  g.fillStyle=INK; for(const c of curls){g.beginPath(); g.arc(c.x,c.y,3.9,0,6.283); g.fill();}
  g.fillStyle='#efd2b6'; g.beginPath(); g.arc(head.x,head.y,HEAD,0,6.283); g.fill();
  g.fillStyle='#d3cbc2'; for(const c of curls){g.beginPath(); g.arc(c.x,c.y,2.9,0,6.283); g.fill();}
  g.fillStyle='rgba(120,100,90,0.35)'; for(const c of curls){g.beginPath(); g.arc(c.x+0.6,c.y+0.6,1.1,0,6.283); g.fill();}
  momFace(g,head,nk,expr);
}
function momExpr(){
  if(camFlinch>0.3) return 'flinch';
  if(dadA.on&&dadA.t>1.35&&dadA.t<2.3) return 'relief';
  return ['x','dead','sweat','oof','wince','meh','smile'][clamp(hp,0,6)];
}
// Dad: polo, khakis, socks. b squashes him on a bounce, arms 0..1 swings them out for balance
function drawDad(g,x,y,face,b,arms,walk){
  g.save(); g.translate(x,y); g.scale(face,1-b*0.1);
  g.lineCap='round'; g.lineJoin='round';
  const sw=Math.sin(walk*12)*4, hip={x:0,y:-21};
  limb(g,[hip,{x:-1+sw*0.5,y:-10.5},{x:-2+sw,y:-1}],5.6,'#9d8a63');
  limb(g,[{x:-4,y:-38},add({x:-4,y:-38},dirv(100+arms*95,12))],4,'#4f7cc0');      // back arm
  limb(g,[hip,{x:1-sw*0.5,y:-10.5},{x:2-sw,y:-1}],5.6,'#b8a47a');
  for(const fx of [-2+sw,2-sw]){g.fillStyle=INK; g.beginPath(); g.ellipse(fx+1.6,-0.6,3.8,2.1,0,0,6.283); g.fill(); g.fillStyle='#f7f7f4'; g.beginPath(); g.ellipse(fx+1.6,-0.6,2.9,1.3,0,0,6.283); g.fill();}
  // polo with a dad belly
  const body=()=>{g.beginPath(); g.moveTo(-6.5,-20); g.lineTo(-7.5,-36); g.quadraticCurveTo(-6.5,-43,0,-43); g.quadraticCurveTo(6,-43,7,-37); g.quadraticCurveTo(13.5,-29,7,-19.5); g.closePath();};
  g.fillStyle=INK; g.save(); g.lineWidth=2.4; g.strokeStyle=INK; body(); g.stroke(); g.restore();
  g.fillStyle='#4f7cc0'; body(); g.fill();
  g.fillStyle='#f4f1ea'; g.beginPath(); g.moveTo(-1,-43); g.lineTo(3.5,-43); g.lineTo(1.6,-39.5); g.closePath(); g.fill();
  g.fillStyle='#6b4a2c'; g.fillRect(-6.6,-21.6,13.6,1.6);
  limb(g,[{x:1,y:-38},add({x:1,y:-38},dirv(80-arms*100,12))],4,'#5a88cc');      // front arm
  const hand=add({x:1,y:-38},dirv(80-arms*100,12)); blob(g,hand.x,hand.y,1.7,'#e9c6a3');
  // head: bald on top, grey at the sides, glasses, moustache
  blob(g,1,-50,7,'#e9c6a3');
  g.fillStyle='#bdb6ae'; g.beginPath(); g.ellipse(-4.3,-49,2.6,3.6,0,0,6.283); g.fill();
  g.fillStyle='rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(-0.5,-55,2.6,1.2,-0.3,0,6.283); g.fill();
  g.strokeStyle=INK; g.lineWidth=0.9; g.beginPath(); g.arc(4.4,-51,2.4,0,6.283); g.stroke();
  g.fillStyle=INK; g.beginPath(); g.arc(4.6,-51,0.9,0,6.283); g.fill();
  g.fillStyle='#7d736a'; g.beginPath(); g.ellipse(5.6,-46.7,2.6,1.2,0,0,6.283); g.fill();
  g.restore();
}
function dadPose(R_){
  const t=dadA.t, top=topPoint(R_), st={x:top.x,y:top.y-6.5}, door=158, side=st.x+15;
  const lerp=(a,b,u)=>a+(b-a)*u;
  if(t<0.6){const u=t/0.6; return {x:lerp(door,side,u),y:FLOOR,face:-1,b:0,arms:0,walk:t};}
  if(t<0.9){const u=(t-0.6)/0.3; return {x:lerp(side,st.x,u),y:lerp(FLOOR,st.y,u)-Math.sin(u*Math.PI)*10,face:-1,b:0,arms:u,walk:0};}
  if(t<1.8) return {x:st.x,y:st.y,face:-1,b:Math.abs(Math.sin((t-0.9)*Math.PI*2.2)),arms:1,walk:0};
  if(t<2.1){const u=(t-1.8)/0.3; return {x:lerp(st.x,side+2,u),y:lerp(st.y,FLOOR,u)-Math.sin(u*Math.PI)*8,face:1,b:0,arms:1-u,walk:0};}
  const u=Math.min(1,(t-2.1)/0.6); return {x:lerp(side+2,door,u),y:FLOOR,face:1,b:0,arms:0,walk:t};
}
function drawMom(g,R_,now){
  const {hip,sp,sh,head,nk,ft,front,back,farm,barm}=R_;
  g.lineCap='round'; g.lineJoin='round';
  limb(g,[sh,barm.el,barm.hn],4.2,'#b9685a'); blob(g,barm.hn.x,barm.hn.y,1.8,'#e2c2a6');
  limb(g,[hip,back.knee,back.ank],6.2,'#2b3549'); slipper(g,back.ank,ft);
  blob(g,hip.x,hip.y,6,'#34405a');
  limb(g,sp,12,'#d97b6c');
  // cardigan buttons and a blouse collar, on her front side
  for(let i=0;i<3;i++){const a=sp[i], b=sp[i+1], ang=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI, m=add({x:(a.x+b.x)/2,y:(a.y+b.y)/2},dirv(ang+90,3.6)); g.fillStyle='#f4efe4'; g.beginPath(); g.arc(m.x,m.y,0.9,0,6.283); g.fill();}
  const col=add(sh,dirv(nk+90,2.2)); g.fillStyle='#f4efe4'; g.beginPath(); g.arc(col.x,col.y,2.4,0,6.283); g.fill();
  limb(g,[hip,front.knee,front.ank],6.4,'#34405a'); slipper(g,front.ank,ft);
  limb(g,[sh,add(sh,dirv(nk,4))],4.4,'#efd2b6');
  momHead(g,head,nk,momExpr());
  limb(g,[sh,farm.el,farm.hn],4.4,'#d0705f'); blob(g,farm.hn.x,farm.hn.y,1.9,'#efd2b6');
  if(hp>=5&&!dadA.on){
    const h=farm.hn;
    g.fillStyle=INK; g.fillRect(h.x-2.2,h.y-6.2,8.4,8.6); g.fillStyle='#f3efe6'; g.fillRect(h.x-1.2,h.y-5.2,6.4,6.6);
    g.strokeStyle=INK; g.lineWidth=1.2; g.beginPath(); g.arc(h.x+5.6,h.y-2,2.2,-1.3,1.3); g.stroke();
    if(hp===MAXHP){g.strokeStyle='rgba(255,255,255,0.8)'; g.lineWidth=0.9; g.beginPath(); for(const o of [0.6,3.6]){const sx=h.x+o, sy=h.y-7, w=Math.sin(now*3+o)*1.2; g.moveTo(sx,sy); g.quadraticCurveTo(sx-1.5+w,sy-3,sx+0.5,sy-6);} g.stroke();}
  }
}
function drawKitchen(g,R_,now){
  const {hip,head,front}=R_;
  g.drawImage(camBg,BGX,BGY,BGW,BGH);
  g.lineCap='round'; g.lineJoin='round';
  if(hp<=4){const mx=front.ank.x+17; g.fillStyle='rgba(110,70,30,0.55)'; g.beginPath(); g.ellipse(mx+3,FLOOR+3,9,2,0,0,6.283); g.fill(); g.fillStyle='#f3efe6'; g.save(); g.translate(mx,FLOOR-2); g.rotate(1.2); g.fillRect(-3,-3,6,6); g.restore();}
  if(hp===3||hp<=2){const nx=hp===3?head.x+2:hip.x-14; g.fillStyle='#ece8de'; g.fillRect(nx-8,FLOOR-2,16,3); g.fillStyle='rgba(0,0,0,0.25)'; for(let x=nx-7;x<nx+7;x+=3) g.fillRect(x,FLOOR-1.5,1.5,1.5);}
  if(hp<=1){const sx=head.x+15; g.fillStyle=INK; g.beginPath(); g.moveTo(sx-6,FLOOR); g.lineTo(sx-2.6,FLOOR-14); g.lineTo(sx+2.6,FLOOR-14); g.lineTo(sx+6,FLOOR); g.closePath(); g.fill(); g.fillStyle='#f2c230'; g.beginPath(); g.moveTo(sx-4.8,FLOOR-0.6); g.lineTo(sx-1.8,FLOOR-13); g.lineTo(sx+1.8,FLOOR-13); g.lineTo(sx+4.8,FLOOR-0.6); g.closePath(); g.fill(); g.fillStyle=INK; g.fillRect(sx-0.6,FLOOR-10.5,1.3,5); g.fillRect(sx-0.6,FLOOR-4,1.3,1.3);}
  g.fillStyle='rgba(0,0,0,0.15)'; g.beginPath(); g.ellipse(hip.x+6,FLOOR+2,26,3,0,0,6.283); g.fill();
  drawMom(g,R_,now);
  const catOnTop=hp<=2&&!dadA.on;
  if(catOnTop){const top=topPoint(R_); drawCat(g,top.x,top.y-11,1);}
  if(dadA.on){const d=dadPose(R_); drawDad(g,d.x,d.y,d.face,d.b,d.arms,d.walk);}
  if(!catOnTop) drawCat(g,Math.max(front.ank.x,head.x)+24,FLOOR-5,-1);
  if(dadA.on&&dadA.t>1.35&&dadA.t<1.9){
    const top=topPoint(R_), a=1-(dadA.t-1.35)/0.55;
    g.globalAlpha=a; g.font='700 11px "IBM Plex Mono", ui-monospace, monospace'; g.fillStyle='#ffffff'; g.strokeStyle=INK; g.lineWidth=2.5;
    g.strokeText('POP',top.x-24,top.y-30-(1-a)*6); g.fillText('POP',top.x-24,top.y-30-(1-a)*6); g.globalAlpha=1;
  }
}
function drawXray(g,R_,now){
  const {hip,sp,sh,head,front,back,farm,barm}=R_, bone='#e8f1ff';
  g.fillStyle='#0a1828'; g.fillRect(BGX,BGY,BGW,BGH);
  g.strokeStyle='rgba(120,180,255,0.1)'; g.lineWidth=1; g.beginPath(); for(let x=BGX;x<BGX+BGW;x+=12){g.moveTo(x,BGY);g.lineTo(x,BGY+BGH);} for(let y=BGY;y<BGY+BGH;y+=12){g.moveTo(BGX,y);g.lineTo(BGX+BGW,y);} g.stroke();
  g.lineCap='round'; g.lineJoin='round'; g.strokeStyle=bone;
  g.lineWidth=2.4; line(g,[hip,back.knee,back.ank]); line(g,[hip,front.knee,front.ank]); line(g,[sh,barm.el,barm.hn]); line(g,[sh,farm.el,farm.hn]);
  g.lineWidth=1.6; g.beginPath(); g.ellipse(hip.x,hip.y+1,7,3.8,0,0,6.283); g.stroke();
  g.lineWidth=1; g.strokeStyle='rgba(232,241,255,0.5)'; line(g,sp);
  let vi=0;
  for(let i=0;i<3;i++){
    const a=sp[i], b=sp[i+1], ang=Math.atan2(b.y-a.y,b.x-a.x);
    for(const t of [0.28,0.78]){
      const m={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}, isNew=vi===xrayJ, isBroken=kinks.some(k=>k.j===vi);
      g.save(); g.translate(m.x,m.y); g.rotate(ang); g.fillStyle=isNew?'#ff5a46':isBroken?'#ffb4a8':bone; g.fillRect(-1.8,-3.5,3.6,7); g.restore();
      if(isNew){
        g.strokeStyle='#ff5a46'; g.lineWidth=1.3; g.beginPath(); g.moveTo(m.x-6,m.y-3); g.lineTo(m.x-2,m.y+1); g.lineTo(m.x+1,m.y-2); g.lineTo(m.x+6,m.y+3); g.stroke();
        g.font='700 10px "IBM Plex Mono", ui-monospace, monospace'; g.fillStyle='#ff6a55';
        g.fillText(VERT[vi],m.x+8,m.y-7);
      }
      vi++;
    }
    if(i===2){for(const t of [0.2,0.55,0.9]){const m={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}, n=dirv(ang*180/Math.PI+90,7.5); g.strokeStyle='rgba(232,241,255,0.7)'; g.lineWidth=1.1; g.beginPath(); g.moveTo(m.x,m.y); g.lineTo(m.x+n.x,m.y+n.y); g.stroke();}}
  }
  g.strokeStyle=bone; g.lineWidth=2; g.beginPath(); g.arc(head.x,head.y,HEAD-0.5,0,6.283); g.stroke();
  const eye=add(head,dirv(R_.nk+90,3.4)); g.fillStyle=bone; g.beginPath(); g.arc(eye.x,eye.y,1.6,0,6.283); g.fill();
}
// where the camera wants to be: framing Mom snugly, or pulled back while Dad is in the shot
function camTarget(R_){
  if(dadA.on) return {z:0.98,x:66,y:52};
  const pts=[R_.hip,...R_.sp,R_.front.ank,R_.back.ank,R_.farm.hn,R_.barm.hn,{x:R_.head.x-HEAD-4,y:R_.head.y-HEAD-4},{x:R_.head.x+HEAD+2,y:R_.head.y+HEAD}];
  let x0=1e9,x1=-1e9,y0=1e9,y1=FLOOR+3;
  for(const p of pts){x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); y0=Math.min(y0,p.y); y1=Math.max(y1,p.y);}
  const z=clamp(Math.min(CW/(x1-x0+34),CH/(y1-y0+28)),1.1,1.75);
  const half=CH/2/z, halfW=CW/2/z;
  return {z,x:clamp((x0+x1)/2,BGX+halfW,BGX+BGW-halfW),y:clamp((y0+y1)/2+4,BGY+half,BGY+BGH-half)};
}
let camTick=0;
function drawCam(now){
  if(!camBg) camSetup();
  if((camTick++&1)&&now>=xrayUntil&&camFlinch<=0) return;      // 30 fps is plenty for the cam
  const dt=Math.min(0.05,Math.max(0,now-lastCamT)); lastCamT=now;
  tweenPose(dt);
  const R_=rig(), T_=camTarget(R_), k=1-Math.exp(-dt*3.5);
  camView.z+=(T_.z-camView.z)*k; camView.x+=(T_.x-camView.x)*k; camView.y+=(T_.y-camView.y)*k;
  const dp=camCv.width/CW, z=camView.z;
  cc.setTransform(dp*z,0,0,dp*z,dp*(CW/2-camView.x*z),dp*(CH/2-camView.y*z));
  if(now<xrayUntil) drawXray(cc,R_,now); else drawKitchen(cc,R_,now);
  if(now<xrayUntil){cc.setTransform(dp,0,0,dp,0,0); cc.font='700 8px "IBM Plex Mono", ui-monospace, monospace'; cc.fillStyle='rgba(232,241,255,0.6)'; cc.fillText('X-RAY',CW-34,CH-6);}
  if(mode==='title'&&tcamCtx){
    if(tcamCv.width!==camCv.width){tcamCv.width=camCv.width; tcamCv.height=camCv.height;}
    tcamCtx.drawImage(camCv,0,0);
  }
}
function breakVertebra(now){
  const free=[0,1,2,3,4,5].filter(j=>!kinks.some(k=>k.j===j));
  if(!free.length) return -1;
  const j=free[(Math.random()*free.length)|0];
  kinks.push({j});
  xrayJ=j; xrayUntil=now+0.6; camFlinch=1;
  camEl.classList.remove('hit'); void camEl.offsetWidth; camEl.classList.add('hit');
  return j;
}
function camLabel(){camStateEl.textContent=dadA.on?'KITCHEN · DAD':hp>=4?'KITCHEN':hp>=2?'KITCHEN FLOOR':'MOSTLY FLOOR';}

/* ---------- Dad fixes her: every ten clean steps he walks on her back ---------- */
function startDad(){dadA.on=true; dadA.t=0; dadA.healed=false; camLabel();}
function dadUpdate(dt){
  if(!dadA.on) return;
  dadA.t+=dt;
  if(!dadA.healed&&dadA.t>=1.35){
    dadA.healed=true;
    if(mode==='play'&&hp>0&&hp<MAXHP){
      hp++; kinks.pop(); updateHUD(); sfx.backpop();
      say("Dad walked on Mom's back.",'Something popped back in.',1600);
      momText(T.healed);
    }
  }
  if(dadA.t>=2.75){dadA.on=false; camLabel();}
}

/* ---------- the family group chat ---------- */
const T={
  open:["walking home? watch the cracks. love mom","be careful sweetie. my back's been weird today","remember. cracks."],
  hit:{5:["did you just step on something","my back just made a noise like bubble wrap","I heard that from the kitchen"],
       4:["I am now shaped like the letter L","the crossword is on the ceiling now apparently","your father says I look taller sideways"],
       3:["folded over. still doing the crossword","I can see my own heels. they need lotion","the floor is very interesting from here"],
       2:["the cat is using me as an ottoman","I've been a zigzag for ten minutes. very modern","your aunt says I look like a lightning bolt"],
       1:["I'm a rug now. the cat agrees","a neighbor wiped his feet on me","I'm fine. I'm flooring but I'm fine"]},
  vert:["pretty sure that was my {v}","{v}. gone. it had a good run","RIP {v}","my {v} just left the group chat"],
  line:["that was a LINE. lines are worse. ask any spine","line. spine. you know the rules"],
  hole:["a POTHOLE?? I felt that in my whole column"],
  near:["that was close. I felt a draft","careful. my disc just gasped","I flinched. the soup flinched"],
  streak:["you're walking so nicely. I can feel my lumbar again","keep this up and I'll reach the top shelf"],
  healed:["your father walked on me. something went back in","ok that helped. tell him to wipe his feet","one notch less folded. thank your father","he does this every christmas"],
  giant:["was that a giant step. my knees heard it","I said yes but I didn't mean it like THAT","show off"],
  coupon:["is that a chiropractor coupon. bring it home. don't fold it","ooh. coupon. tape it to my back","unfolding one notch. thank you"],
  snap:["don't stretch like that. that's how this started for me","you looked just like me for a second","hamstrings aren't free sweetie"],
  dog:["is that the kowalski dog","tell that dog I said no","RUN. I'm serious","that dog has never liked our family"],
  stage:{1:["linden st. your grandmother cracked her hip there in 1998"],2:["oak st?? the ROOTS. I'm bracing"],3:["old mill rd is all flagstone. so many lines. so many spines"],4:["quarry ln. I'm updating my will. you get the heating pad"]},
  gum:["was that gum. my back feels sticky","gum?? I can taste spearmint"],
  leaf:["I heard that leaf. sounded like my L4"],
  idle:["why'd you stop","are you standing on a crack right now. be honest","hello??","the suspense is worse than the cracks"],
  ambient:["your father wants to know if you're stepping on cracks","the chiropractor is here. he's crying","I can hear my spine in my teeth","the roomba keeps bumping into me","bring milk","who taught you to walk like that","I'm proud of you. also be careful","ok"]
};
const PEOPLE={mom:{name:'Mom',c:'#d97b6c',ping:1}};
const chatEl=$('#chat');
let chatQ=[], chatBusy=false, chatTimer=0, lastTextAt=-1e9;
const chatStats={mom:0};
const lastPick=new Map();
function pick(arr){if(arr.length===1) return arr[0]; const last=lastPick.get(arr); let i; do{i=(Math.random()*arr.length)|0;}while(i===last); lastPick.set(arr,i); return arr[i];}
function retire(el){if(el.classList.contains('gone')) return; el.classList.add('gone','out'); clearTimeout(el._t); setTimeout(()=>el.remove(),300);}
function post(who,src,o){
  o=o||{};
  if(!src||mode!=='play') return;
  if(o.chance!==undefined&&Math.random()>o.chance) return;
  const m={who,text:typeof src==='string'?src:pick(src)};
  if(o.urgent){
    chatQ=[m]; clearTimeout(chatTimer); chatBusy=false;
    for(const el of [...chatEl.children]) if(el.querySelector('.typing')) retire(el);
  } else {if(chatQ.length>=3) return; chatQ.push(m);}
  if(!chatBusy) nextChat();
}
function momText(src,o){post('mom',src,o);}
function nextChat(){
  const m=chatQ.shift();
  if(!m){chatBusy=false; return;}
  chatBusy=true; lastTextAt=performance.now()/1000;
  const el=document.createElement('div'); el.className='cmsg out'; el.style.setProperty('--who',PEOPLE[m.who].c);
  el.innerHTML='<div class="from"></div><div class="bubble"><span class="typing" aria-hidden="true"><i></i><i></i><i></i></span></div>';
  el.firstChild.textContent=PEOPLE[m.who].name;
  chatEl.appendChild(el); void el.offsetWidth; el.classList.remove('out');
  const live=[...chatEl.children].filter(x=>!x.classList.contains('gone'));
  while(live.length>1) retire(live.shift());
  for(const x of live) x.classList.toggle('old',x!==el);
  chatTimer=setTimeout(()=>{
    el.lastChild.textContent=m.text; sfx.ping(PEOPLE[m.who].ping);
    if(m.who==='mom') chatStats.mom++;
    el._t=setTimeout(()=>retire(el),Math.max(2600,m.text.length*55+1600));
    chatTimer=setTimeout(nextChat,950);
  },m.text==='👍'?380:620);
}
function clearTexts(){chatQ=[]; clearTimeout(chatTimer); chatBusy=false; for(const el of [...chatEl.children]) retire(el);}

/* ---------- the Kowalskis' chihuahua: only shows up when you dawdle ---------- */
// Stand still too long and it comes running from behind. Get moving again (two steps) and it loses interest.
// If it reaches your heel it nips: a foot in the air drops where it is, a planted one lurches forward somewhere you didn't pick.
const dog={on:false,state:'off',d:0,x:2.5,side:1,yapAt:0,run:0,yaps:[],gap:9,since:0,leaveT:0};
function dogReset(){dog.on=false; dog.state='off'; dog.yaps=[]; dog.gap=9;}
function heelD(){return Math.min(feet[0].d,feet[1].d)-0.55;}
const dawdleLimit=()=>3.4-stageOf(slabIdx(front.d))*0.3;      // 3.4 s on Maple Ave down to 2.2 s on Quarry Ln
function dogUpdate(dt,now){
  if(mode!=='play'||tStart===null) return;
  dog.yaps=dog.yaps.filter(y=>now-y.t<0.7);
  if(dog.state==='off'){
    if(phase==='idle'&&now-lastStepAt>dawdleLimit()){
      dog.on=true; dog.state='chase'; dog.side=Math.random()<0.5?-1:1; dog.d=heelD()-3.8; dog.x=bodyX+dog.side*1.2; dog.since=steps; dog.yapAt=0;
    }
    return;
  }
  dog.run+=dt*18;
  if(dog.state==='chase'){
    dog.d+=2.3*dt; dog.gap=heelD()-dog.d;
    dog.x+=((clamp(bodyX+dog.side*1.15,-0.6,WS+0.6))-dog.x)*(1-Math.exp(-dt*3));
    if(dog.gap<2.8&&now>dog.yapAt){
      dog.yapAt=now+0.22+Math.max(0,dog.gap)*0.3; sfx.yap(dog.side*0.4);
      dog.yaps.push({t:now,x:dog.x+(Math.random()-0.5)*0.5,d:dog.d+0.35});
    }
    if(steps-dog.since>=2){dog.state='leave'; dog.leaveT=0;}
    else if(dog.gap<=0&&(phase==='idle'||phase==='swing')){nip(now); dog.state='leave'; dog.leaveT=0;}
  } else {
    dog.leaveT+=dt; dog.x+=dog.side*3.4*dt; dog.d-=0.5*dt; dog.gap=9;
    if(dog.leaveT>1.6){dog.on=false; dog.state='off'; lastStepAt=Math.max(lastStepAt,now-1);}
  }
}
function nip(now){
  const had=streak; streak=0;
  sayNow('Nip!',had>=3?`The Kowalskis' chihuahua. Streak of ${had} gone.`:"The Kowalskis' chihuahua.",1100); sfx.nip(); kick(8);
  if(phase==='swing') plant();                         // the jolt drops the lifted foot where it is
  else {
    const f=back, o=front, ahead=0.9+Math.random()*1.1;
    const x=clamp(o.x+f.side*(0.55+Math.random()*0.5),R+0.05,WS-R-0.05);
    drop={foot:f,x,d:o.d+ahead,t:0,dur:0.12,fx:f.x,fd:f.d,fl:0.4}; phase='drop';
  }
  updateHUD();
  momText(T.dog,{chance:0.55});
}
function drawDog(now){
  if(!dog.on||mode==='title') return;
  const x=X(dog.x), y=Y(dog.d);
  if(y<Hc+0.8*K){
    const s=K*1.7, hop=Math.abs(Math.sin(dog.run));
    ctx.save(); ctx.translate(x,y); if(dog.state==='leave') ctx.rotate(dog.side*Math.PI/2);
    ctx.fillStyle='rgba(0,0,0,0.24)'; ctx.beginPath(); ctx.ellipse(0.02*s,0.05*s,0.17*s,0.3*s,0,0,6.283); ctx.fill();
    ctx.translate(0,-hop*0.04*s);
    ctx.lineCap='round';
    // tail curled up behind, legs scrabbling
    ctx.strokeStyle='#c99a62'; ctx.lineWidth=0.045*s; ctx.beginPath(); ctx.moveTo(0,0.2*s); ctx.quadraticCurveTo(0.12*s,0.33*s+Math.sin(dog.run*1.3)*0.04*s,0.02*s,0.38*s); ctx.stroke();
    ctx.fillStyle='#b98a55'; const l=Math.sin(dog.run)*0.05;
    for(const [lx,ly] of [[0.11,-0.1+l],[-0.11,-0.1-l],[0.11,0.13-l],[-0.11,0.13+l]]){ctx.beginPath(); ctx.arc(lx*s,ly*s,0.035*s,0,6.283); ctx.fill();}
    // body in a little pink sweater
    ctx.fillStyle='#d9b07c'; ctx.beginPath(); ctx.ellipse(0,0.02*s,0.12*s,0.21*s,0,0,6.283); ctx.fill();
    ctx.fillStyle='#e8679b'; ctx.beginPath(); ctx.ellipse(0,0.0,0.125*s,0.15*s,0,0,6.283); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.75)'; ctx.lineWidth=0.018*s; for(const yy of [-0.07,0,0.07]){ctx.beginPath(); ctx.moveTo(-0.11*s,yy*s); ctx.lineTo(0.11*s,yy*s); ctx.stroke();}
    // head: bug eyes, huge ears
    ctx.fillStyle='#d9b07c';
    ctx.beginPath(); ctx.moveTo(-0.06*s,-0.24*s); ctx.lineTo(-0.2*s,-0.38*s); ctx.lineTo(-0.03*s,-0.31*s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.06*s,-0.24*s); ctx.lineTo(0.2*s,-0.38*s); ctx.lineTo(0.03*s,-0.31*s); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#f0a9b9'; ctx.beginPath(); ctx.moveTo(-0.07*s,-0.27*s); ctx.lineTo(-0.16*s,-0.35*s); ctx.lineTo(-0.05*s,-0.31*s); ctx.closePath(); ctx.moveTo(0.07*s,-0.27*s); ctx.lineTo(0.16*s,-0.35*s); ctx.lineTo(0.05*s,-0.31*s); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#d9b07c'; ctx.beginPath(); ctx.arc(0,-0.25*s,0.095*s,0,6.283); ctx.fill();
    ctx.fillStyle='#c4955f'; ctx.beginPath(); ctx.ellipse(0,-0.34*s,0.045*s,0.04*s,0,0,6.283); ctx.fill();
    ctx.fillStyle='#120d0a'; ctx.beginPath(); ctx.arc(-0.045*s,-0.27*s,0.024*s,0,6.283); ctx.arc(0.045*s,-0.27*s,0.024*s,0,6.283); ctx.arc(0,-0.375*s,0.012*s,0,6.283); ctx.fill();
    ctx.restore();
  }
  // "yap!" written in chalk over wherever it yapped
  ctx.font=`${(0.34*K).toFixed(1)}px "Schoolbell", cursive`; ctx.textAlign='center'; ctx.lineWidth=3; ctx.lineJoin='round';
  for(const yp of dog.yaps){
    const a=1-(now-yp.t)/0.7, ty=Math.min(Y(yp.d),Hc-0.5*K)-(1-a)*0.5*K;
    ctx.globalAlpha=a; ctx.strokeStyle='rgba(0,0,0,0.5)'; ctx.strokeText('yap!',X(yp.x),ty); ctx.fillStyle='#fbf8f1'; ctx.fillText('yap!',X(yp.x),ty);
  }
  ctx.globalAlpha=1; ctx.textAlign='start';
}
// the bottom of the screen reddens as it closes in
function drawDogDanger(){
  if(dog.state!=='chase'||mode!=='play'||dog.gap>1.6) return;
  const a=0.24*(1-Math.max(0,dog.gap)/1.6), h=Hc*0.15, gr=ctx.createLinearGradient(0,Hc,0,Hc-h);
  gr.addColorStop(0,`rgba(205,52,36,${a.toFixed(3)})`); gr.addColorStop(1,'rgba(205,52,36,0)');
  ctx.fillStyle=gr; ctx.fillRect(0,Hc-h,Wc,h);
}

/* ---------- ambient life: falling leaves, a squirrel, ants on a crack, cloud shadows ---------- */
// All cosmetic. The only thing that touches play is that a leaf landing on a crack hides it, like the ones already there.
let falling=[], squirrel=null, cloud=null, nextLeaf=0, nextSquirrel=0, nextCloud=0, nextMower=0;
function ambientReset(now){
  falling=[]; squirrel=null; cloud=null;
  nextLeaf=now+1.5; nextSquirrel=now+10+Math.random()*10; nextCloud=now+18+Math.random()*25; nextMower=now+25+Math.random()*40;
}
function ambientUpdate(dt,now){
  const st=stageOf(slabIdx(front.d));
  // leaves let go every few seconds, more often under Oak St's trees
  if(now>nextLeaf){
    nextLeaf=now+((st===2?1.6:st>=3?2.6:3.4)+Math.random()*3)*(reduceMotion?2:1);
    if(falling.length<6) falling.push({x:-1.8+Math.random()*(WS+3.6),d:camD+1.5+Math.random()*10,t:0,dur:3.2+Math.random()*2.2,h:1,
      a:Math.random()*6.28,spin:(Math.random()-0.5)*5,ph:Math.random()*6.28,sw:0.25+Math.random()*0.35,s:0.22+Math.random()*0.2,
      c:LEAFC[(Math.random()*LEAFC.length)|0],ty:Math.random()<0.3?'oak':'oval'});
  }
  for(let i=falling.length-1;i>=0;i--){
    const L=falling[i]; L.t+=dt; L.h=Math.max(0,1-L.t/L.dur); L.a+=L.spin*dt*L.h; L.d-=dt*0.12;
    if(L.h>0) continue;
    falling.splice(i,1);
    const sl=slabs.get(slabIdx(L.d));
    if(sl){(sl.fallen||(sl.fallen=[])).push({x:L.x,d:L.d,s:L.s,a:L.a,c:L.c,t:L.ty}); if(sl.fallen.length>12) sl.fallen.shift();}
  }
  // a squirrel dashes across ahead now and then, stopping once in the middle to stare at you
  if(!squirrel&&now>nextSquirrel){
    nextSquirrel=now+(st===2?16:26)+Math.random()*18;
    const dir=Math.random()<0.5?1:-1;
    squirrel={x:dir>0?-3.2:WS+3.2,d:camD+3.5+Math.random()*5,dir,state:'run',t:0,seg:0.35,stopped:false,flick:0,hop:0};
  }
  if(squirrel){
    const q=squirrel; q.t+=dt;
    if(q.state==='run'){
      q.x+=q.dir*6.5*dt; q.hop+=dt*16;
      const mid=q.dir>0?q.x>WS*0.42:q.x<WS*0.58;
      if(!q.stopped&&mid){q.stopped=true; q.state='pause'; q.t=0; q.seg=0.8+Math.random()*0.6; sfx.chitter(clamp((q.x-WS/2)/4,-0.8,0.8));}
      else if(q.t>q.seg){q.state='pause'; q.t=0; q.seg=0.12+Math.random()*0.25;}
    } else if(q.t>q.seg){q.state='run'; q.t=0; q.seg=0.3+Math.random()*0.35;}
    q.flick=q.state==='pause'?Math.sin(q.t*20)*Math.max(0,1-q.t*1.8):0;
    if(q.x<-4.5||q.x>WS+4.5) squirrel=null;
  }
  // a cloud's shadow slides over every so often
  if(!cloud&&now>nextCloud){
    nextCloud=now+40+Math.random()*35;
    cloud={x:-0.7,y:0.2+Math.random()*0.5,v:0.055+Math.random()*0.03,blobs:Array.from({length:6},()=>({dx:(Math.random()-0.5)*0.9,dy:(Math.random()-0.5)*0.35,r:0.25+Math.random()*0.25}))};
  }
  if(cloud){cloud.x+=cloud.v*dt; if(cloud.x>1.7) cloud=null;}
  // somebody is mowing a lawn a few houses over (the quieter streets only)
  if(now>nextMower){nextMower=now+70+Math.random()*60; if(st<=2) sfx.mower();}
}
function drawFallen(lo,hi){
  for(let i=lo;i<=hi;i++){const sl=slabs.get(i); if(sl&&sl.fallen) for(const L of sl.fallen) drawLeaf(ctx,X(L.x),Y(L.d),L.s*K,L.a,L.c,L.t);}
}
function drawFalling(){
  for(const L of falling){
    const gx=X(L.x), gy=Y(L.d), h=L.h, sway=Math.sin(L.t*2.2+L.ph)*L.sw*h;
    ctx.fillStyle=`rgba(0,0,0,${(0.08+0.14*(1-h)).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(gx+sway*K*0.3,gy,L.s*K*0.45,L.s*K*0.25,L.a,0,6.283); ctx.fill();
    // flutter: the leaf flips edge-on now and then as it falls
    const flip=0.35+0.65*Math.abs(Math.cos(L.t*3.1+L.ph));
    ctx.save(); ctx.translate(gx+sway*K,gy-h*2.6*K); ctx.scale(1+0.35*h,(1+0.35*h)*flip);
    drawLeaf(ctx,0,0,L.s*K,L.a,L.c,L.ty); ctx.restore();
  }
}
// ants march single file beside a crack (Oak St and on)
function antAt(a,s){
  const p=a.c.pts, cum=a.cum; let j=0; while(j<cum.length-2&&cum[j+1]<s) j++;
  const seg=cum[j+1]-cum[j]||1, u=(s-cum[j])/seg, ang=Math.atan2(p[j+1][1]-p[j][1],p[j+1][0]-p[j][0]);
  return {x:p[j][0]+(p[j+1][0]-p[j][0])*u, d:p[j][1]+(p[j+1][1]-p[j][1])*u, ang};
}
function drawAnts(now,lo,hi){
  ctx.fillStyle='#17110c';
  const k=K/58;
  for(let i=lo;i<=hi;i++){
    const sl=slabs.get(i), a=sl&&sl.ants; if(!a) continue;
    let s0=a.off+now*a.v;
    for(let n=0;n<a.n;n++){
      s0+=a.gaps[n];
      const s=((s0%a.len)+a.len)%a.len, fade=Math.min(1,s/0.2,(a.len-s)/0.2); if(fade<=0.05) continue;
      const P=antAt(a,s), nx=-Math.sin(P.ang)*a.side, nd=Math.cos(P.ang)*a.side, off=0.06+Math.sin(now*18+n*1.7)*0.008;
      const x=X(P.x+nx*off), y=Y(P.d+nd*off), dx=Math.cos(P.ang)*(a.v>0?1:-1), dy=-Math.sin(P.ang)*(a.v>0?1:-1);
      ctx.globalAlpha=fade;
      for(const [o,r] of [[2.8,1.4],[0,1.25],[-3.2,1.9]]){ctx.beginPath(); ctx.arc(x+dx*o*k,y+dy*o*k,r*k,0,6.283); ctx.fill();}
    }
  }
  ctx.globalAlpha=1;
}
function drawSquirrel(){
  const q=squirrel; if(!q) return;
  const s=K*1.2, hop=q.state==='run'?Math.abs(Math.sin(q.hop)):0;
  ctx.save(); ctx.translate(X(q.x),Y(q.d));
  ctx.fillStyle='rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(-0.12*s,0.06*s,0.52*s,0.16*s,0,0,6.283); ctx.fill();
  ctx.translate(0,-hop*0.06*s); ctx.scale(q.dir*(1+hop*0.06),1+hop*0.06);
  // tail: a fluffy chain of puffs behind, waving side to side
  const wave=t=>Math.sin(q.hop*0.6+t*2)*0.05+q.flick*0.09*t;
  const puffs=[[-0.3,0.1],[-0.43,0.125],[-0.56,0.13],[-0.68,0.11]];
  ctx.fillStyle='#a88d75'; for(const [px,r] of puffs){ctx.beginPath(); ctx.arc(px*s,wave(-px)*s,(r+0.03)*s,0,6.283); ctx.fill();}
  ctx.fillStyle='#7a604c'; for(const [px,r] of puffs){ctx.beginPath(); ctx.arc(px*s,wave(-px)*s,r*s,0,6.283); ctx.fill();}
  // legs scrabble while running
  if(q.state==='run'){ctx.fillStyle='#6e5644'; const l=Math.sin(q.hop)*0.04; for(const [lx,ly] of [[0.12+l,0.11],[0.12-l,-0.11],[-0.12-l,0.12],[-0.12+l,-0.12]]){ctx.beginPath(); ctx.arc(lx*s,ly*s,0.035*s,0,6.283); ctx.fill();}}
  ctx.fillStyle='#735742'; ctx.beginPath(); ctx.ellipse(-0.02*s,0,0.24*s,0.12*s,0,0,6.283); ctx.fill();
  ctx.fillStyle='rgba(60,42,30,0.35)'; ctx.beginPath(); ctx.ellipse(-0.04*s,0,0.18*s,0.035*s,0,0,6.283); ctx.fill();
  ctx.fillStyle='#735742'; ctx.beginPath(); ctx.ellipse(0.23*s,0,0.1*s,0.085*s,0,0,6.283); ctx.fill();
  ctx.fillStyle='#6a5141'; ctx.beginPath(); ctx.arc(0.2*s,0.072*s,0.026*s,0,6.283); ctx.arc(0.2*s,-0.072*s,0.026*s,0,6.283); ctx.fill();
  ctx.fillStyle='#120d0a'; ctx.beginPath(); ctx.arc(0.28*s,0.045*s,0.014*s,0,6.283); ctx.arc(0.28*s,-0.045*s,0.014*s,0,6.283); ctx.fill();
  ctx.restore();
}
function drawCloud(){
  if(!cloud) return;
  if(!cloud.cv){
    const n=128, c=document.createElement('canvas'); c.width=c.height=n; const g=c.getContext('2d');
    for(const b of cloud.blobs){const x=n/2+b.dx*n*0.5, y=n/2+b.dy*n*0.5, r=b.r*n*0.5, gr=g.createRadialGradient(x,y,0,x,y,r); gr.addColorStop(0,'rgba(22,30,42,0.075)'); gr.addColorStop(1,'rgba(22,30,42,0)'); g.fillStyle=gr; g.fillRect(x-r,y-r,2*r,2*r);}
    cloud.cv=c;
  }
  const size=Math.max(Wc,Hc)*1.4;
  ctx.drawImage(cloud.cv,cloud.x*Wc-size/2,cloud.y*Hc-size/2,size,size);
}
// a street tree at the edge of the grass, roots reaching under the sidewalk (drawn into the tile, before the concrete)
function drawTree(g,x,y,r,seed){
  const rng=mulberry32(seed);
  g.fillStyle='rgba(58,44,30,0.55)'; g.beginPath(); g.ellipse(x,y,r*1.55,r*1.45,0,0,6.283); g.fill();
  g.lineCap='round';
  for(let i=5+(rng()*3|0);i>0;i--){
    const a=rng()*6.283, L=r*(1.15+rng()*0.9), bend=(rng()-0.5)*0.6;
    for(const [w,f] of [[0.34,0.45],[0.2,0.78],[0.09,1]]){
      g.strokeStyle='#5b4735'; g.lineWidth=r*w;
      g.beginPath(); g.moveTo(x+Math.cos(a)*r*0.7,y+Math.sin(a)*r*0.7);
      g.quadraticCurveTo(x+Math.cos(a+bend)*L*0.6*f,y+Math.sin(a+bend)*L*0.6*f,x+Math.cos(a+bend*1.4)*L*f,y+Math.sin(a+bend*1.4)*L*f); g.stroke();
    }
  }
  const gr=g.createRadialGradient(x-r*0.3,y-r*0.35,r*0.1,x,y,r);
  gr.addColorStop(0,'#7a624b'); gr.addColorStop(1,'#4a392b');
  g.fillStyle=gr; g.beginPath(); g.arc(x,y,r,0,6.283); g.fill();
  g.strokeStyle='rgba(30,22,15,0.45)'; g.lineWidth=Math.max(1,r*0.06);
  for(let i=0;i<14;i++){const a=rng()*6.283, r0=r*(0.45+rng()*0.3); g.beginPath(); g.moveTo(x+Math.cos(a)*r0,y+Math.sin(a)*r0); g.lineTo(x+Math.cos(a)*r*0.97,y+Math.sin(a)*r*0.97); g.stroke();}
}

/* ---------- sound buttons ---------- */
const sfx=CrackSound;
const sndBtns=[...document.querySelectorAll('.snd')];
try{if(localStorage.getItem('dsotc-sound')==='off') sfx.on=false;}catch(_){}
function syncSound(){
  for(const b of sndBtns){
    b.setAttribute('aria-pressed',String(sfx.on)); b.setAttribute('aria-label',sfx.on?'Sound on':'Sound off');
    const s=b.querySelector('span'); if(s) s.textContent=sfx.on?'Sound on':'Sound off';
  }
}
function toggleSound(){
  sfx.setOn(!sfx.on); syncSound();
  try{localStorage.setItem('dsotc-sound',sfx.on?'on':'off');}catch(_){}
  if(sfx.on){sfx.init(); sfx.click();}
}
for(const b of sndBtns){b.addEventListener('pointerdown',e=>e.stopPropagation()); b.addEventListener('click',e=>{toggleSound(); if(e.detail) b.blur();});}

/* ---------- full screen ---------- */
// Uses the Fullscreen API where it exists. Phones without it (iPhone) already get the whole window, so the buttons stay hidden there.
const gameEl=$('#game'), fsBtns=[...document.querySelectorAll('.fsb')];
const fsSupported=!!(gameEl.requestFullscreen||gameEl.webkitRequestFullscreen);
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
function syncFs(){
  const on=!!fsEl();
  for(const b of fsBtns){
    b.hidden=!fsSupported; b.setAttribute('aria-pressed',String(on));
    const s=b.querySelector('span'); if(s) s.textContent=on?'Exit full screen':'Full screen';
  }
}
function toggleFull(){
  if(!fsSupported) return;
  try{
    const r=fsEl()?(document.exitFullscreen||document.webkitExitFullscreen).call(document):(gameEl.requestFullscreen||gameEl.webkitRequestFullscreen).call(gameEl);
    if(r&&r.catch) r.catch(()=>{});
  }catch(_){}
}
for(const b of fsBtns){b.addEventListener('pointerdown',e=>e.stopPropagation()); b.addEventListener('click',e=>{toggleFull(); if(e.detail) b.blur();});}
document.addEventListener('fullscreenchange',syncFs);
document.addEventListener('webkitfullscreenchange',syncFs);

// keep the screen awake while walking
let wake=null;
function requestWake(){if(navigator.wakeLock&&!wake) navigator.wakeLock.request('screen').then(l=>{wake=l; l.addEventListener('release',()=>{wake=null;});}).catch(()=>{});}
function releaseWake(){if(wake){wake.release().catch(()=>{}); wake=null;}}

/* ---------- messages ---------- */
let msgQ=[], msgTimer=0;
function showMsg(m){
  msgM.textContent=m.a; msgS.textContent=m.b||''; msgS.hidden=!m.b; msgEl.classList.toggle('big',!!m.big);
  msgEl.classList.remove('show'); void msgEl.offsetWidth; msgEl.classList.add('show');
  clearTimeout(msgTimer);
  msgTimer=setTimeout(()=>{const n=msgQ.shift(); if(n) showMsg(n); else msgEl.classList.remove('show');},m.ms);
}
function say(a,b,ms,big){const m={a,b,ms:ms||1300,big}; if(msgEl.classList.contains('show')){msgQ.push(m); if(msgQ.length>2) msgQ.shift();} else showMsg(m);}
function sayNow(a,b,ms){msgQ=[]; showMsg({a,b,ms});}
function clearMsgs(){msgQ=[]; clearTimeout(msgTimer); msgEl.classList.remove('show');}

/* ---------- HUD ---------- */
const dist=()=>Math.max(0,Math.round(front.d-2.6));
const timeEl=$('#time'), stepsEl=$('#steps'), streakEl=$('#streak'), streakCell=$('#streakCell');
const giantBtn=$('#giant'), gcountEl=$('#gcount');
function fmtTime(s,tenths){
  const s10=Math.floor(Math.max(0,s)*10), m=Math.floor(s10/600), r10=s10-m*600, sec=Math.floor(r10/10);
  return `${m}:${String(sec).padStart(2,'0')}`+(tenths?`.${r10%10}`:'');
}
function pop(el){el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');}
function updateHUD(){
  const pips=$('#pips'); pips.textContent='';
  for(let j=0;j<MAXHP;j++){const s=document.createElement('span'); s.className='pip'+(j>=hp?' broken':''); pips.appendChild(s);}
  pips.setAttribute('aria-label',`Mom's back: ${Math.max(0,hp)} of ${MAXHP}`);
  $('#status').textContent=MOMTXT[Math.max(1,hp)];
  $('#ft').textContent=dist();
  $('#block').textContent=STAGES[stageOf(slabIdx(front.d))].name;
  stepsEl.textContent=steps;
  streakEl.textContent=streak;
  streakCell.classList.toggle('hot',streak>=5);
  syncGiant();
  camLabel();
}
function syncGiant(){gcountEl.textContent=giant; giantBtn.setAttribute('aria-pressed',String(armed)); giantBtn.disabled=giant<=0||mode!=='play';}

/* ---------- game state ---------- */
// mode: title (a demo walk runs behind the title) | play | paused | over
// phase: what the feet are doing: idle | swing | drop | over
let mode='title';
let phase='idle', feet=[], front=null, back=null, sw=null, drop=null, hp=MAXHP, steps=0, camD=0, bodyX=2.5, lastStage=0, hitFx=[], puffs=[], shake=0;
let streak=0, runStreak=0, giant=1, armed=false, tStart=null, tEnd=null, lastTs='', runResult=null;
let best=0, bestStreak=0, bestAtStart=0, bestStreakAtStart=0, newBestShown=false;
try{best=parseInt(localStorage.getItem('dsotc-best'),10)||0; bestStreak=parseInt(localStorage.getItem('dsotc-best-streak'),10)||0;}catch(_){}
const input={down:false,latch:0,id:null,key:null,lastX:0,keys:{l:false,r:false}};
let nextBird=0, nextBeat=0, nextAmbient=0, lastStepAt=0, idleTexted=false, pausedAt=0;
const elapsed=now=>tStart===null?0:((tEnd===null?now:tEnd)-tStart);

function reset(){
  seedBase=(Math.random()*1e9)|0; slabs.clear(); tiles.clear();
  feet=[{side:-1,x:1.95,d:1.4},{side:1,x:3.05,d:2.6}]; back=feet[0]; front=feet[1];
  slabs.set(-2,buildSlab(-2,seedBase+11,0)); slabs.set(-1,buildSlab(-1,seedBase+13,0));
  frontier=[{x:front.x,d:front.d},{x:back.x,d:back.d}]; genNext=0; ensureSlabs(4);
  stopWobble();
  phase='idle'; sw=null; drop=null; hp=MAXHP; steps=0; camD=front.d; bodyX=2.5; lastStage=0; hitFx=[]; puffs=[]; shake=0;
  streak=0; runStreak=0; giant=2; armed=false; tStart=null; tEnd=null; lastTs=''; timeEl.textContent='0:00';
  bestAtStart=best; bestStreakAtStart=bestStreak; newBestShown=false;
  input.latch=0; input.down=false; input.id=null; input.key=null;
  kinks=[]; curPose=clonePose(POSES[6]); camFlinch=0; xrayUntil=0; xrayJ=-1; clearTexts(); idleTexted=false;
  dadA.on=false; dogReset(); chatStats.mom=0;
  lastStepAt=performance.now()/1000; nextAmbient=lastStepAt+30; bot.active=false; bot.next=0; ambientReset(lastStepAt);
  sfx.wind(0);
  clearMsgs();
  updateHUD();
}
function kick(n){if(!reduceMotion) shake=Math.max(shake,n);}
function toggleGiant(){
  if(mode!=='play'||phase==='over') return;
  if(giant<=0){if(phase==='swing') sayNow('No giant steps left.','',900); return;}
  sfx.init();
  if(phase==='swing'&&!sw.giant){upgradeSwing(); return;}
  armed=!armed; syncGiant();
  if(armed){say('Mother, may I?','Yes, you may.',1100); sfx.arm();} else sfx.disarm();
}
// act on touch-down: while one thumb holds a foot, phones often never turn a second finger's tap into a click
giantBtn.addEventListener('pointerdown',e=>{e.stopPropagation(); e.preventDefault(); toggleGiant();});
giantBtn.addEventListener('click',e=>{if(!e.detail) toggleGiant();});

// The lifted foot is measured from the one still planted (sw.other).
// Feet keep to their own side: they never cross, and side by side they keep a gap.
function sideClamp(x,ahead){
  const o=sw.other, gap=Math.abs(ahead)<1.06?0.5:0.18;
  x=sw.foot.side<0?Math.min(x,o.x-gap):Math.max(x,o.x+gap);
  return clamp(x,R+0.05,WS-R-0.05);
}
function clampSw(){
  const o=sw.other;
  sw.x=clamp(sw.x,Math.max(R+0.05,o.x-sw.lat),Math.min(WS-R-0.05,o.x+sw.lat));
  sw.ex=sideClamp(sw.x,sw.ahead);
}
// the swing starts wherever the foot is, so a quick tap is a small shuffle step
function beginSwing(side,now){
  const f=side?feet.find(q=>q.side===side):back, other=f===feet[0]?feet[1]:feet[0];
  const g=armed&&giant>0&&mode==='play', dmax=g?GIANT.dmax:DMAX;
  const start=clamp(f.d-other.d,-1.3,dmax-0.4);
  phase='swing';
  sw={foot:f,other,t:0,u:0,start,dmin:DMIN,dmax,lat:g?GIANT.lat:LAT,giant:g,x:f.x,ex:f.x,ahead:start,tx:f.x,td:other.d+start,dx:f.x,dd:f.d,lift:0,warned:false,wob:0,stopWob:null};
  clampSw(); sfx.lift();
  if(mode==='play'&&tStart===null){tStart=now; momText(T.open);}
}
// tapping Giant step mid-swing turns this step into one, which also rescues a wobbling leg
function upgradeSwing(){
  const was=sw.wob>0;
  stopWobble();
  sw.giant=true; sw.dmax=GIANT.dmax; sw.lat=GIANT.lat; sw.start=sw.ahead; sw.t=0; sw.wob=0; sw.warned=false;
  armed=false; syncGiant();
  sayNow('Giant step!',was?'Saved yourself.':'Mother, may I? Yes.',1000); sfx.arm();
}
function stopWobble(){if(sw&&sw.stopWob){sw.stopWob(); sw.stopWob=null;}}
function plant(){
  stopWobble();
  drop={foot:sw.foot,x:sw.tx,d:sw.td,t:0,dur:0.08,fx:sw.dx,fd:sw.dd,fl:sw.lift,giant:sw.giant};
  if(sw.giant){giant--; armed=false; syncGiant();}
  phase='drop';
}
// Held through the wobble: the foot goes back where it came from and the streak resets
function snapBack(){
  stopWobble();
  const f=sw.foot;
  drop={foot:f,x:f.x,d:f.d,t:0,dur:0.16,fx:sw.dx,fd:sw.dd,fl:sw.lift,snap:true};
  phase='drop';
  const had=streak; streak=0; updateHUD();
  sayNow('Overreached.',had>=3?`Snapped back. Streak of ${had} gone.`:'Snapped back.',1200);
  sfx.snap(); kick(7); camFlinch=0.6;
  momText(T.snap,{chance:0.7});
}
function land(now){
  if(drop.snap){phase='idle'; puffs.push({x:drop.x,d:drop.d,t:now,r:Math.random()*6,s:0.7}); sfx.step(); return;}
  const f=drop.foot; f.x=drop.x; f.d=drop.d; phase='idle';
  if(feet[0].d>=feet[1].d){front=feet[0]; back=feet[1];} else {front=feet[1]; back=feet[0];}
  puffs.push({x:f.x,d:f.d,t:now,r:Math.random()*6,s:drop.giant?2:1});
  if(mode!=='play') return;                       // the title screen's demo walk counts nothing
  steps++;
  const ay=f.d-0.5+R, by=f.d+0.5-R;
  const near=slabsNear(f.d), hits=footHits(f.x,f.d,near);
  let got=false, leafy=false, gum=false;
  for(const sl of near){
    const cp=sl.coupon; if(cp&&!cp.taken&&psd(cp.x,cp.d,f.x,ay,f.x,by)<R+0.24){cp.taken=true; cp.tt=now; got=true;}
    for(const L of sl.leaves.concat(sl.fallen||[])) if(psd(L.x,L.d,f.x,ay,f.x,by)<R+L.s*0.35){leafy=true; break;}
    for(const gm of sl.gum) if(psd(gm.x,gm.d,f.x,ay,f.x,by)<R+gm.r){gum=true; break;}
  }
  if(drop.giant){sfx.giantLand(); kick(5);}
  if(hits.length){
    hp--; streak=0; for(const h of hits) hitFx.push({c:h.c,h:h.h,t:now});
    const kind=hits.some(h=>h.h)?'hole':hits.some(h=>h.c&&h.c.kind==='line')?'line':'crack';
    const m={crack:['Crack.',"Mom's back."],line:['Line.',"Mom's spine."],hole:['Pothole.',"Mom's whole back."]}[kind];
    sayNow(m[0],m[1],1100); kick(10);
    const vj=breakVertebra(now); sfx.static();
    if(kind==='hole') sfx.gravel(); else sfx.crack(kind);
    if(hp>0){
      sfx.ow((MAXHP-1-hp)/(MAXHP-2));
      const r=Math.random();
      if(kind!=='crack'&&r<0.5) momText(T[kind],{urgent:true});
      else if(r<0.62||vj<0) momText(T.hit[hp],{urgent:true});
      else momText(pick(T.vert).replace('{v}',VERT[vj]),{urgent:true});
    }
  } else {
    if(!drop.giant){
      if(leafy){sfx.leaves(); momText(T.leaf,{chance:0.08});}
      else if(gum){sfx.gum(); if(!got) say('Gum.','',700); momText(T.gum,{chance:0.6});}
      else sfx.step();
    } else momText(T.giant,{chance:0.6});
    if(footHits(f.x,f.d,near,0.1).length){camFlinch=Math.max(camFlinch,0.55); momText(T.near,{chance:0.35});}
    streak++; if(streak>runStreak) runStreak=streak;
    if(streak%STREAK_EVERY===0){
      // clean streaks fix Mom: Dad walks on her back. If she's already fine, you get a giant step
      pop(streakEl); sfx.earn();
      if(hp<MAXHP&&!dadA.on){startDad(); say(`${streak} clean.`,'Dad is on his way.',1300);}
      else if(giant<GIANT_MAX){giant++; say('Giant step earned.',`${streak} clean in a row.`,1500); momText(T.streak,{chance:0.5});}
      else say(`${streak} clean.`,'Giant steps full.',1200);
    } else if(streak%5===0){pop(streakEl); sfx.chime(streak/5);}
  }
  if(got&&hp>0){momText(T.coupon); if(hp<MAXHP){hp++; kinks.pop(); say('Chiropractor coupon.','Mom unfolds a notch.',1500);} else say('Chiropractor coupon.',"Mom's fine. You keep it.",1300); sfx.paper();}
  updateHUD();
  lastStepAt=now; idleTexted=false;
  if(hp<=0){gameOver(now); return;}
  const st=stageOf(slabIdx(front.d));
  if(st>lastStage){lastStage=st; say(STAGES[st].name,STAGES[st].note,2000,true); sfx.car(); sfx.wind(st); momText(T.stage[st]);}
  if(!newBestShown&&bestAtStart>0&&dist()>bestAtStart){newBestShown=true; say('New best.','Keep walking.',1400); sfx.newbest();}
}
function gameOver(now){
  phase='over'; mode='over'; msgQ=[]; tEnd=now; armed=false; dadA.on=false; syncGiant(); kinks.length<6&&breakVertebra(now); xrayUntil=0; clearTexts(); releaseWake();
  const ft=dist();
  runResult={ft,time:elapsed(now),steps,streak:runStreak,block:STAGES[stageOf(slabIdx(front.d))].name,
    ftBest:ft>bestAtStart&&ft>0, stBest:runStreak>bestStreakAtStart&&runStreak>0};
  if(ft>best){best=ft; try{localStorage.setItem('dsotc-best',String(best));}catch(_){}}
  if(runStreak>bestStreak){bestStreak=runStreak; try{localStorage.setItem('dsotc-best-streak',String(bestStreak));}catch(_){}}
  setTimeout(showOver,700);
}
function countUp(el,to,fmt,badge){
  const done=()=>{el.textContent=fmt(to); if(badge){const b=document.createElement('span'); b.className='nb'; b.textContent='best'; el.appendChild(b);}};
  if(reduceMotion||to<=0){done(); return;}
  const t0=performance.now(), dur=800;
  (function tick(t){const k=Math.min(1,Math.max(0,(t-t0)/dur)), e=1-Math.pow(1-k,3); el.textContent=fmt(to*e); if(k<1) requestAnimationFrame(tick); else done();})(t0);
}
function showOver(){
  if(mode!=='over') return;
  clearMsgs();
  overEl.hidden=false; phoneEl.classList.add('ringing'); callerEl.textContent='Mom'; callingEl.hidden=false; afterEl.hidden=true;
  sfx.ring();
  setTimeout(()=>{
    if(mode!=='over') return;
    const r=runResult;
    phoneEl.classList.remove('ringing'); callerEl.textContent='…Mom?'; callingEl.hidden=true; sfx.click();
    $('#line').textContent=ENDINGS[(Math.random()*ENDINGS.length)|0];
    afterEl.hidden=false;
    const av=$('#avatar'), dpa=Math.min(2,window.devicePixelRatio||1); av.width=av.height=Math.round(72*dpa);
    av.getContext('2d').drawImage(camCv,0,0,camCv.width,camCv.height,0,0,av.width,av.height);
    countUp($('#sFt'),r.ft,v=>Math.round(v)+' ft',r.ftBest);
    countUp($('#sTime'),r.time,v=>fmtTime(v,true),false);
    countUp($('#sSteps'),r.steps,v=>String(Math.round(v)),false);
    countUp($('#sStreak'),r.streak,v=>String(Math.round(v)),r.stBest);
    $('#sMeta').textContent=`Made it to ${r.block}. Best walk ${best} ft, best streak ${bestStreak}.`;
    const times=n=>n===1?'once':`${n} times`;
    $('#sChat').textContent=chatStats.mom?`Mom texted you ${times(chatStats.mom)}.`:'';
    if(r.ftBest||r.stBest) setTimeout(()=>sfx.newbest(),reduceMotion?0:820);
    try{$('#again').focus({preventScroll:true});}catch(_){}
  },reduceMotion?400:1500);
}

/* ---------- screens: title, pause ---------- */
const titleEl=$('#title'), pauseEl=$('#pause'), tcamCv=$('#tcam'), tcamCtx=tcamCv.getContext('2d'), tBest=$('#tBest');
function showScreen(el,on){
  if(on){el.hidden=false; void el.offsetWidth; el.classList.remove('fade');}
  else {el.classList.add('fade'); setTimeout(()=>{if(el.classList.contains('fade')) el.hidden=true;},reduceMotion?0:360);}
}
function syncBest(){
  if(best>0||bestStreak>0){tBest.hidden=false; tBest.innerHTML=`Best walk <b>${best} ft</b> · best streak <b>${bestStreak}</b>`;}
  else tBest.hidden=true;
}
function goTitle(){
  mode='title'; sfx.quiet=true;
  overEl.hidden=true; pauseEl.hidden=true;
  reset();
  view.classList.add('titling');
  titleEl.classList.remove('intro'); void titleEl.offsetWidth; titleEl.classList.add('intro');
  showScreen(titleEl,true); syncBest(); releaseWake();
}
function startGame(){
  sfx.init(); sfx.quiet=false; sfx.start();
  overEl.hidden=true; showScreen(pauseEl,false);
  if(!titleEl.hidden) showScreen(titleEl,false);
  reset(); mode='play'; syncGiant();
  view.classList.remove('titling');
  requestWake();
}
function pauseGame(){
  if(mode!=='play') return;
  mode='paused'; pausedAt=performance.now()/1000;
  input.down=false; input.id=null; input.key=null; input.latch=0;
  if(phase==='swing'){stopWobble(); phase='idle'; sw=null;}   // a lifted foot just goes back down
  sfx.click(); showScreen(pauseEl,true); releaseWake();
}
function resumeGame(){
  if(mode!=='paused') return;
  const away=performance.now()/1000-pausedAt;
  if(tStart!==null) tStart+=away;
  lastStepAt+=away; nextAmbient+=away;
  mode='play'; sfx.click(); showScreen(pauseEl,false); requestWake();
}
$('#start').addEventListener('click',startGame);
$('#pauseBtn').addEventListener('pointerdown',e=>e.stopPropagation());
$('#pauseBtn').addEventListener('click',e=>{pauseGame(); if(e.detail) e.currentTarget.blur();});
$('#resume').addEventListener('click',resumeGame);
$('#restart').addEventListener('click',startGame);
$('#toTitle').addEventListener('click',()=>{sfx.click(); goTitle();});
$('#again').addEventListener('click',startGame);
$('#overTitle').addEventListener('click',()=>{sfx.click(); goTitle();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(mode==='play') pauseGame(); if(sfx.c) sfx.c.suspend().catch(()=>{});}
  else if(sfx.c) sfx.c.resume().catch(()=>{});
});

// chalk texture for the title lettering: white with speckles and short streaks knocked out
function makeChalkMask(){
  const n=180, c=document.createElement('canvas'); c.width=c.height=n;
  const g=c.getContext('2d'), r=mulberry32(77);
  g.fillStyle='#fff'; g.fillRect(0,0,n,n); g.globalCompositeOperation='destination-out';
  for(let i=0;i<1500;i++){g.fillStyle=`rgba(0,0,0,${(0.25+r()*0.75).toFixed(2)})`; const s=0.6+r()*1.8; g.fillRect(r()*n,r()*n,s,s*(0.6+r()));}
  g.lineWidth=0.7;
  for(let i=0;i<50;i++){g.strokeStyle=`rgba(0,0,0,${(0.15+r()*0.3).toFixed(2)})`; const x=r()*n, y=r()*n; g.beginPath(); g.moveTo(x,y); g.lineTo(x+(r()-0.5)*34,y+(r()-0.5)*6); g.stroke();}
  document.documentElement.style.setProperty('--chalk-mask',`url(${c.toDataURL()})`);
}

/* ---------- the title screen's demo walk: picks crack-free spots and steps on them ---------- */
const bot={next:0,tx:0,ta:0,active:false};
function botUpdate(now){
  if(phase==='idle'&&!bot.active&&now>bot.next){
    const f=back, other=front, side=f.side;
    let pickd=null;
    for(let i=0;i<48;i++){
      const ahead=0.95+Math.random()*1.05;
      const x=clamp(other.x+side*(0.6+Math.random()*0.45)+(Math.random()-0.5)*0.3,R+0.15,WS-R-0.15), d=other.d+ahead;
      if(footHits(x,d,slabsNear(d),0.07).length) continue;
      const score=Math.abs(x-2.5)*0.25+Math.abs(ahead-1.45)+Math.random()*0.2;
      if(!pickd||score<pickd.score) pickd={x,ahead,score};
    }
    if(!pickd) pickd={x:clamp(other.x+side*0.7,R+0.15,WS-R-0.15),ahead:0.95};
    bot.tx=pickd.x; bot.ta=pickd.ahead; bot.active=true;
    input.latch=side; input.down=true;
  }
  if(phase==='swing'&&bot.active){
    sw.x=bot.tx;
    if(sw.ahead>=bot.ta-0.01){input.down=false; bot.active=false; bot.next=now+0.35+Math.random()*0.45;}
  }
}

/* ---------- input ---------- */
view.addEventListener('pointerdown',e=>{
  if(mode!=='play'||e.target.closest('button')||e.target.closest('.screen')||e.target.closest('#over')) return;
  if(e.pointerType==='mouse'&&e.button!==0) return;
  // a second finger while a foot is in the air: giant step, which also saves a wobbling leg
  if(input.id!==null&&e.pointerId!==input.id){if(phase==='swing') toggleGiant(); e.preventDefault(); return;}
  if(input.id!==null||input.key) return;
  sfx.init();
  const rect=view.getBoundingClientRect();
  input.id=e.pointerId; input.lastX=e.clientX; input.down=true;
  input.latch=(e.clientX-rect.left)<rect.width/2?-1:1;
  try{view.setPointerCapture(e.pointerId);}catch(_){}
  e.preventDefault();
});
view.addEventListener('pointermove',e=>{
  if(e.pointerId!==input.id) return;
  const dx=e.clientX-input.lastX; input.lastX=e.clientX;
  if(phase==='swing'&&mode==='play') sw.x+=dx/K*1.25;
});
const up=e=>{if(e.pointerId!==input.id) return; input.id=null; input.down=false;};
view.addEventListener('pointerup',up); view.addEventListener('pointercancel',up);
view.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{
  const k=e.code, t=e.target, onBtn=t&&t.closest&&t.closest('button,a');
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(k==='KeyM'&&!e.repeat){toggleSound(); return;}
  if(k==='KeyF'&&!e.repeat){toggleFull(); return;}
  if((k==='Escape'||k==='KeyP')&&!e.repeat){if(mode==='play') pauseGame(); else if(mode==='paused') resumeGame(); return;}
  if((k==='Space'||k==='Enter')&&onBtn) return;
  if(mode==='title'){if((k==='Space'||k==='Enter')&&!e.repeat){e.preventDefault(); startGame();} return;}
  if(mode==='over'){if(k==='Enter'&&!afterEl.hidden) startGame(); return;}
  if(mode!=='play') return;
  if((k==='KeyG'||k==='ShiftLeft'||k==='ShiftRight')&&!e.repeat){toggleGiant(); return;}
  const footKey={KeyA:-1,KeyD:1,Space:0,KeyW:0,ArrowUp:0}[k];
  if(footKey!==undefined){
    e.preventDefault();
    if(e.repeat||input.key||input.id!==null) return;
    sfx.init(); input.key=k; input.down=true; input.latch=footKey||back.side;
  }
  else if(k==='ArrowLeft'){e.preventDefault(); input.keys.l=true;}
  else if(k==='ArrowRight'){e.preventDefault(); input.keys.r=true;}
});
window.addEventListener('keyup',e=>{
  const k=e.code;
  if(k===input.key){input.key=null; input.down=false;}
  else if(k==='ArrowLeft') input.keys.l=false;
  else if(k==='ArrowRight') input.keys.r=false;
});
window.addEventListener('blur',()=>{input.down=false; input.id=null; input.key=null; input.keys.l=input.keys.r=false;});

/* ---------- loop ---------- */
function update(dt,now){
  if(mode==='paused'){if(camFlinch>0) camFlinch=Math.max(0,camFlinch-dt*2.2); return;}
  if(mode==='title') botUpdate(now);
  ambientUpdate(dt,now); dadUpdate(dt); dogUpdate(dt,now);
  if(phase==='idle'&&input.latch){const s=input.latch; input.latch=0; beginSwing(s,now);}
  if(phase==='swing'){
    const speed=(sw.dmax-sw.dmin)/(swingTime(slabIdx(front.d))*(sw.giant?1.3:1));
    sw.t+=dt;
    const tReach=(sw.dmax-sw.start)/speed;
    sw.ahead=Math.min(sw.dmax,sw.start+speed*sw.t); sw.u=(sw.ahead-sw.dmin)/(sw.dmax-sw.dmin);
    if(sw.u>=0.8&&!sw.warned){sw.warned=true; sfx.strain();}
    const kd=(input.keys.r?1:0)-(input.keys.l?1:0); if(kd) sw.x+=kd*2.6*dt;
    clampSw();
    let tx=sw.ex, td=sw.other.d+sw.ahead;
    if(sw.t>tReach+0.08){            // past full reach: the leg wobbles, landing gets shaky
      if(!sw.wob) sw.stopWob=sfx.wobble(WOB);
      sw.wob=sw.t-tReach-0.08+1e-6;
      const k=Math.min(1,sw.wob/WOB);
      tx=sideClamp(sw.ex+Math.sin(sw.wob*28)*(0.15+0.5*k),sw.ahead);
      td+=Math.sin(sw.wob*19+1)*0.14*k;
      if(!reduceMotion) shake=Math.max(shake,1.2+2*k);
    }
    sw.tx=tx; sw.td=td;
    const k1=1-Math.exp(-dt*(sw.wob?34:26)), k2=1-Math.exp(-dt*18);
    sw.dx+=(tx-sw.dx)*k1; sw.dd+=(td-sw.dd)*k1; sw.lift+=(1-sw.lift)*k2;
    if(!input.down) plant(); else if(sw.wob>WOB) snapBack();
  } else if(phase==='drop'){
    drop.t+=dt; if(drop.t>=drop.dur) land(now);
  }
  if(tStart!==null&&mode==='play'){const ts=fmtTime(elapsed(now)); if(ts!==lastTs){lastTs=ts; timeEl.textContent=ts;}}
  camD+=(front.d-camD)*(1-Math.exp(-dt*11));
  let sx=0; for(const f of feet){sx+=phase==='swing'&&f===sw.foot?sw.tx:phase==='drop'&&f===drop.foot?drop.x:f.x;}
  bodyX+=(sx/feet.length-bodyX)*(1-Math.exp(-dt*5));
  ensureSlabs(slabIdx(camD+yAnchor/K)+1);
  {const nx=slabs.get(slabIdx(camD+yAnchor/K)+1); if(nx&&!tiles.has(nx.i)) getTile(nx);}
  const keep=slabIdx(camD-(Hc-yAnchor)/K)-2;
  for(const k of [...slabs.keys()]) if(k<keep) slabs.delete(k);
  for(const k of [...tiles.keys()]) if(k<keep) tiles.delete(k);
  shake*=Math.exp(-dt*12);
  if(camFlinch>0) camFlinch=Math.max(0,camFlinch-dt*2.2);
  if(sfx.c&&mode!=='over'&&now>nextBird){nextBird=now+3+Math.random()*6+lastStage*1.5; sfx.bird();}
  if(mode==='play'){
    if(hp===1&&now>nextBeat){nextBeat=now+0.9; sfx.heartbeat();}
    if(phase==='idle'&&steps>0&&!idleTexted&&now-lastStepAt>7){idleTexted=true; momText(T.idle);}
    if(steps>0&&now>nextAmbient){nextAmbient=now+25+Math.random()*20; if(now-lastTextAt>8) momText(T.ambient);}
  }
}
function render(now){
  ctx.setTransform(dpr,0,0,dpr,0,0);                    // the tiles cover the whole canvas, so no clear needed
  if(shake>0.3) ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake*0.6);
  const lo=slabIdx(camD-(Hc-yAnchor)/K), hi=slabIdx(camD+yAnchor/K);
  for(let i=hi;i>=lo;i--){const sl=slabs.get(i); if(!sl) continue; const c=getTile(sl); ctx.drawImage(c,0,Y((i+1)*S),Wc,c.height/dpr);}
  drawFallen(lo,hi); drawAnts(now,lo,hi);
  drawCoupons(now,lo,hi); drawHitFx(now); drawShadows(now,lo-1,hi+1); drawPuffs(now); drawSquirrel(); drawDog(now); drawFeet();
  drawFalling(); drawCloud(); drawDogDanger();
  drawCam(now);
}
let lastT=performance.now();
function frame(t){
  const now=t/1000, dt=Math.min(0.05,Math.max(0,(t-lastT)/1000)); lastT=t;
  update(dt,now); render(now);
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
if(!coarse){
  $('#howMove').innerHTML='Hold <b>A</b> or <b>D</b> (or either half of the screen) to lift that foot, let go to step. A quick tap is a little shuffle. Steer with the arrow keys or the mouse.';
  $('#howGiant').innerHTML="Dawdle and the Kowalskis' chihuahua comes for your heels. Overreach and your leg wobbles: press <b>G</b> for a <b>giant step</b> to save it.";
  const li=document.createElement('li'); li.innerHTML='<i class="dot" style="background:rgba(243,239,230,.35)"></i><span>G giant step · Esc pauses · F full screen · M sound</span>';
  $('.t-how').appendChild(li);
}
makeChalkMask(); syncSound(); syncFs();
let rz=0; window.addEventListener('resize',()=>{clearTimeout(rz); rz=setTimeout(layout,120);});
layout(); goTitle();
if(document.fonts&&document.fonts.load){
  Promise.race([
    Promise.all([document.fonts.load('700 40px "Cabin Sketch"'),document.fonts.load('40px "Schoolbell"'),document.fonts.load('700 20px "Atkinson Hyperlegible"'),document.fonts.load('600 10px "IBM Plex Mono"')]),
    new Promise(r=>setTimeout(r,2500))
  ]).then(()=>tiles.clear(),()=>{});
}
requestAnimationFrame(frame);
