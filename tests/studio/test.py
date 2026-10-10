"""Studio browser acceptance checks. Serve site/ on port 8000, then run this file.
Requires Python Playwright; CHROMIUM selects a system browser, SITE_URL a site mount.
The timing/render bridge is injected into the response, never shipped with the site.
"""
import os
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[2]
URL = os.environ.get('SITE_URL', 'http://127.0.0.1:8000').rstrip('/') + '/'
OUT = Path(os.environ.get('SCREENSHOTS', '/tmp/studio-screenshots'))
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = (ROOT / 'site/assets/studio/ident.js').read_text().replace(
    '  size(); draw(); start();',
    '  window.studioTest = function(code) { return eval(code); };\n  size(); draw(); start();')


def focus_outline(page, keyboard=False):
    heading = page.locator('#shelfHeading')
    expect(heading).to_be_focused()
    # A ring only after keyboard use. Chromium can match :focus-visible after a touch flip, which the page marks
    # with data-pointer so no ring is drawn; the outline check below is what people see.
    assert heading.evaluate('(el) => el.matches(":focus-visible") && !el.hasAttribute("data-pointer")') == keyboard
    expect(heading).to_have_css('outline-style', 'solid' if keyboard else 'none')
    box = heading.bounding_box()
    assert box['y'] >= 0 and box['y'] + box['height'] <= page.viewport_size['height']


def reload(page):
    page.reload(wait_until='load')
    page.wait_for_load_state('load')


def follow(page, selector, path='', card=False):
    page.locator(selector).click()
    if card:
        page.clock.run_for(200)  # with sound on, a card click waits a beat so its blip is heard
    expect(page).to_have_url(URL + path)
    page.wait_for_load_state('load')


def state(page, side, focus=False, keyboard=False):
    page.wait_for_load_state('load')
    expect(page.locator('#shelfHeading')).to_have_text('Games' if side == 'a' else 'Side B')
    assert page.locator('.card:visible').count() == (3 if side == 'a' else 1)
    assert page.locator('#sideA').is_visible() == (side == 'b')
    assert page.locator('.card[hidden]').count() == (1 if side == 'a' else 3)
    assert page.locator('[data-side="b"]').is_visible() == (side == 'b')
    if focus:
        focus_outline(page, keyboard)
    # Real Tab traversal and accessibility snapshot must exclude inactive cards/button.
    page.locator('#shelfHeading').focus()
    reached = []
    for _ in range(7):
        page.keyboard.press('Tab')
        assert page.evaluate('!document.activeElement.closest("[hidden]")')
        reached.append(page.evaluate('document.activeElement.getAttribute("href")'))
        if side == 'a':
            assert page.evaluate('document.activeElement.id !== "sideA"')
    assert ('stick-army/' in reached) == (side == 'b'), reached
    assert ('thimbleful/' in reached) == (side == 'a'), reached
    snapshot = page.locator('.grid').aria_snapshot()
    assert ('Stick Army' in snapshot) == (side == 'b'), snapshot
    assert ('Thimbleful' in snapshot) == (side == 'a'), snapshot


def prepare(page, suffix=''):
    response = page.goto(URL + suffix, wait_until='load')
    if response is None:
        reload(page)  # Hash entry is intentionally checked only on a fresh document.
    page.wait_for_load_state('load')
    page.evaluate('document.fonts.ready')
    page.locator('#ident').scroll_into_view_if_needed()
    page.clock.run_for(100)
    page.evaluate('''() => {
      window.flips = [];
      new MutationObserver(() => flips.push(document.getElementById('shelfHeading').textContent))
        .observe(document.getElementById('shelfHeading'), {childList:true});
    }''')


def press(page, key=None):
    egg = page.locator('#ident')
    egg.scroll_into_view_if_needed()
    page.clock.run_for(100)
    if key:
        egg.focus()
        page.keyboard.down(key)
    else:
        box = egg.bounding_box()
        page.mouse.move(box['x'] + 20, box['y'] + 20)
        page.mouse.down()


def release(page, key=None):
    page.keyboard.up(key) if key else page.mouse.up()


def puddle_pixel(page):
    # Exclude random splash particles while inspecting the puddle's fifth rainbow row.
    return page.evaluate('studioTest("(() => { const saved = parts; parts = []; draw(); const pixel = Array.from(g.getImageData(W-10, GROUND-5, 1, 1).data); parts = saved; return pixel; })()")')


def hold_flip(page, key=None, calm=False):
    page.evaluate('flips = []')
    page.clock.run_for(1000)  # Let any previous power decay.
    press(page, key)
    scroll = page.evaluate('scrollY')
    page.clock.run_for(1300)
    assert page.evaluate('studioTest("power < 1 && overflow === 0")')
    page.clock.run_for(300)
    assert page.evaluate('studioTest("power === 1 && overflow > 0 && overflow < 0.3")')
    early = puddle_pixel(page)
    page.clock.run_for(2100)
    expect(page.locator('#shelfHeading')).to_have_text('Games')
    assert puddle_pixel(page) == [138, 43, 226, 255] and early != [138, 43, 226, 255]
    if key:
        # Repeat events must prevent scrolling without starting another hold.
        page.keyboard.down(key)
        assert page.evaluate('scrollY') == scroll
    page.clock.run_for(850)
    if not calm:
        assert page.locator('.grid').evaluate('(el) => el.inert')
        assert page.locator('.grid').evaluate('(el) => el.classList.contains("flip-out")')
        page.clock.run_for(200)
        assert page.locator('[data-side="b"]').get_attribute('hidden') is None
        assert page.locator('.grid').evaluate('(el) => el.inert && el.classList.contains("flip-in")')
    page.clock.run_for(300)
    assert not page.locator('.grid').evaluate('(el) => el.inert')
    assert page.evaluate('flips') == ['Side B']
    focus_outline(page, keyboard=bool(key))
    page.clock.run_for(5000)  # A continuous hold cannot flip twice or toggle back.
    release(page, key)
    assert page.evaluate('flips') == ['Side B']
    state(page, 'b')
    if key:
        page.locator('#sideA').focus()
        page.keyboard.press('Enter')
    else:
        page.locator('#sideA').click()
    page.clock.run_for(450)
    state(page, 'a', focus=True, keyboard=bool(key))


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
    errors = []
    expect.set_options(timeout=15000)
    def new_page(**options):
        context = browser.new_context(**options)
        page = context.new_page()
        page.set_default_navigation_timeout(60000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('response', lambda response: errors.append(str(response.status) + ' ' + response.url) if response.status >= 400 else None)
        page.on('requestfailed', lambda request: errors.append(request.url + ' ' + str(request.failure))
                if request.failure != 'net::ERR_ABORTED' else None)
        page.route('**/assets/studio/ident.js*', lambda route: route.fulfill(body=SOURCE, content_type='application/javascript'))
        # Stick Army's title lists its online top five; answer for the scores Worker, which isn't running here.
        page.route('http://localhost:8787/**', lambda route: route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body='{"ok":true,"game":"stick-army","board":1,"scores":[]}'))
        page.clock.install(time=datetime(2026, 1, 1, tzinfo=timezone.utc))
        page.clock.pause_at(datetime(2026, 1, 1, 0, 0, 1, tzinfo=timezone.utc))
        return context, page

    context, page = new_page(viewport={'width':1440, 'height':900})
    prepare(page)
    assert page.evaluate('document.activeElement === document.body')  # Initial load does not steal focus.
    state(page, 'a')
    assert page.locator('meta[name="robots"]').count() == 0
    assert page.locator('[data-side="b"]').get_attribute('data-badge') == 'demo'
    assert page.locator('[data-side="b"] .badge').text_content() == 'demo'
    # Both pre-charge and almost-complete overflow release preserve the original splash.
    for duration in [600, 4100, 2400, 2400]:
        page.clock.run_for(1000)
        press(page)
        page.clock.run_for(duration)
        release(page)
        assert page.evaluate('studioTest("overflow === 0 && !holding")')
        if duration > 1400:
            assert page.evaluate('studioTest("splashT > 0 && parts.length >= 40")')
        page.clock.run_for(500)
        expect(page.locator('#shelfHeading')).to_have_text('Games')
    print('PASS default, early releases, separate holds and existing splash')
    hold_flip(page)
    for key in ['Space', 'Enter']:
        hold_flip(page, key)
    print('PASS pointer/Space/Enter threshold, puddle, one flip, transition guard, Side A and focus/tab/a11y')

    # Cancelled input must not resume without a fresh press; exercise background visibility explicitly.
    for cancel in ['pointercancel', 'lostpointercapture', 'blur', 'window-blur', 'hidden']:
        press(page)
        page.clock.run_for(3000)
        if cancel == 'hidden':
            page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange'))")
        elif cancel == 'window-blur':
            page.evaluate("window.dispatchEvent(new Event('blur'))")
        elif cancel == 'blur':
            page.locator('#shelfHeading').focus()
        else:
            page.evaluate('(kind) => document.getElementById("ident").dispatchEvent(new PointerEvent(kind,{pointerId:1}))', cancel)
        assert page.evaluate('studioTest("overflow === 0 && !holding")'), cancel
        page.clock.run_for(5000)
        if cancel == 'hidden':
            page.evaluate("delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))")
        release(page)
        page.clock.run_for(1000)
        expect(page.locator('#shelfHeading')).to_have_text('Games')
    print('PASS pointer cancellation/capture loss, element/window blur and background reset')

    # Hash wins over stored A, clears only itself on explicit A, and keeps the query.
    prepare(page, '?visit=demo#side-b')
    expect(page.locator('#shelfHeading')).to_have_text('Side B')
    assert page.evaluate('sessionStorage.getItem("jonniepeed.shelfSide")') == 'b'
    assert not page.evaluate('studioTest("flipping")')
    assert page.evaluate('document.activeElement === document.body')
    state(page, 'b')
    reload(page)
    expect(page.locator('#shelfHeading')).to_have_text('Side B')
    follow(page, '[data-side="b"]', 'stick-army/', card=True)
    assert page.url == URL + 'stick-army/'
    assert page.locator('meta[name="robots"]').get_attribute('content') == 'noindex'
    for selector in ['link[rel="icon"][type="image/png"]', 'link[rel="apple-touch-icon"]']:
        assert page.locator(selector).count() == 1
    assert page.locator('#titleScreen .back img').evaluate('(el) => el.complete && el.naturalWidth > 0')
    follow(page, '#titleScreen .back')
    assert page.url == URL
    expect(page.locator('#shelfHeading')).to_have_text('Side B')
    reload(page)
    expect(page.locator('#shelfHeading')).to_have_text('Side B')
    page.locator('#sideA').click()
    page.clock.run_for(450)
    state(page, 'a', focus=True)
    reload(page)
    expect(page.locator('#shelfHeading')).to_have_text('Games')
    follow(page, 'a[href="thimbleful/"]', 'thimbleful/', card=True)
    follow(page, '.back')
    expect(page.locator('#shelfHeading')).to_have_text('Games')
    prepare(page, '?visit=demo#side-b')
    page.locator('#sideA').click()
    page.clock.run_for(450)
    assert page.url == URL + '?visit=demo'
    reload(page)
    expect(page.locator('#shelfHeading')).to_have_text('Games')
    prepare(page, '#other')
    hold_flip(page, 'Enter')
    assert page.url == URL + '#other'
    print('PASS hash priority, query/other fragment preservation, reload and Side A/B game round trips')
    context.close()

    # A fresh mouse visit has focus movement without a keyboard outline.
    context, page = new_page(viewport={'width':1000, 'height':900})
    prepare(page)
    press(page)
    # Holding the egg with a mouse focuses it without a keyboard ring.
    expect(page.locator('#ident')).to_be_focused()
    assert not page.locator('#ident').evaluate('(el) => el.matches(":focus-visible")')
    expect(page.locator('#ident')).to_have_css('outline-style', 'none')
    page.clock.run_for(4900)
    release(page)
    focus_outline(page)
    assert not page.locator('#shelfHeading').evaluate('(el) => el.matches(":focus-visible")')
    expect(page.locator('#shelfHeading')).to_have_css('outline-style', 'none')
    context.close()
    print('PASS mouse focus without outline; keyboard outline follows :focus-visible')

    # Layout, themes, touch hold, reduced motion (no idle RAF) and repeated keyboard input.
    for width, height, theme, calm in [(1440,900,'dark',False),(390,844,'light',False),(844,390,'dark',True),(320,568,'light',True)]:
        context, page = new_page(viewport={'width':width,'height':height}, has_touch=True,
                                 color_scheme=theme, reduced_motion='reduce' if calm else 'no-preference')
        prepare(page)
        expect(page.locator('#shelfHeading')).to_have_text('Games')
        if calm:
            before = page.locator('#ident').evaluate('(el) => el.toDataURL()')
            page.clock.run_for(1000)
            assert not page.evaluate('studioTest("running")')
            assert before == page.locator('#ident').evaluate('(el) => el.toDataURL()')
            hold_flip(page, 'Space', calm=True)
        # Real CDP touchStart/touchEnd (Playwright tap cannot sustain a hold).
        egg = page.locator('#ident'); egg.scroll_into_view_if_needed(); page.clock.run_for(100)
        box = egg.bounding_box()
        cdp = context.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':box['x']+20,'y':box['y']+20}]})
        page.clock.run_for(4900)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        assert page.url == URL  # Releasing the discovery touch must not click a card.
        if not calm:
            # These fresh contexts have not used the keyboard before touch.
            expect(page.locator('#shelfHeading')).to_have_css('outline-style', 'none')
        state(page, 'b', focus=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert page.locator('[data-side="b"] img').evaluate('(el) => el.complete && el.naturalWidth === 768')
        page.locator('#shelfHeading').scroll_into_view_if_needed()
        page.screenshot(path=str(OUT / f'side-b-{width}-{theme}.png'))
        page.locator('#sideA').click()
        page.clock.run_for(450)
        state(page, 'a', focus=True)
        context.close()
        print('PASS touch/layout/theme/reduced motion', width, height, theme, calm)

    context, page = new_page(viewport={'width':1000,'height':900}, reduced_motion='reduce')
    page.add_init_script("Storage.prototype.getItem = Storage.prototype.setItem = function(){throw new Error('storage denied');}")
    prepare(page)
    hold_flip(page, 'Enter', calm=True)
    prepare(page, '#side-b')
    state(page, 'b')
    print('PASS denied storage: hold, Side A and direct hash')
    context.close()

    context, page = new_page()
    page.add_init_script("sessionStorage.setItem('jonniepeed.shelfSide','unknown')")
    prepare(page)
    state(page, 'a')
    # Edit HTML attributes before the script executes, including an HTML-looking label.
    html = (ROOT / 'site/index.html').read_text().replace('data-badge="demo"', 'data-badge="&lt;new label&gt;"')
    page.route(URL, lambda route: route.fulfill(body=html, content_type='text/html'))
    prepare(page)
    assert page.locator('.badge').text_content() == '<new label>'
    assert page.locator('.badge').evaluate('(el) => el.children.length') == 0
    page.goto(URL + '#side-b', wait_until='load')
    page.wait_for_load_state('load')
    reload(page)
    assert '<new label>' in page.locator('.grid').aria_snapshot()
    print('PASS unknown storage and visible/accessibility badge sourced from data-badge as text')
    context.close()

    context = browser.new_context(java_script_enabled=False)
    page = context.new_page()
    page.goto(URL + '#side-b', wait_until='load')
    page.wait_for_load_state('load')
    assert page.locator('.card:visible').count() == 3
    assert page.locator('[data-side="b"]').is_hidden()
    assert page.locator('#sideA').is_hidden()
    context.close()
    assert not errors, errors
    browser.close()
print('PASS studio acceptance checks; screenshots:', OUT)
