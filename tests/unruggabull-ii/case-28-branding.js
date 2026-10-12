// Brand text and pixel-font bounds; IDs and run mechanics stay unchanged.
(function () {
  const check=(ok,msg)=>{if(!ok)throw new Error(msg);};
  RUN.force=42;newRun();setState('title');showCard('title');
  check(floor.id==='floor13'&&cardTitle.textContent==='The 13th Floor: Accounting','brand title, stable floor id');
  check(cardText.textContent.includes('on the 13th Floor'),'brand title help');
  check(document.title.includes('the 13th Floor'),'brand page title');
  for(const selector of ['meta[name="description"]','meta[property="og:title"]','meta[property="og:description"]','meta[name="twitter:title"]','meta[name="twitter:description"]'])check(document.querySelector(selector).content.includes('the 13th Floor'),'brand metadata '+selector);
  check(STORY.some(line=>line.includes('the 13th Floor')),'brand crawl');
  check(STORY[0].includes('thirteen seconds'),'garage-door duration is not a floor name');
  setState('play');floor.opening();
  check(R.banner.text==='THE 13TH FLOOR'&&textWidth(R.banner.text)*2<=W-8,'opening brand fits at existing size');
  check(liveEl.textContent.includes('The 13th Floor'),'brand live opening');
  for(const key of ['start','clear']){
    const line=LINES[key];check(line.startsWith('THE 13TH FLOOR'),'brand spoken line '+key);
    const rows=[];for(const word of line.split(' ')){const last=rows.length-1;if(last>=0&&(rows[last]+' '+word).length<=15)rows[last]+=' '+word;else rows.push(word);}
    check(rows[0].startsWith('THE 13TH FLOOR')&&Math.max(...rows.map(textWidth))+8<=W-4,'brand caption stays whole and fits');
  }
  const details=floor.clearCard({newBest:false}, {souls:0,time:0}, String);
  check(details.title==='The 13th Floor clear','brand clear card');
  check(textWidth('THE 13TH FLOOR CLEAR')*2<=W-8,'clear banner fits at existing size');
  for(let i=0;i<STAGES.length;i++)check(STAGES[i].startsWith('the 13th Floor: '),'brand play-stats labels');
  check(runReport().stats.stage_name==='the 13th Floor: Accounts Payable','report sends branded stage name');
  RUN.force=null;newRun();setState('title');showCard('title');
})();
