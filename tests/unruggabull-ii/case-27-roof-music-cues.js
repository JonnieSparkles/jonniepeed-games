(function(){
  const check=(ok,msg)=>{if(!ok)throw new Error(msg);},old=Snd.roofCue,url=location.href;
  const tick=s=>{for(let i=0;i<Math.ceil(s*60);i++)update(1/60);};let cues=[];
  Snd.roofCue=(name,options)=>{cues.push({name,options});old(name,options);};
  try{
    for(const choice of ['a','b','c']){
      history.replaceState(null,'','#stage=roof&music='+choice);newRun(null,'roof');setState('play');clearHeld();
      floor.enter('round1');check(Snd.track==='roof'+choice.toUpperCase(),'hash chooses actual fight music');
      floor.enter('round2');floor.enter('round3');
      check(cues.some(c=>c.name==='round2')&&cues.some(c=>c.name==='round3'),'rounds add layers');
      floor.enter('reset');const total=R.talk.total;
      tick(R.talk.times[R.talk.text.length-1]+.02);
      check(Snd.track===null&&!R.roof.silenced,'last word of the reset cuts music without moving its timer');
      tick(total);floor.enter('flood');R.roof.cut=null;
      check(cues.some(c=>c.name==='flood'&&c.options.seconds===4),'riser spans flood and pinch');
      floor.enter('fusion');cues=[];tick(.1);
      check(!cues.some(c=>c.name==='fusion'),'heavy waits until the fusion freeze ends');
      tick(.1);check(cues.some(c=>c.name==='fusion')&&Snd.track==='roof'+choice.toUpperCase()+'Heavy','freeze end slams selected heavy downbeat');
      R.roof.cut=null;floor.enter('one');check(Snd.track===null,'one percent stops the heavy transport');
      floor.enter('snap');check(Snd.track===null,'the snap leaves no looping track');
      floor.enter('dawn');check(Snd.track==='ending','the dawn starts the ending\'s music (one piece to the dead eye, then a silent bar)');
    }
  }finally{Snd.roofCue=old;history.replaceState(null,'',url);emitHook=null;RUN.force=null;checkpoint=null;newRun();setState('title');showCard('title');}
})();
