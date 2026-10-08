"""Layout and real input checks. Run python3 tests/stick-army/ui.py with site/ on port 8000; optional SCREENSHOTS directory."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('SCREENSHOTS', '/tmp/stick-army-screenshots'))
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
    errors=[]
    for width,height in [(1440,900),(390,844),(844,390),(320,568)]:
        context=browser.new_context(viewport={'width':width,'height':height}, has_touch=width<500)
        page=context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
        tune_requests=[]; page.on('request',lambda request:tune_requests.append(request.url) if '/tune.js' in request.url else None)
        source=(ROOT/'site/stick-army/game.js').read_text().replace('  start();', '  window.armyTest = function(code) { return eval(code); };\n  start();')
        page.route('**/stick-army/game.js*',lambda route:route.fulfill(body=source,content_type='application/javascript'))
        page.goto(os.environ.get('SITE_URL','http://127.0.0.1:8000')+'/stick-army/')
        page.evaluate('document.fonts.ready')
        assert not tune_requests and page.locator('#tunePanel').count()==0
        assert page.evaluate('typeof window.StickArmyTune === "undefined"')
        page.screenshot(path=str(OUT/f'title-{width}.png'))
        page.click('#startBtn')
        if width==390:
            page.evaluate("document.getElementById('wrap').requestFullscreen = undefined; document.getElementById('wrap').webkitRequestFullscreen = undefined")
        for control in ['#muteBtn', '#pauseBtn', '#fullBtn']:
            size=page.locator(control).bounding_box(); assert size['width']>=44 and size['height']>=44, size
        page.click('#fullBtn')
        assert page.locator('#fullBtn').get_attribute('aria-pressed')=='true'
        box=page.locator('#frame').bounding_box()
        assert box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=width+1 and box['y']+box['height']<=height+1,box
        page.click('#fullBtn')
        if width<500:
            box=page.locator('#game').bounding_box()
            page.touchscreen.tap(box['x']+box['width']*.2,box['y']+box['height']*.5)
        else:
            page.keyboard.press('ArrowLeft');page.keyboard.press('Space')
        page.keyboard.press('p'); assert page.locator('#pauseScreen').is_visible(); page.click('#resumeBtn')
        page.evaluate('armyTest("newGame(); S.wallHP=55; S.coins=125; S.recruits=[makeRecruit(0, \'rifle\')]; S.recruits[0].hp=1; openShop();")')
        page.screenshot(path=str(OUT/f'shop-{width}.png'))
        assert not page.locator('#continueBtn').is_disabled()
        footer=page.locator('#continueBtn').bounding_box()
        assert footer['y']>=0 and footer['y']+footer['height']<=height, footer
        assert page.locator('.shop-stock').evaluate('(el) => el.scrollWidth <= el.clientWidth + 1')
        gift=page.locator('#supplyItems button.gift'); gift_id=gift.get_attribute('data-item'); gift.click()
        assert page.locator('#supplyItems button.gift').count()==0 and page.locator(f'#supplyItems [data-item="{gift_id}"]').is_disabled()
        # Pizza is ordered without leaving the shop; the courier rides in before the next wave starts.
        page.locator('[data-item="pizza"]').click()
        assert page.locator('#shopScreen').is_visible() and page.locator('[data-item="pizza"]').is_disabled()
        page.click('#continueBtn')
        assert page.locator('#shopScreen').is_hidden()
        assert page.evaluate('armyTest("S.mode===\'play\' && S.waveState===\'pizza\' && S.wave===1 && !!S.delivery")')
        page.wait_for_timeout(1800)
        page.screenshot(path=str(OUT/f'pizza-{width}.png'))
        # Every shop visit starts at the top of its list, wherever the last one was scrolled.
        page.evaluate('armyTest("openShop()")')
        page.evaluate("() => { document.querySelector('.shop-stock').scrollTop = 400; document.getElementById('shopScreen').scrollTop = 400; }")
        page.evaluate('armyTest("S.shop = null; shopScreen.hidden = true; S.mode = \'play\'; openShop()")')
        assert page.evaluate("() => document.querySelector('.shop-stock').scrollTop === 0 && document.getElementById('shopScreen').scrollTop === 0")
        page.evaluate('armyTest("S.shop = null; shopScreen.hidden = true; S.mode = \'play\'; S.wave = 2;")')
        page.evaluate('armyTest("S.mode=\'paused\'; S.banner=null; S.planes=[]; spawnPlane(\'bomber\'); S.planes[0].x=220; [180,320,470].forEach(function(y){ spawnTrooper(70,y); S.troopers[S.troopers.length-1].open=1; }); render();")')
        page.screenshot(path=str(OUT/f'battle-{width}.png'))
        # The victory card fits the width, scrolls on short screens, and both buttons can be reached and pressed.
        page.evaluate('armyTest("S.mode=\'play\'; S.wave=15; S.finalWon=true; S.recruits=[0,1,4,5].map(function(s,i){ var r=makeRecruit(s,\'rifle\'); r.rank=i%3; r.name=SQUAD.NAMES[i]; r.waves=8+i; r.kills=10*i; return r; }); S.fallen=[{name:\'Cpl. Doodle\',waves:9,kills:30}]; showWin();")')
        card=page.locator('#winScreen .card'); assert card.is_visible()
        cb=card.bounding_box(); assert cb['x']>=-1 and cb['x']+cb['width']<=width+1, cb
        assert card.evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
        page.locator('#winAgainBtn').scroll_into_view_if_needed(); assert page.locator('#winAgainBtn').is_visible()
        page.screenshot(path=str(OUT/f'win-{width}.png'))
        page.locator('#keepBtn').scroll_into_view_if_needed(); page.click('#keepBtn')
        assert page.locator('#shopScreen').is_visible() and page.evaluate('armyTest("S.endless && S.mode===\'shop\'")')
        page.evaluate('armyTest("S.shop = null; shopScreen.hidden = true; S.mode = \'play\';")')
        try: page.evaluate("localStorage.removeItem('stickarmy.wins'); localStorage.removeItem('stickarmy.bestWave')")
        except Exception: pass
        print('PASS layout + input + shop + pizza + victory', width,height)
        context.close()
    context=browser.new_context(viewport={'width':390,'height':844})
    page=context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/stick-army/game.js*',lambda route:route.fulfill(body=source,content_type='application/javascript'))
    page.add_init_script("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async function(){throw new Error('denied');}}});")
    page.goto(os.environ.get('SITE_URL','http://127.0.0.1:8000')+'/stick-army/#tune')
    page.wait_for_selector('#tunePanel')
    assert page.locator('#tunePanel input').count()==14
    page.locator('#tunePanel summary').click(); page.click('#startBtn'); page.locator('#tunePanel summary').click()
    page.evaluate('armyTest("S.recruits=[makeRecruit(0,\'rifle\')]; S.recruits[0].cd=2; spawnTrooper(60,300);")')
    changes={'FIRE_COOLDOWN':0.3,'HEAT_PER_SHOT':0.2,'COOL_RATE':0.5,'OVERHEAT_LOCK':2,'SHOT_COST':2,'CAPTURE_SPEED':420,'DROP_CHANCE':0.5,'RIFLE_COOLDOWN':0.5,'RIFLE_SPREAD':0.05,'PLANES_PER_WAVE':3,'FALL_PER_WAVE':6,'DROPS_PER_WAVE':1.5,'WALL_DAMAGE':9,'BOSS_HP_PER_WAVE':12}
    for key,value in changes.items():
        page.locator('#tune-'+key).evaluate('(el,value)=>{el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));}',value)
    assert page.evaluate('StickArmyTune.getValues()')==changes
    assert page.evaluate('armyTest("CAPTURE_SPEED===420 && S.spawn.cfg.planes===7 && S.spawn.cfg.fall===53 && S.spawn.cfg.maxDrops===4 && S.recruits[0].cd<=0.5")')
    page.locator('#tune-CAPTURE_SPEED').focus(); page.keyboard.press('ArrowRight')
    assert page.evaluate('armyTest("!keys.right && !keys.fire")')
    page.locator('#tunePanel button').click()
    text=page.locator('#tunePanel textarea'); assert text.is_visible()
    assert text.evaluate('(el)=>el.selectionStart===0 && el.selectionEnd===el.value.length')
    assert page.evaluate('JSON.parse(document.querySelector("#tunePanel textarea").value)')==page.evaluate('StickArmyTune.getValues()')
    page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async function(text){window.tuneCopied=text;}}});")
    page.locator('#tunePanel button').click(); assert text.is_hidden()
    assert page.evaluate('JSON.parse(window.tuneCopied)')==page.evaluate('StickArmyTune.getValues()')
    page.screenshot(path=str(OUT/'tune-390.png'))
    print('PASS #tune: live values, isolated keyboard, clipboard success and fallback')
    context.close()
    assert not errors,errors
    browser.close()
print('Screenshots:', OUT)
