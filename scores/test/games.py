"""Local UI integration checks. Requires Playwright and a running Worker/site server."""
import os
import re
import tempfile
import base64
import hashlib
import hmac
import http.client
import json
import secrets
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlencode, parse_qs, urlunsplit
from playwright.sync_api import sync_playwright

ARTIFACTS=Path(os.environ.get('SCREENSHOTS', tempfile.mkdtemp(prefix='jpg-boards-')))
ARTIFACTS.mkdir(parents=True, exist_ok=True)
# The local Worker runs with `--var RUN_SECRET:local-dev-only`, so the test can sign backdated run tokens.
SECRET=os.environ.get('RUN_SECRET','local-dev-only')

def forge(game, board, age=3600):
    run_id=str(uuid.uuid4()); issued=int(time.time()*1000)-age*1000
    sig=hmac.new(SECRET.encode(),f'{game}|{board}|{run_id}|{issued}'.encode(),hashlib.sha256).digest()
    return f"{run_id}.{issued}.{base64.urlsafe_b64encode(sig).rstrip(b'=').decode()}"

def any_ip():
    # Locally each request can claim its own connection, so the rate limit stays out of the way.
    return f'10.{secrets.randbelow(256)}.{secrets.randbelow(256)}.{1+secrets.randbelow(254)}'

def api(path, payload=None):
    c=http.client.HTTPConnection('127.0.0.1',8787, timeout=10)
    c.request('POST' if payload else 'GET',path,body=json.dumps(payload) if payload else None,headers={'Content-Type':'application/json','cf-connecting-ip':any_ip()})
    r=c.getresponse(); data=json.loads(r.read()); assert r.status==200,(r.status,data); c.close(); return data

def seed(game, board):
    for i in range(50):
        api('/v2/submit',{'game':game,'board':board,'token':forge(game,board),'name':'BOT','score':2000+i,'input':'keys','meta':{'time_ms':2000000}})

def finish(page, game, score):
    # Each finished run lasted 2,000 s, so the scores used here are under each board's cap.
    if game=='thimbleful':
        page.evaluate('(s)=>{score=s; el=2000; end();}',score)
    else:
        page.evaluate('(s)=>{front.d=s+2.6; tStart=performance.now()/1000-2000; gameOver(performance.now()/1000);}',score)
        page.locator('#after').wait_for(state='visible')

def picker(page, game):
    # Thimbleful asks first ("New high score! You're #N", Enter initials / Skip) and keeps Play again hidden until you choose
    if game=='thimbleful':
        page.locator('#lbEnter').wait_for()
        assert page.locator('.lb-entry').count()==0 and page.locator('#go').is_hidden()
        page.locator('#lbEnter').click()
    page.locator('.lb-entry').wait_for()

def start(page, game):
    if game=='thimbleful':
        page.evaluate('introSeen=true; start();')
    else: page.evaluate('startGame();')

def title_scores(page, game, size, label):
    # The title screen can show the board without starting a run, and nothing under the buttons moves.
    assert page.evaluate('lbRun')is None
    btn=page.locator('#scoresBtn'); btn.wait_for(state='visible')
    if game=='thimbleful':
        go=page.locator('#go'); pos=lambda: go.evaluate('(e)=>{const r=e.getBoundingClientRect(); return [r.left+scrollX, r.top+scrollY, r.width, r.height]}'); before=pos()
        btn.click(); page.locator('#board .lb-table').wait_for()
        assert page.locator('#board .lb-table tbody tr').count()==10
        assert pos()==before,(label,before,pos()); assert btn.inner_text()=='Hide scores'
        page.evaluate('setFull(true)')   # in full screen the card has to fit the screen (scrolling inside); inline, the page scrolls
        box=page.locator('.card').bounding_box()
        assert box['y']>=-1 and box['y']+box['height']<=size['height']+1,(label,box,size)
        page.evaluate('setFull(false)')
        btn.click(); assert page.locator('#board').is_hidden() and btn.inner_text()=='High scores'
    else:
        btn.click(); page.locator('#titleBoard .lb-table').wait_for()
        assert page.locator('#titleBoard .lb-table tbody tr').count()==10
        page.evaluate('document.activeElement.blur()')   # Enter on the focused Back button would just press Back
        page.keyboard.press('Enter'); assert page.evaluate('mode')=='title'   # Enter must not start the game under the list
        page.get_by_role('button',name=re.compile(r'^See all \d+$')).click()
        assert page.locator('#titleBoard .lb-table tbody tr').count()==50
        top=page.locator('#scores .card').evaluate('(e)=>e.offsetTop')
        assert top>=0,(label,top)                                # the screen scrolls when the card is taller than the window; the top is never cut off
        page.locator('#scoresBack').scroll_into_view_if_needed(); back=page.locator('#scoresBack').bounding_box()
        assert back['y']>=0 and back['y']+back['height']<=size['height']+1,(label,back,size)
        page.keyboard.press('Escape'); page.locator('#scores').wait_for(state='hidden')
        assert page.evaluate('mode')=='title'

def suite(page, game, size, label):
    board=-secrets.randbelow(2**45)-1
    seed(game,board)
    # 'start' False refuses run tokens (Worker down at run start). 'sign' False sends the game's own token,
    # which the Worker refuses because these runs claim 2,000 s of play.
    api_mode={'start':True,'sign':True}
    def route(r):
        u=urlsplit(r.request.url)
        headers={**r.request.headers,'cf-connecting-ip':any_ip()}
        if u.path=='/v2/start' and not api_mode['start']:
            r.fulfill(status=503,content_type='application/json',body='{"ok":false,"error":"unavailable"}'); return
        if r.request.method=='POST':
            d=json.loads(r.request.post_data); d['board']=board
            if u.path=='/v2/submit' and api_mode['sign']: d['token']=forge(d['game'],board)
            response=r.fetch(post_data=json.dumps(d),headers=headers); r.fulfill(response=response)
        else:
            q=parse_qs(u.query); q['board']=[str(board)]
            response=r.fetch(url=urlunsplit((u.scheme,u.netloc,u.path,urlencode(q,doseq=True),u.fragment)),headers=headers); r.fulfill(response=response)
    page.route('http://localhost:8787/v2/**',route)
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:8000/{game}/index.html'); page.evaluate('document.fonts.ready')
    assert page.locator('#board').is_hidden()
    title_scores(page,game,size,label)
    start(page,game)
    first_token=page.evaluate('lbRun.start')   # waits for the run's token
    assert first_token
    # Menu touches must not count; actual play-area pen input must count.
    assert page.evaluate('lbRun.input')=='keys'
    area='.arena' if game=='thimbleful' else '#view'
    page.locator(area).dispatch_event('pointerdown',{'pointerId':1,'pointerType':'pen','clientX':120,'clientY':120,'button':0})
    page.locator(area).dispatch_event('pointerup',{'pointerId':1,'pointerType':'pen'})
    assert page.evaluate('lbRun.input')=='touch'
    finish(page,game,5000)
    picker(page,game)
    assert page.evaluate("document.activeElement.classList.contains('lb-letter')")
    # Shortcut letters must enter initials, not mute or full-screen the game.
    sound=page.evaluate('ThimbleSound.muted' if game=='thimbleful' else 'sfx.on')
    page.keyboard.type('mfx')
    assert page.evaluate('ThimbleSound.muted' if game=='thimbleful' else 'sfx.on')==sound
    assert page.evaluate('state' if game=='thimbleful' else 'mode')=='over'
    page.keyboard.type('jon'); page.get_by_role('button',name='Save score',exact=True).click()
    page.locator('.lb-you').wait_for()
    assert page.evaluate("localStorage.getItem('jpg-initials')")=='JON'
    assert page.locator('.lb-you').inner_text().split()[1]=='JON'
    assert page.locator('.lb-you [aria-label="touch"]').count()==1
    assert page.locator('.lb-table tbody tr').count()==10
    start(page,game); assert page.evaluate('lbRun.start')!=first_token; assert page.evaluate('lbRun.input')=='keys'
    finish(page,game,6000); picker(page,game); page.keyboard.type('skp'); page.get_by_role('button',name='Skip score entry').click()
    assert page.evaluate("localStorage.getItem('jpg-initials')")=='JON'
    assert page.locator('.lb-entry').count()==0
    assert api('/v2/top?'+urlencode({'game':game,'board':board}))['scores'][0]['score']==5000
    start(page,game); finish(page,game,0); page.locator('.lb-table').wait_for()
    assert page.locator('.lb-entry').count()==0
    start(page,game); finish(page,game,2035); picker(page,game)
    page.keyboard.type('low'); page.keyboard.press('Enter'); page.locator('.lb-you').wait_for()
    rank=int(page.locator('.lb-you td').first.inner_text()); assert rank>10
    assert page.locator('.lb-table tbody tr').count()==12
    page.get_by_role('button',name=re.compile(r'^See all \d+$')).click()
    assert page.locator('.lb-table tbody tr').count()==50
    assert page.locator('.lb-you').count()==1
    metrics=page.locator('.lb-list').evaluate('(e)=>({scroll:e.scrollHeight,client:e.clientHeight,width:e.scrollWidth,box:e.clientWidth})')
    assert metrics['scroll']>metrics['client']; assert metrics['width']<=metrics['box']+1,metrics
    page.locator('.lb-list').evaluate('(e)=>e.scrollTop=e.scrollHeight')
    assert page.locator('.lb-table tbody tr').last.is_visible()
    if game=='thimbleful': page.evaluate('setFull(true)')
    page.locator('.lb-more').scroll_into_view_if_needed()
    parent=page.locator('.card' if game=='thimbleful' else '.phone').bounding_box()
    assert parent['height']<=size['height'],(label,parent,size)
    assert parent['y']>=-1,(label,parent,size)
    assert parent['y']+parent['height']<=size['height']+1,(label,parent,size)
    page.screenshot(path=str(ARTIFACTS/f'{game}-{label}.png'))
    if game=='thimbleful': page.evaluate('setFull(false)')
    # No token (Worker down at run start): a winning run shows the board only, never asks for initials.
    api_mode['start']=False
    start(page,game); assert page.evaluate('lbRun.start') is None
    finish(page,game,5500); page.locator('.lb-table').wait_for()
    assert page.locator('.lb-entry').count()==0 and page.locator('.lb-you').count()==0
    if game=='thimbleful': assert page.locator('#lbEnter').is_hidden() and page.locator('#go').is_visible()
    api_mode['start']=True
    # A refused submit: the board comes back without the run's row, and nothing says why.
    api_mode['sign']=False
    start(page,game); finish(page,game,5600); picker(page,game)
    page.keyboard.type('ref'); page.get_by_role('button',name='Save score',exact=True).click()
    page.locator('.lb-entry').wait_for(state='detached'); page.locator('.lb-table').wait_for()
    assert page.locator('.lb-you').count()==0
    assert 'REF' not in [row['name'] for row in api('/v2/top?'+urlencode({'game':game,'board':board}))['scores']]
    api_mode['sign']=True
    assert not errors,errors
    print(f'PASS {game} {label}: OK, Skip, nonqualification, input, shortcuts, gap row, 50-row scrolling and end-screen fit, title-screen scores, no token, refused run',flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(**({'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}))
    for label,size in [('portrait',{'width':390,'height':844}),('landscape',{'width':844,'height':390}),('desktop',{'width':1280,'height':800})]:
        for game in ['thimbleful','dont-step-on-a-crack']:
            context=browser.new_context(viewport=size,reduced_motion='reduce')
            page=context.new_page(); suite(page,game,size,label); context.close()
    browser.close()
