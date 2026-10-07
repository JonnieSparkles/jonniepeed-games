"""Local UI integration checks. Requires Playwright and a running Worker/site server."""
import os
import re
import tempfile
import http.client
import json
import secrets
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlencode, parse_qs, urlunsplit
from playwright.sync_api import sync_playwright

ARTIFACTS=Path(os.environ.get('SCREENSHOTS', tempfile.mkdtemp(prefix='jpg-boards-')))
ARTIFACTS.mkdir(parents=True, exist_ok=True)

def api(path, payload=None):
    c=http.client.HTTPConnection('127.0.0.1',8787, timeout=10)
    c.request('POST' if payload else 'GET',path,body=json.dumps(payload) if payload else None,headers={'Content-Type':'application/json'})
    r=c.getresponse(); data=json.loads(r.read()); assert r.status==200,(r.status,data); c.close(); return data

def seed(game, board):
    for i in range(50):
        api('/v1/submit',{'game':game,'board':board,'run_id':str(uuid.uuid4()),'name':'BOT','score':2000+i,'input':'keys','meta':{'time_ms':10000}})

def finish(page, game, score):
    if game=='thimbleful':
        page.evaluate('(s)=>{score=s; el=12; end();}',score)
    else:
        page.evaluate('(s)=>{front.d=s+2.6; tStart=performance.now()/1000-12; gameOver(performance.now()/1000);}',score)
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

def suite(page, game, size, label):
    board=-secrets.randbelow(2**45)-1
    seed(game,board)
    def route(r):
        u=urlsplit(r.request.url)
        if r.request.method=='POST':
            d=json.loads(r.request.post_data); d['board']=board
            response=r.fetch(post_data=json.dumps(d)); r.fulfill(response=response)
        else:
            q=parse_qs(u.query); q['board']=[str(board)]
            response=r.fetch(url=urlunsplit((u.scheme,u.netloc,u.path,urlencode(q,doseq=True),u.fragment))); r.fulfill(response=response)
    page.route('http://localhost:8787/v1/**',route)
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:8000/{game}/index.html'); page.evaluate('document.fonts.ready')
    assert page.locator('#board').is_hidden()
    start(page,game)
    first_id=page.evaluate('lbRun.id')
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
    start(page,game); assert page.evaluate('lbRun.id')!=first_id; assert page.evaluate('lbRun.input')=='keys'
    finish(page,game,6000); picker(page,game); page.keyboard.type('skp'); page.get_by_role('button',name='Skip score entry').click()
    assert page.evaluate("localStorage.getItem('jpg-initials')")=='JON'
    assert page.locator('.lb-entry').count()==0
    assert api('/v1/top?'+urlencode({'game':game,'board':board}))['scores'][0]['score']==5000
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
    assert not errors,errors
    print(f'PASS {game} {label}: OK, Skip, nonqualification, input, shortcuts, gap row, 50-row scrolling and end-screen fit',flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(**({'executable_path': os.environ['CHROMIUM']} if os.environ.get('CHROMIUM') else {}))
    for label,size in [('portrait',{'width':390,'height':844}),('landscape',{'width':844,'height':390}),('desktop',{'width':1280,'height':800})]:
        for game in ['thimbleful','dont-step-on-a-crack']:
            context=browser.new_context(viewport=size,reduced_motion='reduce')
            page=context.new_page(); suite(page,game,size,label); context.close()
    browser.close()
