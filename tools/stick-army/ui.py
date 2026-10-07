"""Layout and real input checks. Usage matches test.py; optional SCREENSHOTS directory."""
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
        source=(ROOT/'site/stick-army/game.js').read_text().replace('  start();', '  window.armyTest = function(code) { return eval(code); };\n  start();')
        page.route('**/stick-army/game.js*',lambda route:route.fulfill(body=source,content_type='application/javascript'))
        page.goto(os.environ.get('SITE_URL','http://127.0.0.1:8000')+'/stick-army/index.html')
        page.evaluate('document.fonts.ready')
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
        assert page.locator('#continueBtn').is_disabled()
        footer=page.locator('#continueBtn').bounding_box()
        assert footer['y']>=0 and footer['y']+footer['height']<=height, footer
        assert page.locator('.shop-stock').evaluate('(el) => el.scrollWidth <= el.clientWidth + 1')
        page.locator('#freeItems button').first.click()
        assert page.locator('#freeItems button:disabled').count()==2
        page.locator('[data-item="pizza"]').click()
        assert page.locator('#shopScreen').is_hidden()
        page.wait_for_timeout(1800)
        page.screenshot(path=str(OUT/f'pizza-{width}.png'))
        page.wait_for_function('!document.getElementById("shopScreen").hidden')
        assert page.locator('[data-item="pizza"]').is_disabled()
        page.click('#continueBtn')
        assert page.locator('#shopScreen').is_hidden()
        assert page.evaluate('armyTest("S.mode===\'play\' && S.wave===2")')
        page.evaluate('armyTest("S.mode=\'paused\'; S.banner=null; S.planes=[]; spawnPlane(\'bomber\'); S.planes[0].x=220; [180,320,470].forEach(function(y){ spawnTrooper(70,y); S.troopers[S.troopers.length-1].open=1; }); render();")')
        page.screenshot(path=str(OUT/f'battle-{width}.png'))
        print('PASS layout + input + shop + pizza', width,height)
        context.close()
    assert not errors,errors
    browser.close()
print('Screenshots:', OUT)
