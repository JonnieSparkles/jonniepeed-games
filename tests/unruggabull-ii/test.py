"""Browser checks for Unruggabull II. Serve site/ on port 8000, then run python3 tests/unruggabull-ii/test.py.
Requires Python Playwright; CHROMIUM selects a system browser, SITE_URL another server.
The test-only bridge is injected into the response, never shipped in the game.
"""
import os
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
URL = os.environ.get('SITE_URL', 'http://127.0.0.1:8000').rstrip('/') + '/unruggabull-ii/'
source = (ROOT / 'site/unruggabull-ii/game.js').read_text()
assert source.count('  start();') == 1, 'game.js needs exactly one "  start();" line for the test bridge'
# The bridge evaluates a case inside game.js, with Floor 13's names (any the core doesn't have itself) in scope too,
# so cases can reach the floor's functions by name as they did before the floor had its own script.
BRIDGE = """  window.unrugTest = function (code) {
    const own = Object.keys(floor).filter(k => { try { eval(k); return false; } catch (e) { return true; } });
    return eval((own.length ? 'var { ' + own.join(', ') + ' } = floor;\\n' : '') + code);
  };
"""
source = source.replace('  start();', BRIDGE + '  start();')


def open_page(browser, url=URL, **ctx):
    context = browser.new_context(**ctx)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/unruggabull-ii/game.js*', lambda route: route.fulfill(body=source, content_type='application/javascript'))
    page.goto(url)
    return context, page, errors


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))

    # Game rules, driven tick by tick through the bridge with the page clock frozen.
    context, page, errors = open_page(browser, viewport={'width': 1000, 'height': 800})
    page.clock.install()
    assert 'touch-action:manipulation' in page.content(), 'page sets touch-action:manipulation'
    for case in sorted(Path(__file__).parent.glob('case-*.js')):
        if case.name == 'case-23-roof-playthrough.js':
            page.evaluate('(code) => unrugTest(code)', (Path(__file__).parent / 'balance.js').read_text())
            page.evaluate((Path(__file__).parent / 'bot.js').read_text())
            page.evaluate((ROOT / 'tools/balance/driver.js').read_text())
            page.evaluate('(profiles) => window.roofProfiles = profiles', json.loads((Path(__file__).parent / 'profiles.json').read_text()))
        page.evaluate('(code) => unrugTest(code)', case.read_text())
        print('PASS', case.stem)
    assert not errors, errors
    context.close()

    from roof_audio import check_audio
    check_audio(browser, ROOT)
    from music_system import check_music
    check_music(browser, ROOT)

    # The preference can change between runs; only the presentation offset is reduced.
    for motion, expected in [('no-preference', [10, 5]), ('reduce', [5, 2])]:
        context, page, errors = open_page(browser, reduced_motion=motion)
        page.clock.install()
        offset = page.evaluate("""unrugTest(`newRun(null, 'roof'); R.shake = 0;
          floor.effects.shake(10, 1);
          (() => { const random = Math.random; Math.random = () => .99;
            try { return floor.shakeOffset(); } finally { Math.random = random; } })()`)
        """)
        assert offset == expected, (motion, offset)
        assert not errors, errors
        context.close()
    print('PASS roof reduced motion halves shake')

    # Layout: desktop, phone portrait and phone landscape. Phones go full screen on Start and show the pads.
    for name, size, touch in [('desktop', (1280, 800), False), ('phone portrait', (390, 844), True), ('phone landscape', (844, 390), True)]:
        context, page, errors = open_page(browser, viewport={'width': size[0], 'height': size[1]}, has_touch=touch, is_mobile=touch)
        page.wait_for_timeout(300)
        width = page.evaluate('document.documentElement.scrollWidth')
        assert width <= size[0], f'{name}: no sideways scroll ({width}px)'
        assert page.locator('#go').is_visible(), f'{name}: Start is visible'
        assert page.locator('#cardTitle').inner_text() == 'The 13th Floor: Accounting', f'{name}: branded title'
        assert page.locator('#cardTitle').evaluate('(el) => el.scrollWidth <= el.clientWidth'), f'{name}: branded title fits'
        page.locator('#go').click()
        page.wait_for_timeout(300)
        assert page.locator('#crawl').is_visible(), f'{name}: the first Start tells the story'
        page.locator('#skip').click()
        page.wait_for_timeout(300)
        stage = page.locator('.stage').bounding_box()
        assert stage['x'] >= 0 and stage['x'] + stage['width'] <= size[0] + 1, f'{name}: stage fits across'
        if touch:
            assert page.evaluate("document.getElementById('game').classList.contains('full')"), f'{name}: Start goes full screen'
            assert stage['y'] >= 0 and stage['y'] + stage['height'] <= size[1] + 1, f'{name}: stage fits in the screen'
            zone = page.locator('#stickzone')
            assert zone.is_visible(), f'{name}: the thumb stick shows'
            zb = zone.bounding_box()
            assert zb['y'] + zb['height'] <= size[1] + 1 and zb['x'] >= 0 and zb['width'] >= 120 and zb['height'] >= 100, f'{name}: thumb stick on screen and roomy ({zb})'
            for k in ('shoot', 'slash'):
                pad = page.locator(f'.pad[data-k="{k}"]')
                assert pad.is_visible(), f'{name}: {k} pad shows'
                box = pad.bounding_box()
                assert box['y'] + box['height'] <= size[1] + 1 and box['x'] >= 0 and box['x'] + box['width'] <= size[0] + 1, f'{name}: {k} pad on screen'
            cdp = context.new_cdp_session(page)
            def touch_event(kind, x, y, tid=1):
                cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': x, 'y': y, 'id': tid}]})
            # the stick: land anywhere in its zone, slide right then left, flick up to jump, hold down to crouch
            cx, cy = zb['x'] + zb['width'] / 2, zb['y'] + zb['height'] / 2
            page.evaluate("unrugTest('bull.u = 0; bull.inv = 1e9')")
            touch_event('touchStart', cx, cy)
            touch_event('touchMove', cx + 36, cy)
            page.wait_for_timeout(250)
            moved = page.evaluate("unrugTest('bull.u')")
            assert moved > 0, f'{name}: sliding the stick right moves right'
            touch_event('touchMove', cx - 36, cy)
            page.wait_for_timeout(250)
            assert page.evaluate("unrugTest('bull.u')") < moved, f'{name}: sliding it left moves left'
            touch_event('touchMove', cx, cy)
            page.wait_for_timeout(50)
            touch_event('touchMove', cx, cy - 40)
            page.wait_for_timeout(60)
            assert page.evaluate("unrugTest('bull.jh')") > 0, f'{name}: flicking up jumps'
            touch_event('touchMove', cx, cy)
            page.wait_for_timeout(700)
            touch_event('touchMove', cx, cy + 40)
            page.wait_for_timeout(60)
            assert page.evaluate("unrugTest('bull.crouch')"), f'{name}: holding down crouches'
            touch_event('touchEnd', 0, 0)
            page.wait_for_timeout(30)
            assert not page.evaluate("unrugTest('keys.padLeft || keys.padRight || keys.padDown')"), f'{name}: lifting the thumb lets go'
            # a thumb in the gap between Shoot and Slash still counts
            sh, sl = page.locator('.pad[data-k="shoot"]').bounding_box(), page.locator('.pad[data-k="slash"]').bounding_box()
            if sl['y'] >= sh['y'] + sh['height'] - 1:
                gx, gy = sh['x'] + sh['width'] / 2, (sh['y'] + sh['height'] + sl['y']) / 2
            else:
                gx, gy = (sh['x'] + sh['width'] + sl['x']) / 2, sh['y'] + sh['height'] / 2
            page.evaluate("unrugTest('bull.cd = 0; bull.slash = -1; R.events.shots = 0; R.fireT = 0')")
            touch_event('touchStart', gx, gy)
            page.wait_for_timeout(100)
            assert page.evaluate("unrugTest('bull.slash >= 0 || R.events.shots > 0')"), f'{name}: a touch between Shoot and Slash counts'
            touch_event('touchEnd', 0, 0)
            if name == 'phone portrait':
                # the stage sits right on top of the controls, and the buttons are big
                stage = page.locator('.stage').bounding_box()
                top = min(zb['y'], page.locator('.pad[data-k="shoot"]').bounding_box()['y'])
                assert 0 <= top - (stage['y'] + stage['height']) <= 40, f'{name}: the stage sits just above the controls'
                assert all(page.locator(f'.pad[data-k="{k}"]').bounding_box()['width'] >= 100 for k in ('shoot', 'slash')), f'{name}: big buttons'
            shoot = page.locator('.pad[data-k="shoot"]').bounding_box()
            page.evaluate("unrugTest('R.events.shots = 0; R.fireT = 0')")
            touch_event('touchStart', shoot['x'] + shoot['width'] / 2, shoot['y'] + shoot['height'] / 2)
            page.wait_for_timeout(500)
            touch_event('touchEnd', 0, 0)
            assert page.evaluate("unrugTest('R.events.shots')") >= 2, f'{name}: holding Shoot keeps firing'
        else:
            assert not page.locator('#pads').is_visible(), f'{name}: no pads without touch'
            page.keyboard.press('f')
            assert page.evaluate("document.getElementById('game').classList.contains('full')"), f'{name}: F goes full screen'
            stage = page.locator('.stage').bounding_box()
            assert stage['y'] + stage['height'] <= size[1] + 1, f'{name}: full screen stage fits'
        assert not errors, (name, errors)
        print('PASS layout', name)
        context.close()
    # The review hash bypasses the title/story, combines with a seed, and uses the same phone controls.
    for name, size, touch in [('desktop', (1280, 800), False), ('phone portrait', (390, 844), True), ('phone landscape', (844, 390), True)]:
        context, page, errors = open_page(browser, url=URL + '#stage=roof&seed=42', viewport={'width': size[0], 'height': size[1]}, has_touch=touch, is_mobile=touch)
        page.wait_for_timeout(100)
        assert page.evaluate("unrugTest('R.stage === \"roof\" && RUN.seed === 42 && state === \"play\" && R.roof.state === \"elevator\"')"), name
        assert page.locator('#card').is_hidden() and page.locator('#crawl').is_hidden(), name
        page.evaluate("unrugTest('looping=false; floor.enter(\"round1\"); floor.volley(); draw()')")
        assert page.evaluate("""unrugTest('R.roof.rings.every(r => PX(r.u,r.z)-Math.max(15,textWidth(r.odds+\"%\")/2)>0 && PX(r.u,r.z)+Math.max(15,textWidth(r.odds+\"%\")/2)<W && FY(r.z)+4<H && FY(r.z)-14>0)')"""), f'{name}: rings and percentage labels fit'
        page.keyboard.down('ArrowUp')
        page.evaluate("unrugTest('for(let i=0;i<24;i++) update(1/60)')")
        page.keyboard.up('ArrowUp')
        assert page.evaluate("unrugTest('bull.bz > .1 && bull.jh === 0 && !keys.kbUp')"), f'{name}: arrow up walks forward'
        stage = page.locator('.stage').bounding_box()
        canvas = page.locator('#c').bounding_box()
        assert canvas['y'] >= 0 and canvas['y'] + canvas['height'] <= size[1] + 1, f'{name}: whole roof canvas fits vertically'
        assert page.evaluate('document.documentElement.scrollWidth') <= size[0], name
        assert stage['x'] >= 0 and stage['x'] + stage['width'] <= size[0] + 1, name
        if touch:
            # Browsers require a tap to enter full screen; the hash starts play without that gesture.
            assert page.locator('#stickzone').is_visible() and page.locator('.pad[data-k="shoot"]').is_visible(), name
            box = page.locator('#stickzone').bounding_box()
            cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            page.dispatch_event('#stickzone', 'pointerdown', {'pointerId': 77, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy})
            page.dispatch_event('#stickzone', 'pointermove', {'pointerId': 77, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy - 40})
            page.evaluate("unrugTest('for(let i=0;i<30;i++) update(1/60)')")
            assert page.evaluate("unrugTest('bull.bz === floor.ROOF.depthMax && bull.jh === 0')"), f'{name}: stick up walks forward'
            page.dispatch_event('#stickzone', 'pointermove', {'pointerId': 77, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy + 40})
            page.evaluate("unrugTest('for(let i=0;i<60;i++) update(1/60)')")
            page.dispatch_event('#stickzone', 'pointerup', {'pointerId': 77, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy})
            assert page.evaluate("unrugTest('bull.bz === 0 && !bull.crouch && !keys.padUp && !keys.padDown')"), f'{name}: stick down walks back and release clears input'
        assert not errors, (name, errors)
        print('PASS roof hash/layout', name)
        context.close()
    # Side-view hash and existing controls, including a real pointer tap on the carried icon.
    for name, size, touch in [('desktop', (1280, 800), False), ('phone portrait', (390, 844), True), ('phone landscape', (844, 390), True)]:
        context, page, errors = open_page(browser, url=URL + '#stage=elevator&seed=42', viewport={'width': size[0], 'height': size[1]}, has_touch=touch, is_mobile=touch)
        page.clock.install()
        page.evaluate("unrugTest('looping=false; clearHeld();')")
        assert page.evaluate("unrugTest('R.stage === \"elevator\" && RUN.seed === 42 && R.heldDrop === null && state === \"play\"')"), name
        assert page.locator('#card').is_hidden() and page.locator('#crawl').is_hidden(), name
        page.keyboard.down('ArrowRight')
        page.evaluate("unrugTest('for(let i=0;i<12;i++) update(1/60)')")
        page.keyboard.up('ArrowRight')
        assert page.evaluate("unrugTest('bull.u > -.55 && bull.facing === 1')"), name
        page.keyboard.press('ArrowUp')
        page.evaluate("unrugTest('update(1/60)')")
        assert page.evaluate("unrugTest('bull.jh > 0')"), name
        page.evaluate("unrugTest('drops.give(\"spread\"); draw()')")
        if touch:
            canvas = page.locator('#c').bounding_box()
            page.touchscreen.tap(canvas['x'] + canvas['width'] * 64 / 240, canvas['y'] + canvas['height'] * 24 / 135)
        else:
            page.keyboard.press('e')
        assert page.evaluate("unrugTest('!R.heldDrop && R.spread === 10')"), name
        assert page.evaluate('document.documentElement.scrollWidth') <= size[0], name
        if touch:
            page.evaluate("unrugTest('newRun(null, \"elevator\"); setState(\"play\"); setFull(true); for(let i=0;i<60;i++)update(1/60);draw();')")
            page.wait_for_timeout(100)
            canvas = page.locator('#c').bounding_box()
            # The operator and his cap, his button panel, his longest line's bubble, the crate where it appears and the
            # dial (p(Loom)'s eye), in the game's units.
            for label, (x, y, w, h) in {'operator': (169, 74, 18, 48), 'panel': (200, 54, 11, 33),
                                      'caption': (145, 62, 66, 12), 'crate': (165, 109, 14, 11), 'dial': (108, 20, 24, 17)}.items():
                a = {'x': canvas['x'] + x * canvas['width'] / 240,
                     'y': canvas['y'] + y * canvas['height'] / 135,
                     'width': w * canvas['width'] / 240, 'height': h * canvas['height'] / 135}
                for selector in ['#stickzone', '.shoot', '.slash']:
                    b = page.locator(selector).bounding_box()
                    assert a['x'] + a['width'] <= b['x'] or b['x'] + b['width'] <= a['x'] or a['y'] + a['height'] <= b['y'] or b['y'] + b['height'] <= a['y'], f'{name}: {label} clear of {selector}'
        assert not errors, (name, errors)
        context.close()
        print('PASS elevator hash/input/layout', name)
        if touch:
            # Every quiet-ride bubble (all three middle exchanges) at full text width, at either end of the car and in the doorway.
            for u in [-.7, 0, .7]:
                context, page, errors = open_page(browser, viewport={'width': size[0], 'height': size[1]}, has_touch=True, is_mobile=True)
                page.clock.install()
                # each of the three middle exchanges (picked from the run seed)
                bubbles = page.evaluate("""u => unrugTest(`looping=false;
                  (()=>{ const boxes=[];let last=null;
                    for(const k of [0,1,2]){ RUN.force=k;
                    newRun({stage:'elevator',transfer:true,fight:false,from:13,destination:{floor:48,label:'48',stage:'floor48'}});
                    RUN.force=null;setState('play');setFull(true);bull.u=${u};
                    for(let i=0;i<35.1*60;i++){ update(1/60);
                      if(R.talk && R.talk!==last){ last=R.talk;draw();
                        const w=textWidth(R.talk.text)*2+12, x=R.talk.speaker==='operator'?356:240;
                        boxes.push({text:R.talk.text,x:(clamp(Math.round(x-w/2),4,480-w-4)-2)/2,
                          y:R.talk.speaker==='operator'?63:65,width:(w+4)/2,height:12}); }
                    }}return boxes;
                  })()`)
                """, u)
                assert len(bubbles) == 33 and len({b['text'] for b in bubbles}) == 17, (name, bubbles)
                canvas = page.locator('#c').bounding_box()
                for box in bubbles:
                    assert box['x'] >= 0 and box['x'] + box['width'] <= 240, (name, box)
                    a = {key: canvas[key] + box[key] * canvas['width' if key == 'x' else 'height'] / (240 if key == 'x' else 135) for key in ['x', 'y']}
                    a.update(width=box['width'] * canvas['width'] / 240, height=box['height'] * canvas['height'] / 135)
                    for selector in ['#stickzone', '.shoot', '.slash']:
                        b = page.locator(selector).bounding_box()
                        assert a['x'] + a['width'] <= b['x'] or b['x'] + b['width'] <= a['x'] or a['y'] + a['height'] <= b['y'] or b['y'] + b['height'] <= a['y'], (name, box, selector)
                assert not errors, (name, errors)
                context.close()
            print('PASS quiet-ride bubbles clear phone pads', name)

    # The 48th Floor's twin sticks: WASD and the mouse on desktop; the move stick, the aim stick (hold to fire, flick to
    # slash) and Slash on touch, in portrait and landscape and full screen; the lobby goes back to the usual controls.
    for name, size, touch in [('desktop', (1280, 800), False), ('phone portrait', (390, 844), True), ('phone landscape', (844, 390), True)]:
        context, page, errors = open_page(browser, url=URL + '#stage=floor48&seed=42', viewport={'width': size[0], 'height': size[1]}, has_touch=touch, is_mobile=touch)
        page.clock.install()
        page.evaluate("unrugTest('looping=false; clearHeld(); update(1/60); twinClass(); draw()')")
        assert page.evaluate("unrugTest('R.stage === \"floor48\" && RUN.seed === 42 && state === \"play\" && floor.twin()')"), name
        assert page.evaluate("document.body.classList.contains('twin')"), f'{name}: twin-stick page class'
        assert page.evaluate('document.documentElement.scrollWidth') <= size[0], name
        if not touch:
            x0 = page.evaluate("unrugTest('bull.x')")
            page.keyboard.down('KeyD'); page.evaluate("unrugTest('for(let i=0;i<20;i++) update(1/60)')"); page.keyboard.up('KeyD')
            assert page.evaluate(f"unrugTest('bull.x > {x0} + 10')"), f'{name}: D moves right'
            canvas = page.locator('#c').bounding_box()
            page.mouse.move(canvas['x'] + canvas['width'] * .9, canvas['y'] + canvas['height'] * .5)
            page.mouse.down(); page.evaluate("unrugTest('for(let i=0;i<6;i++) update(1/60)')"); page.mouse.up()
            assert page.evaluate("unrugTest('R.td.aimSource === \"mouse\" && bull.ax > .8 && R.shots.some(s => s.vx > 0)')"), f'{name}: the mouse aims and fires'
            page.mouse.click(canvas['x'] + canvas['width'] * .5, canvas['y'] + canvas['height'] * .2, button='right')
            page.evaluate("unrugTest('update(1/60)')")
            assert page.evaluate("unrugTest('bull.slash >= 0 || bull.cd > 0')"), f'{name}: right-click slashes'
        else:
            assert page.locator('#stickzone').is_visible() and page.locator('#aimzone').is_visible() and not page.locator('.pad.slash').is_visible(), f'{name}: two sticks, no Slash button (the flick slashes)'
            assert not page.locator('.pad.shoot').is_visible(), f'{name}: no Shoot button on the twin sticks'
            box = page.locator('#aimzone').bounding_box()
            assert box['x'] >= 0 and box['x'] + box['width'] <= size[0] + 1, f'{name}: aim stick across the screen (full screen fits it vertically, below)'
            cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            page.dispatch_event('#aimzone', 'pointerdown', {'pointerId': 81, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy})
            page.dispatch_event('#aimzone', 'pointermove', {'pointerId': 81, 'pointerType': 'touch', 'clientX': cx - 40, 'clientY': cy})
            page.evaluate("unrugTest('for(let i=0;i<8;i++) update(1/60)')")
            assert page.evaluate("unrugTest('twin.aiming && bull.ax < -.8 && R.shots.some(s => s.vx < 0)')"), f'{name}: holding the aim stick fires that way'
            page.dispatch_event('#aimzone', 'pointerup', {'pointerId': 81, 'pointerType': 'touch', 'clientX': cx - 40, 'clientY': cy})
            page.evaluate("unrugTest('for(let i=0;i<40;i++) update(1/60)')")
            # a flick: out and released at once
            page.evaluate("performance.now = (n => () => n)(performance.now())")
            page.dispatch_event('#aimzone', 'pointerdown', {'pointerId': 82, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy})
            page.dispatch_event('#aimzone', 'pointermove', {'pointerId': 82, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy - 34})
            page.dispatch_event('#aimzone', 'pointerup', {'pointerId': 82, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy - 34})
            page.evaluate("unrugTest('update(1/60)')")
            assert page.evaluate("unrugTest('bull.slash >= 0 && bull.sy < -.8')"), f'{name}: a flick slashes that way'
            # a real flick goes out and comes back before the thumb lifts: it still slashes the way it went out
            page.evaluate("unrugTest('for(let i=0;i<30;i++) update(1/60); bull.cd = 0')")
            page.dispatch_event('#aimzone', 'pointerdown', {'pointerId': 84, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy})
            page.dispatch_event('#aimzone', 'pointermove', {'pointerId': 84, 'pointerType': 'touch', 'clientX': cx + 36, 'clientY': cy})
            page.dispatch_event('#aimzone', 'pointermove', {'pointerId': 84, 'pointerType': 'touch', 'clientX': cx - 3, 'clientY': cy + 2})
            page.dispatch_event('#aimzone', 'pointerup', {'pointerId': 84, 'pointerType': 'touch', 'clientX': cx - 3, 'clientY': cy + 2})
            page.evaluate("unrugTest('update(1/60)')")
            assert page.evaluate("unrugTest('bull.slash >= 0 && bull.sx > .8')"), f'{name}: an out-and-back flick slashes the way it went out'
            # a tap: a slash at the nearest threat
            page.evaluate("unrugTest('for(let i=0;i<30;i++) update(1/60); bull.cd = 0; bull.slash = -1')")
            page.dispatch_event('#aimzone', 'pointerdown', {'pointerId': 85, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy})
            page.dispatch_event('#aimzone', 'pointerup', {'pointerId': 85, 'pointerType': 'touch', 'clientX': cx + 2, 'clientY': cy})
            page.evaluate("unrugTest('update(1/60)')")
            assert page.evaluate("unrugTest('bull.slash >= 0')"), f'{name}: a tap on the aim side slashes'
            mz = page.locator('#stickzone').bounding_box(); mx, my = mz['x'] + mz['width'] / 2, mz['y'] + mz['height'] / 2
            y0 = page.evaluate("unrugTest('bull.y')")
            page.dispatch_event('#stickzone', 'pointerdown', {'pointerId': 83, 'pointerType': 'touch', 'clientX': mx, 'clientY': my})
            page.dispatch_event('#stickzone', 'pointermove', {'pointerId': 83, 'pointerType': 'touch', 'clientX': mx, 'clientY': my - 44})
            page.evaluate("unrugTest('for(let i=0;i<20;i++) update(1/60)')")
            page.dispatch_event('#stickzone', 'pointerup', {'pointerId': 83, 'pointerType': 'touch', 'clientX': mx, 'clientY': my - 44})
            assert page.evaluate(f"unrugTest('bull.y < {y0} - 10 && twin.padX === 0 && twin.padY === 0')"), f'{name}: the move stick moves him up, release stops'
            page.evaluate("unrugTest('setFull(true); draw()')")
            page.wait_for_timeout(50)
            for sel in ['#stickzone', '#aimzone']:
                b = page.locator(sel).bounding_box()
                assert b and b['y'] + b['height'] <= size[1] + 1 and b['x'] + b['width'] <= size[0] + 1, f'{name}: {sel} fits full screen'
            page.evaluate("unrugTest('floor.startLobby(true); update(1/60); twinClass()')")
            assert page.locator('.pad.shoot').is_visible() and not page.locator('#aimzone').is_visible(), f'{name}: the lobby has the usual controls'
        assert not errors, (name, errors)
        context.close()
        print('PASS 48th Floor hash/input/layout', name)
    from elevator_audio import check_elevator_audio
    check_elevator_audio(browser, ROOT)
    browser.close()
