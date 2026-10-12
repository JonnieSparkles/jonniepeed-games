(function () {
  'use strict';
  const sound = window.UnrugSound, byId = id => document.getElementById(id);
  let timers = [], rate = 1, runningArc = false;
  const later = (fn, seconds) => timers.push(setTimeout(fn, seconds * 1000));
  function cancel() { timers.forEach(clearTimeout); timers = []; runningArc = false; }
  function unlock() { sound.init(); }
  function checkStems(names) { document.querySelectorAll('#stems input').forEach(el => { el.checked = names.includes(el.value); }); }
  function cue(name, delayed = false) {
    if (!delayed) cancel(); unlock();
    if (name !== 'dawn') sound.roofSound({ storm: true });
    if (name === 'bells') { sound.play('bell', 0); later(() => sound.play('bell', 1), 1.5); later(() => sound.play('bell', 2), 3); }
    else if (name === 'flood') {
      // As in the roof: the souls rush in on a climbing scale, then the pinch sweep (the game spreads them over its flood).
      sound.roofCue('flood'); for (let i = 0; i < 12; i++) later(() => sound.play('rush', i), .6 + i * .055); later(() => sound.play('pinch', 1), 1.3);
    }
    else if (name === 'fusion') { sound.play('beam'); sound.roofSound({ storm: true, beam: true, onEye: true }); later(() => sound.roofCue('fusion', {candidate:byId('choice').value}), .14); checkStems(['drums','bass','lead','harmony','power','heavy']); }
    else {
      sound.roofCue(name, {candidate:byId('choice').value, seconds:name==='one'?3:4});
      if (name === 'dawn') sound.roofSound(null);
      if (name === 'fight') checkStems(['drums','bass','lead']);
      if (name === 'round2') checkStems(['drums','bass','lead','harmony']);
      if (name === 'round3') checkStems(['drums','bass','lead','harmony','power']);
    }
  }
  for (const name of ['drums','bass','lead','harmony','power','heavy']) {
    const label = document.createElement('label'), input = document.createElement('input'); input.type='checkbox';input.value=name;input.checked=['drums','bass','lead'].includes(name);
    label.append(input, document.createTextNode(name)); byId('stems').append(label);
    input.addEventListener('change', () => { unlock(); sound.stems([...document.querySelectorAll('#stems input:checked')].map(el=>el.value)); });
  }
  document.querySelectorAll('[data-track]').forEach(button => button.addEventListener('click', () => {
    cancel();unlock();byId('choice').value=button.dataset.choice;sound.roofSound(null);
    const heavy=button.dataset.track.endsWith('Heavy'), stems=heavy?['drums','bass','lead','harmony','power','heavy']:['drums','bass','lead','harmony','power'];
    sound.music(button.dataset.track,{boundary:byId('boundary').value,slam:byId('boundary').value==='now',stems});checkStems(stems);
  }));
  document.querySelectorAll('[data-cue]').forEach(button=>button.addEventListener('click',()=>cue(button.dataset.cue)));
  for(const id of ['theme','tower','staff','dark','copy','shred']) {
    const button=document.createElement('button');button.textContent=id;byId('legacy').append(button);
    button.addEventListener('click',()=>{cancel();unlock();sound.roofSound(null);sound.music(id,{boundary:byId('boundary').value,slam:byId('boundary').value==='now'});sound.tempo(1);});
  }
  function tempo(value){unlock();rate=Math.max(.5,Math.min(2,value));sound.tempo(rate);byId('tempo').textContent=rate.toFixed(2)+'×';}
  byId('slower').onclick=()=>tempo(rate-.05);byId('faster').onclick=()=>tempo(rate+.05);byId('resetTempo').onclick=()=>tempo(1);
  byId('mute').onclick=()=>{unlock();sound.toggle();byId('mute').textContent=sound.muted?'Unmute':'Mute';};
  byId('stop').onclick=()=>{cancel();unlock();sound.music(null,{hard:true});sound.roofSound(null);};
  byId('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();};
  byId('arc').onclick=()=>{
    cancel();runningArc=true;cue('lead',true);
    for(const [at,name] of [[2,'fight'],[10,'round2'],[18,'round3'],[25,'spool'],[26,'cut'],[28,'quiet'],[30,'bells'],[35,'flood'],[39,'fusion'],[48,'one'],[51,'dawn']])later(()=>cue(name,true),at);
    later(()=>{sound.music(null,{hard:true});sound.roofSound(null);runningArc=false;},58);
  };
  setInterval(()=>{
    const state=sound.musicState, text=(runningArc?'Arc · ':'')+(state.playing||'No music')+(state.pending?' → '+state.pending:'')+' · '+state.stems.join(', ')+(state.nextStems?' · next bar: '+state.nextStems.join(', '):'')+(sound.muted?' · muted':'');
    if(byId('status').textContent!==text)byId('status').textContent=text;
  },250);
})();
