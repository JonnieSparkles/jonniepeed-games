"""Co-op checks (docs/games/stick-army/coop.md) that need no room: one page plays as the host and a second page draws
only from the host's messages, as a guest would. Serve site/ on port 8000, then run python3 tests/stick-army/coop.py.

Checks: every message rebuilds exactly the host's field (rounded for the wire), messages stay small, new particles,
ink, sounds and voices arrive, the guest's own barrel answers at once and its aim and trigger reach the host, and the
guest's page draws what the host's draws. SCREENSHOTS saves the two pictures (default /tmp/stick-army-coop).
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SITE = os.environ.get('SITE_URL', 'http://127.0.0.1:8000')
SHOTS = Path(os.environ.get('SCREENSHOTS', '/tmp/stick-army-coop'))
SHOTS.mkdir(parents=True, exist_ok=True)
SOURCE = (ROOT / 'site/stick-army/game.js').read_text().replace(
    '  start();', "  window.armyTest = function (code) { return eval(code); };\n  start();")


def page_for(browser):
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('**/stick-army/game.js*', lambda route: route.fulfill(body=SOURCE, content_type='application/javascript'))
    page.goto(SITE + '/stick-army/')
    page.clock.install()
    page.clock.pause_at(10 ** 13)
    page.errors = errors
    return page


def js(page, code):
    return page.evaluate('(c) => armyTest(c)', code)


def check(ok, why):
    if not ok:
        raise AssertionError(why)
    print('ok', why)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
    host, guest = page_for(browser), page_for(browser)

    # A busy co-op wave with a strong kit, the host's barrel firing at whatever is lowest.
    js(host, """
      RUN.players = 2; RUN.force = 7; newGame(); RUN.players = 1; RUN.force = null;
      ['spread', 'double', 'rockets', 'flak'].forEach(function (id) { ITEMS.find(function (q) { return q.id === id; }).apply({ mods: S.turrets[0].mods }); });
      ['auto', 'hospital'].forEach(function (id) { ITEMS.find(function (q) { return q.id === id; }).apply(S); });
      S.mods.slots = 8; S.recruits = unlockedSlots().map(function (s, i) { return makeRecruit(s, ['rifle', 'bazooka', 'engineer', 'medic'][i % 4]); });
      startWave(12); boil = 0; S.hint = false;
      window.sent = []; window.heard = []; window.clock = 0;
      COOP.startHost(function (m) { window.sent.push(JSON.stringify(m)); });
      window.step = function (n) {
        for (var i = 0; i < n; i++) {
          var tg = S.troopers.filter(function (t) { return !t.dead; }).sort(function (a, b) { return b.y - a.y; })[0], g = S.turrets[0];
          if (tg) { g.aim = clamp(Math.atan2(tg.y - TUR.y, tg.x - g.x), AIM_MIN, AIM_MAX); g.firing = true; }
          update(1 / 60); window.clock += 1000 / 60; S.shake = 0; COOP.hostTick(window.clock, i === n - 1);
        }
      };
      'ok'
    """)
    js(guest, """
      me = 1; COOP.startGuest(); boil = 0; window.heardSounds = [];
      var play = sound.play; sound.play = function (n) { window.heardSounds.push(n); };
      var join = COOP.Joiner();
      window.feed = function (list) { list.forEach(function (m) { var whole = join(JSON.parse(m)); if (whole) COOP.receive(whole, 0); }); };
      'ok'
    """)

    sizes, frames = [], 0
    for round_ in range(90):
        js(host, 'step(6)')
        frames += 6
        msgs = js(host, 'var out = window.sent; window.sent = []; out')
        sizes += [len(m) for m in msgs]
        # The guest draws at the host's newest moment (its clock offset is the newest h, DELAY folded in).
        guest.evaluate('([list]) => armyTest("feed(" + JSON.stringify(list) + ")")', [msgs])
        newest = json.loads(msgs[-1])['h'] if msgs else None
        if newest is not None:
            js(guest, f'for (var i = 0; i < 6; i++) COOP.guestFrame(1 / 60, COOP.DELAY); "ok"')
            # Exact field: what the host would send now, decoded, against the guest's field (particles aside).
            same = js(host, """
              var pick = {}; for (var k in S) if (!COOP.LEAVE[k]) pick[k] = S[k];
              pick._tramps = TRAMPS.map(function (t) { return t.dip; });
              JSON.stringify(COOP.Encoder().clean(pick))
            """)
            got = js(guest, 'var o = {}; for (var k in S) if (k !== "parts") o[k] = S[k]; JSON.stringify(o)')
            a, b = json.loads(same), json.loads(got)
            # The guest's own barrel is where its player has it, not where the host last heard.
            for t in (a.get('turrets') or []) + (b.get('turrets') or []):
                if t.get('gun') == 1:
                    t.pop('aim', None); t.pop('firing', None)

            def untag(v):   # hidden list tags differ between encoders
                if isinstance(v, dict):
                    return {k: untag(x) for k, x in v.items() if k != '$'}
                if isinstance(v, list):
                    return [untag(x) for x in v]
                return v

            def canon(v):
                return json.dumps(untag(v), sort_keys=True)
            if canon(a) != canon(b):
                diff = [k for k in set(a) | set(b) if canon(a.get(k)) != canon(b.get(k))]
                raise AssertionError('round %d: the guest field differs from the host at %s' % (round_, diff[:8]))
    check(True, 'every message rebuilt the host field exactly (%d frames, %d messages)' % (frames, len(sizes)))
    sizes.sort()
    check(sizes[len(sizes) // 2] < 4000 and sizes[-1] <= 16000, 'messages stay small: median %d, largest %d bytes (limit 16 KB; long ones go in pieces)' % (sizes[len(sizes) // 2], sizes[-1]))

    parts = js(guest, 'S.parts.length')
    check(parts > 10, 'new particles arrive and move on the guest (%d live)' % parts)
    marks, host_marks = js(guest, 'decals.length'), js(host, 'decals.length')
    check(host_marks > 0 and abs(marks - host_marks) <= max(3, host_marks // 4), 'ink arrives on the guest page (%d marks, the host %d)' % (marks, host_marks))
    heard = js(guest, 'window.heardSounds.length')
    check(heard > 20, 'sounds arrive (%d)' % heard)

    # The pictures: both pages draw now. Particles move on each page, so a little difference is expected.
    js(host, 'render(); "ok"')
    js(guest, 'titleScreen.hidden = true; pauseBtn.hidden = false; S.mode = "play"; fit(); COOP.guestFrame(0, COOP.DELAY); render(); "ok"')
    host.screenshot(path=str(SHOTS / 'host.png'))
    guest.screenshot(path=str(SHOTS / 'guest.png'))
    diff = host.evaluate("""async ([a, b]) => {
      async function px(u) { const i = new Image(); i.src = u; await i.decode(); const c = new OffscreenCanvas(i.width, i.height), g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; }
      const x = await px(a), y = await px(b); let d = 0, n = 0;
      for (let i = 0; i < x.length; i += 4) { const e = Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]); if (e > 60) d++; n++; }
      return d / n;
    }""", ['data:image/png;base64,' + __import__('base64').b64encode((SHOTS / 'host.png').read_bytes()).decode(),
           'data:image/png;base64,' + __import__('base64').b64encode((SHOTS / 'guest.png').read_bytes()).decode()])
    # Each player sees their own combo and aim guide, and particles move on each page, so a little differs.
    check(diff < 0.03, 'the guest page draws what the host page draws (%.2f%% of pixels differ)' % (diff * 100))

    # The guest's barrel: it turns at once on the guest and its aim and trigger reach the host.
    js(guest, 'keys.left = true; COOP.guestFrame(0.3, COOP.DELAY); keys.left = false; S.turrets[1].firing = true; COOP.guestFrame(0, COOP.DELAY); "ok"')
    sent = js(guest, 'COOP.guestInput()')
    check(sent and sent['d'] == 1, 'the guest sends its aim and trigger: %s' % sent)
    js(host, 'COOP.hostInput(%s, 2); "ok"' % json.dumps(sent))
    on_host = js(host, '[S.turrets[1].aim, S.turrets[1].firing]')
    check(abs(on_host[0] - sent['a']) < 1e-9 and on_host[1], 'the host turns and fires the guest barrel')

    check(not host.errors and not guest.errors, 'no page errors %s %s' % (host.errors[:2], guest.errors[:2]))
    browser.close()
