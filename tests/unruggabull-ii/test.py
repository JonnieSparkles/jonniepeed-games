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


def retouch(page):
    # keys hide the touch controls (they follow the last input); a touch brings them back
    page.dispatch_event('#c', 'pointerdown', {'pointerId': 99, 'pointerType': 'touch', 'clientX': 1, 'clientY': 1})
    page.dispatch_event('#c', 'pointerup', {'pointerId': 99, 'pointerType': 'touch', 'clientX': 1, 'clientY': 1})


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
        start = page.locator('.tb[data-label="Start"]')
        assert start.is_visible(), f'{name}: Start is visible'
        start.tap() if touch else start.click()   # a phone taps (a click is a mouse, which hides the pads)
        page.wait_for_timeout(300)
        assert page.locator('#crawl').is_visible(), f'{name}: the first Start tells the story'
        page.locator('#skip').tap() if touch else page.locator('#skip').click()   # a phone taps (a click is a mouse, which hides the pads)
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
            # the stairwell opens without the katana: no Slash button yet, and Shoot where it will stay; it pops in with the katana
            assert not page.locator('.pad[data-k="slash"]').is_visible(), f'{name}: no Slash before the katana'
            shoot_before = page.locator('.pad[data-k="shoot"]').bounding_box()
            page.evaluate("unrugTest('floor.Q.katana = true; padRings()')")
            assert page.locator('.pad[data-k="slash"]').is_visible() and page.locator('.pad[data-k="shoot"]').bounding_box() == shoot_before, f'{name}: Slash appears with the katana, Shoot stays put'
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
        page.evaluate("unrugTest('looping=false; floor.enter(\"round1\"); draw()')")
        # every tile of the roof's grid, and the far row's warnings, sit wholly on the canvas
        assert page.evaluate("""unrugTest('[0,1,2,3,4].every(c => [0,1,2].every(r => { const u = floor.tileU(c), z = floor.tileZ(r), hw = floor.ROOF.aisle / 5; return PX(u - hw, z) >= 0 && PX(u + hw, z) <= W && FY(z + floor.ROOF.grid.depth / 2) < H && FY(z - floor.ROOF.grid.depth / 2) > 0 || r === 0 && FY(z) < H; }))')"""), f'{name}: the roof grid fits'
        page.keyboard.down('ArrowUp')
        page.evaluate("unrugTest('for(let i=0;i<4;i++) update(1/60)')")
        page.keyboard.up('ArrowUp')
        page.evaluate("unrugTest('for(let i=0;i<20;i++) update(1/60)')")
        assert page.evaluate("unrugTest('R.roof.at.r === 1 && bull.bz > .1 && bull.jh === 0 && !keys.kbUp')"), f'{name}: arrow up steps one row up the roof'
        page.keyboard.down('KeyC')
        page.evaluate("unrugTest('update(1/60)')")
        assert page.evaluate("unrugTest('!bull.crouch')"), f'{name}: nothing ducks on the roof'
        page.keyboard.up('KeyC')
        stage = page.locator('.stage').bounding_box()
        canvas = page.locator('#c').bounding_box()
        assert canvas['y'] >= 0 and canvas['y'] + canvas['height'] <= size[1] + 1, f'{name}: whole roof canvas fits vertically'
        assert page.evaluate('document.documentElement.scrollWidth') <= size[0], name
        assert stage['x'] >= 0 and stage['x'] + stage['width'] <= size[0] + 1, name
        if touch:
            # Browsers require a tap to enter full screen; the hash starts play without that gesture.
            retouch(page)
            assert page.locator('#stickzone').is_visible() and page.locator('.pad[data-k="shoot"]').is_visible(), name
            box = page.locator('#stickzone').bounding_box()
            cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            page.dispatch_event('#stickzone', 'pointerdown', {'pointerId': 77, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy})
            page.dispatch_event('#stickzone', 'pointermove', {'pointerId': 77, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy - 40})
            page.evaluate("unrugTest('for(let i=0;i<30;i++) update(1/60)')")
            assert page.evaluate("unrugTest('R.roof.at.r === 2 && bull.jh === 0')"), f'{name}: stick up steps up the roof, repeating while held'
            page.dispatch_event('#stickzone', 'pointermove', {'pointerId': 77, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy + 40})
            page.evaluate("unrugTest('for(let i=0;i<60;i++) update(1/60)')")
            page.dispatch_event('#stickzone', 'pointerup', {'pointerId': 77, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy})
            assert page.evaluate("unrugTest('R.roof.at.r === 0 && !bull.crouch && !keys.padUp && !keys.padDown')"), f'{name}: stick down steps back and release clears input'
            assert page.locator('.pad[data-k="duck"]').count() == 0, f'{name}: the roof has no Duck pad, the same pads as everywhere'
        assert not errors, (name, errors)
        print('PASS roof hash/layout', name)
        context.close()
    # Side-view hash and existing controls.
    for name, size, touch in [('desktop', (1280, 800), False), ('phone portrait', (390, 844), True), ('phone landscape', (844, 390), True)]:
        context, page, errors = open_page(browser, url=URL + '#stage=elevator&seed=42', viewport={'width': size[0], 'height': size[1]}, has_touch=touch, is_mobile=touch)
        page.clock.install()
        page.evaluate("unrugTest('looping=false; clearHeld();')")
        assert page.evaluate("unrugTest('R.stage === \"elevator\" && RUN.seed === 42 && state === \"play\"')"), name
        assert page.locator('#card').is_hidden() and page.locator('#crawl').is_hidden(), name
        page.keyboard.down('ArrowRight')
        page.evaluate("unrugTest('for(let i=0;i<12;i++) update(1/60)')")
        page.keyboard.up('ArrowRight')
        assert page.evaluate("unrugTest('bull.u > -.55 && bull.facing === 1')"), name
        page.keyboard.press('ArrowUp')
        page.evaluate("unrugTest('update(1/60)')")
        assert page.evaluate("unrugTest('bull.jh > 0')"), name
        if touch:   # a touch on the picture brings the touch controls up (they follow the last input)
            canvas = page.locator('#c').bounding_box()
            page.touchscreen.tap(canvas['x'] + canvas['width'] * 64 / 240, canvas['y'] + canvas['height'] * 24 / 135)
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
            # Down plus right on the stick crouch-walks, in the ride and in the 13th Floor's lobby; down alone stays put.
            box = page.locator('#stickzone').bounding_box()
            cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            for where, setup in [('ride', 'newRun(null, "elevator"); setState("play"); bull.inv = 1e9; bull.u = -.3;'),
                                 ('lobby', 'newRun({stage:"elevator",transfer:true,fight:false,from:13,lobby:true,souls:0,destination:{floor:48,label:"48",stage:"floor48"}}); setState("play"); for(let i=0;i<80;i++)update(1/60); bull.u = -.5;')]:
                page.evaluate("s => unrugTest(s)", setup)
                page.dispatch_event('#stickzone', 'pointerdown', {'pointerId': 78, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy})
                page.dispatch_event('#stickzone', 'pointermove', {'pointerId': 78, 'pointerType': 'touch', 'clientX': cx, 'clientY': cy + 36})
                held = page.evaluate("unrugTest('const u0 = bull.u; for(let i=0;i<20;i++) update(1/60); [bull.crouch, bull.u - u0]')")
                assert held[0] and held[1] == 0, f'{name} {where}: stick down crouches in place {held}'
                page.dispatch_event('#stickzone', 'pointermove', {'pointerId': 78, 'pointerType': 'touch', 'clientX': cx + 28, 'clientY': cy + 36})
                moved = page.evaluate("unrugTest('const u0 = bull.u; for(let i=0;i<30;i++) update(1/60); [bull.crouch, bull.crouchWalking, bull.u - u0, TUNE.move * TUNE.crouchWalk * .5]')")
                page.dispatch_event('#stickzone', 'pointerup', {'pointerId': 78, 'pointerType': 'touch', 'clientX': cx + 28, 'clientY': cy + 36})
                assert moved[0] and moved[1] and abs(moved[2] - moved[3]) < .02, f'{name} {where}: stick down and right crouch-walks {moved}'
                assert page.evaluate("unrugTest('update(1/60); !keys.padDown && !keys.padRight && !bull.crouch')"), f'{name} {where}: release clears the stick'
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
            if size[0] > size[1]:
                a, m = page.locator('#aimzone').bounding_box(), page.locator('#stickzone').bounding_box()
                assert a['x'] + a['width'] >= size[0] - 40 and m['x'] <= 40, f'{name}: the sticks sit in the corners in full screen'
            page.evaluate("unrugTest('floor.startLobby(true); update(1/60); twinClass()')")
            assert page.locator('.pad.shoot').is_visible() and not page.locator('#aimzone').is_visible(), f'{name}: the lobby has the usual controls'
        assert not errors, (name, errors)
        context.close()
        print('PASS 48th Floor hash/input/layout', name)
    # A touch-screen laptop: the touch controls follow the last input. A tap shows them, the mouse or a key hides them.
    context, page, errors = open_page(browser, url=URL + '#stage=floor13&seed=42', viewport={'width': 1280, 'height': 800}, has_touch=True)
    page.clock.install()
    page.evaluate("unrugTest('looping=false; update(1/60); draw()')")
    pads = lambda: page.locator('#pads').is_visible()
    assert pads(), 'touch screen: pads at start'
    page.mouse.move(100, 100); page.mouse.move(140, 120)
    assert not pads(), 'touch laptop: moving the mouse hides the pads'
    page.dispatch_event('#c', 'pointerdown', {'pointerId': 91, 'pointerType': 'touch', 'clientX': 300, 'clientY': 300})
    page.dispatch_event('#c', 'pointerup', {'pointerId': 91, 'pointerType': 'touch', 'clientX': 300, 'clientY': 300})
    assert pads(), 'touch laptop: a touch brings them back'
    page.keyboard.press('KeyD')
    assert not pads(), 'touch laptop: a key hides them'
    assert not errors, errors
    context.close()
    print('PASS touch controls follow the last input')

    # The in-play layout (docs/games/unruggabull-ii/screen-space.md): in play the game fills the window on every device,
    # in or out of full screen. Wide screens: the biggest picture that leaves room for Pause; upright phones: the picture
    # edge to edge on the halfway line, the controls just below, the same on every stage; the twin sticks mirror.
    def box(page, sel):
        b = page.locator(sel).bounding_box()
        return b and page.locator(sel).is_visible() and b
    for name, (w, h), touch, full in [('S25 landscape', (780, 360), True, True), ('S25 portrait', (360, 780), True, True),
                                      ('S25 portrait, out of full screen', (360, 780), True, False), ('wide phone', (915, 412), True, True),
                                      ('tall phone', (412, 915), True, True), ('4:3 tablet', (1024, 768), True, True), ('desktop window', (1280, 800), False, False)]:
        context, page, errors = open_page(browser, url=URL + '#stage=floor13&seed=42', viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch and w < 1000)
        page.wait_for_timeout(100)
        page.evaluate("unrugTest('looping=false; for(let i=0;i<300;i++) update(1/60); draw()')")
        if touch: retouch(page)
        if full: page.evaluate("unrugTest('setFull(true)')")
        page.evaluate("unrugTest('layoutPlay(); dialSync(); draw()')")
        page.wait_for_timeout(60)
        assert page.evaluate('document.documentElement.scrollWidth') <= w, f'{name}: no sideways scroll'
        assert not page.locator('header').is_visible(), f'{name}: no header in play'
        st, ip = box(page, '.stage'), box(page, '#ipause')
        assert st and ip, f'{name}: the picture and Pause show'
        assert abs(st['width'] / st['height'] - 16 / 9) < .02, f'{name}: the picture stays 16:9 ({st})'
        assert ip['x'] >= 0 and ip['x'] + ip['width'] <= w and ip['y'] >= 0 and ip['x'] + ip['width'] / 2 > w / 2, f'{name}: Pause at the top right ({ip})'
        overlaps = not (ip['x'] + ip['width'] <= st['x'] or st['x'] + st['width'] <= ip['x'] or ip['y'] + ip['height'] <= st['y'] or st['y'] + st['height'] <= ip['y'])
        assert not overlaps, f'{name}: Pause stays off the picture, clear of the HUD'
        if w > h:
            assert st['height'] >= min(h, (w - 112) * 9 / 16, ) - 1 or st['height'] >= min(h - 48, w * 9 / 16) - 1, f'{name}: the biggest picture that leaves room for Pause ({st})'
            assert not box(page, '#dial'), f'{name}: no tower dial on a wide screen'
        else:
            assert st['x'] == 0 and abs(st['width'] - w) <= 1, f'{name}: the picture runs edge to edge'
            assert abs(st['y'] + st['height'] - h / 2) <= 1, f'{name}: its bottom on the halfway line'
            assert box(page, '#dial') and page.locator('#dialName').inner_text() == 'ACCOUNTING' and page.locator('#dialNum').inner_text() == '13', f'{name}: the tower dial shows the 13th Floor'
            z = box(page, '#stickzone')
            assert z and z['y'] >= h / 2 and z['y'] + z['height'] <= h, f'{name}: the controls start below the picture'
        if touch:
            for k in ('shoot', 'slash'):
                b = box(page, f'.pad[data-k="{k}"]')
                assert b and b['x'] >= 0 and b['x'] + b['width'] <= w and b['y'] + b['height'] <= h, f'{name}: {k} on screen'
        else:
            assert not page.locator('#pads').is_visible(), f'{name}: no touch controls'
        # Pause opens the pause card (cards.js): Resume, Restart floor, Controls, Sound, Full screen and Quit, all on
        # screen and 44 px tall
        page.locator('#ipause').tap() if touch else page.locator('#ipause').click()
        assert page.evaluate("unrugTest('state')") == 'pause', f'{name}: Pause pauses'
        page.wait_for_timeout(450)   # the strip slides in, then its buttons show
        want = ['Resume', 'Restart floor', 'Controls', 'Sound', 'Full screen', 'Quit'] if page.evaluate("unrugTest('canFull')") else ['Resume', 'Restart floor', 'Controls', 'Sound', 'Quit']
        labels = page.evaluate("unrugTest('Cards.labels()')")
        assert len(labels) == len(want) and all(l.startswith(k) or (k == 'Full screen' and 'full screen' in l.lower()) for l, k in zip(labels, want)), f'{name}: the pause card buttons {labels}'
        for i in range(len(labels)):
            b = page.locator('.lcard .lb').nth(i).bounding_box()
            assert b and b['height'] >= 43 and b['y'] >= 0 and b['y'] + b['height'] <= h and b['x'] >= 0 and b['x'] + b['width'] <= w, f'{name}: {labels[i]} on the pause card ({b})'
        ctl = page.locator('.lcard .lb', has_text='Controls')
        ctl.tap() if touch else ctl.click()
        assert page.locator('#keyList').is_visible() and page.locator('#cardTitle').inner_text() == 'Controls', f'{name}: Controls lists the controls'
        assert ('slide the stick' if touch else 'Enter, K or X') in page.locator('#keyList').inner_text(), f'{name}: for this device'
        page.locator('#go').tap() if touch else page.locator('#go').click()
        assert page.evaluate("unrugTest('Cards.kind')") == 'pause', f'{name}: Back returns to the pause card'
        page.wait_for_timeout(450)
        res = page.locator('.lcard .lb', has_text='Resume')
        res.tap() if touch else res.click()
        assert page.evaluate("unrugTest('state')") == 'play', f'{name}: Resume'
        if touch:
            # the 48th Floor: the picture stays where it was, and the two sticks mirror each other
            page.evaluate("unrugTest(\"travel('floor48'); looping=false; for(let i=0;i<240;i++){bull.inv=1e9;update(1/60);} R.td.locked=false; twinClass(); layoutPlay(); dialSync();\")")
            page.wait_for_timeout(60)
            st2 = box(page, '.stage')
            assert st2 == st, f'{name}: the picture stays put on the 48th ({st} {st2})'
            m, a = box(page, '#stickzone'), box(page, '#aimzone')
            assert m and a and abs(m['y'] - a['y']) <= 1 and abs(m['height'] - a['height']) <= 1 and abs(m['x'] - (w - a['x'] - a['width'])) <= 1, f'{name}: the twin sticks mirror ({m} {a})'
            if h > w:
                assert page.locator('#dialNum').inner_text() == '48', f'{name}: the dial moves to 48'
        assert not errors, (name, errors)
        context.close()
        print('PASS in-play layout', name)
    # The title screen (title.js, title-plan.md): it fills the window like play, with no header. Upright the painting
    # fills the screen above the panel and its safe zone (the logo's sky down to his feet) and the logo stay on screen;
    # sideways it's play's 16:9 picture with the panel over its bottom. Every button is on screen and 44 px tall; a
    # pick sticks on the device; Exit goes back to JonniePeed Games.
    for name, (w, h), touch in [('short phone', (360, 640), True), ('S25 portrait', (360, 780), True), ('iPhone', (390, 844), True),
                                ('tall phone', (412, 915), True), ('tablet upright', (768, 1024), True), ('S25 landscape', (780, 360), True),
                                ('4:3 tablet', (1024, 768), True), ('desktop window', (1280, 800), False)]:
        context, page, errors = open_page(browser, viewport={'width': w, 'height': h}, has_touch=touch, is_mobile=touch and w < 1000)
        page.wait_for_timeout(250)
        assert page.evaluate("unrugTest('state')") == 'title' and page.evaluate("unrugTest('Title.open')"), f'{name}: the title is up'
        assert not page.locator('header').is_visible() and not page.locator('#card').is_visible(), f'{name}: no header or HTML card'
        assert page.evaluate('document.documentElement.scrollWidth') <= w, f'{name}: no sideways scroll'
        lay = page.evaluate("unrugTest('Title.layout')")
        assert lay['upright'] == (w < h), f'{name}: upright or not'
        assert lay['safe'][0] >= -1 and lay['safe'][1] <= h + 1, f'{name}: the safe zone on screen ({lay["safe"]})'
        assert lay['logo'][0] >= -1 and lay['logo'][1] <= h + 1, f'{name}: the logo on screen ({lay["logo"]})'
        ids = [b['id'] for b in lay['buttons']]
        for want in ('mode0', 'mode1', 'mode2', 'start', 'sound', 'exit'):
            assert want in ids, f'{name}: {want} shows ({ids})'
        assert 'board' not in ids, f'{name}: no board line until the boards exist'
        assert ('full' in ids) == page.evaluate('!!(document.fullscreenEnabled || document.webkitFullscreenEnabled)'), f'{name}: full screen shows where the browser can do it ({ids})'
        for b in lay['buttons']:
            assert b['x'] >= -1 and b['y'] >= -1 and b['x'] + b['w'] <= w + 1 and b['y'] + b['h'] <= h + 1, f'{name}: {b["id"]} on screen ({b})'
            assert min(b['w'], b['h']) >= 43, f'{name}: {b["id"]} at least 44 px ({b})'
        assert not errors, (name, errors)
        context.close()
        print('PASS title layout', name)
    context, page, errors = open_page(browser, viewport={'width': 360, 'height': 780}, has_touch=True, is_mobile=True)
    page.wait_for_timeout(200)
    assert page.evaluate("unrugTest('Title.mode')") == 'regular', 'title: Regular by default'
    page.locator('.tb[data-label="RAGING BULL"]').tap()
    assert page.evaluate("unrugTest('Title.mode + RUN.mode')") == 'ragingraging', 'title: a pick sets the mode'
    assert page.locator('.tb[data-label="RAGING BULL"]').get_attribute('aria-pressed') == 'true', 'title: the pick is pressed'
    page.reload(); page.wait_for_timeout(200)
    assert page.evaluate("unrugTest('Title.mode')") == 'raging', 'title: the pick is kept on the device'
    page.keyboard.press('ArrowLeft')
    assert page.evaluate("unrugTest('Title.mode')") == 'regular', 'title: the arrows change the mode'
    was = page.evaluate("unrugTest('Snd.muted')")
    page.locator('.tb.tsnd').tap(); page.locator('.tb.tsnd').tap()
    assert page.evaluate("unrugTest('Snd.muted')") == was, 'title: sound flips and flips back'
    page.locator('.tb[data-label="Full screen"]').tap(); page.wait_for_timeout(150)
    assert page.evaluate("unrugTest('isFull()')") and page.evaluate("unrugTest('Title.open')"), 'title: full screen, still on the title'
    page.locator('.tb[data-label="Full screen"]').tap(); page.wait_for_timeout(150)
    assert not page.evaluate("unrugTest('isFull()')"), 'title: and back'
    with page.expect_navigation():
        page.locator('.tb[data-label="Exit to JonniePeed Games"]').tap()
    assert page.url.rstrip('/').endswith(':8000') or page.url.endswith('/site/'), f'title: Exit goes to JonniePeed Games ({page.url})'
    assert not errors, errors
    context.close()
    print('PASS title pick, sound, full screen and Exit')

    # The controls audit's fixes (Oct 15): Enter starts from the title; the blaster only where there's a fight (both
    # lobbies and the quiet ride are katana only, with a dry click, no charge bar and no supplies); Shift fires on the
    # 48th Floor as it does everywhere else.
    context, page, errors = open_page(browser, viewport={'width': 1280, 'height': 800})
    page.wait_for_timeout(100)
    page.keyboard.press('Enter')
    assert page.evaluate("unrugTest('state')") == 'intro', 'Enter on the title starts'
    context.close()
    for label, hsh, setup, off in [('the 13th Floor lobby', '#stage=elevator&at=lobby&seed=42', 'for(let i=0;i<150;i++)update(1/60);', True),
                                   ('the quiet ride', '#stage=elevator&seed=42', "travel('elevator', { fight: false, from: 13, destination: { floor: 48, label: '48', stage: 'floor48' } }); looping=false; for(let i=0;i<300;i++)update(1/60);", True),
                                   ('the 48th Floor lobby', '#stage=floor48&at=lobby&seed=42', 'for(let i=0;i<150;i++)update(1/60);', True),
                                   ('the long ride', '#stage=elevator&seed=42', 'for(let i=0;i<300;i++)update(1/60);', False)]:
        context, page, errors = open_page(browser, url=URL + hsh, viewport={'width': 1280, 'height': 800})
        page.wait_for_timeout(100)
        page.evaluate("unrugTest(%r)" % ('looping=false;' + setup + " bull.u=0; bull.inv=1e9; R.events.shots=0; R.fireT=0; window.__s=[]; Snd.play=(o=>function(n){__s.push(n);return o.apply(this,arguments)})(Snd.play);"))
        page.keyboard.down('ShiftLeft'); page.evaluate("unrugTest('for(let i=0;i<20;i++)update(1/60)')"); page.keyboard.up('ShiftLeft')
        shots, clicked, bar = page.evaluate("unrugTest('[R.events.shots||0, __s.includes(\"sputter\"), !blasterOff()]')")
        if off:
            assert shots == 0 and clicked and not bar, f'{label}: katana only (a dry click, no charge bar)'
        else:
            assert shots > 0 and not clicked and bar, f'{label}: the blaster works'
        page.keyboard.press('Enter'); page.evaluate("unrugTest('update(1/60)')")
        assert page.evaluate("unrugTest('bull.slash >= 0')"), f'{label}: the katana works'
        assert not errors, (label, errors)
        context.close()
    context, page, errors = open_page(browser, url=URL + '#stage=floor48&seed=42', viewport={'width': 1280, 'height': 800})
    page.wait_for_timeout(100)
    page.evaluate("unrugTest(\"looping=false; for(let i=0;i<2400 && !(R.phase==='boss' && !R.td.locked && R.t>3);i++){bull.inv=1e9;update(1/60);} R.events.shots=0; R.fireT=0; bull.cd=0; bull.slash=-1;\")")
    page.keyboard.down('ShiftLeft'); page.evaluate("unrugTest('for(let i=0;i<20;i++){bull.inv=1e9;update(1/60);}')"); page.keyboard.up('ShiftLeft')
    assert page.evaluate("unrugTest('R.events.shots > 0 && bull.slash < 0')"), 'the 48th Floor: Shift fires, as everywhere else'
    assert not errors, errors
    context.close()
    print('PASS controls: Enter starts, katana-only lobbies and quiet ride, Shift fires on the 48th')
    from elevator_audio import check_elevator_audio
    check_elevator_audio(browser, ROOT)
    browser.close()
