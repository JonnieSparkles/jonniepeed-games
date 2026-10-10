"""Balance bots: play many seeded runs headless at several skill levels and report how far they get (SPEC-005).

    python3 tools/balance/run.py stick-army --runs 200 --skills casual,decent,expert
    python3 tools/balance/run.py stick-army --runs 200 --skills decent --ref main
    python3 tools/balance/run.py stick-army --runs 200 --skills decent --ref main --ref-bot own
    python3 tools/balance/run.py stick-army --runs 5 --verify

Run by hand; nothing here is pass/fail. Serves site/ itself and launches Chromium like the other harnesses
(CHROMIUM selects a system browser). Each opted-in game provides tests/<slug>/balance.json (page, script and
bridge point, report columns), balance.js (the hook contract, evaluated in the game's scope through a bridge
injected into the response; never shipped) and bot.js. Output goes to work/balance/<timestamp>/ (git-ignored):
results.json with one record per run, and summary.md.
"""
import argparse
import functools
import http.server
import json
import multiprocessing
import os
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
import report  # noqa: E402

BRIDGE = 'window.__balanceEval = function (code) { return eval(code); };\n'
CHUNK = 3600  # steps per call into the page: one simulated minute


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(directory):
    handler = functools.partial(QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, 'http://127.0.0.1:%d/' % server.server_port


def variant(name, tree, slug, base, bot_source):
    """Everything a worker needs to play one version of the game: its site, adapter and the current bot."""
    tests = tree / 'tests' / slug
    if not (tests / 'balance.js').is_file():
        sys.exit('%s has no tests/%s/balance.js; balance bots need a version that has the adapter.' % (name, slug))
    config = json.loads((tests / 'balance.json').read_text())
    script = (tree / 'site' / config['script']).read_text()
    if config['inject_before'] not in script:
        sys.exit('%s: bridge point %r not found in %s' % (name, config['inject_before'], config['script']))
    return {
        'name': name, 'base': base, 'page': config['page'], 'script_path': config['script'],
        'script': script.replace(config['inject_before'], BRIDGE + config['inject_before'], 1),
        'adapter': (tests / 'balance.js').read_text(), 'bot': bot_source,
        'driver': (ROOT / 'tools/balance/driver.js').read_text(), 'config': config,
    }


# ---------- worker processes: one browser and page each ----------
_page = None
_setup_error = None


def init_worker(v):
    # A failing initializer would make the pool respawn workers forever, so keep the error and report it per task.
    global _page, _setup_error
    try:
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM'))
        _page = browser.new_page()
        _page.route('**/' + v['script_path'] + '*', lambda route: route.fulfill(body=v['script'], content_type='application/javascript'))
        _page.clock.install()  # the page's own frame loop never ticks; only the driver advances the game
        _page.goto(v['base'] + v['page'])
        _page.evaluate('(code) => window.__balanceEval(code)', v['adapter'])
        # Let the frame the game had already scheduled fire before any run starts.
        _page.evaluate('() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))')
        for source in (v['bot'], v['driver']):
            _page.evaluate('(code) => { (0, eval)(code); }', source)  # global scope, never called as a function
    except Exception as error:  # noqa: BLE001
        _setup_error = '%s: %s' % (type(error).__name__, error)


def play(task):
    if _setup_error:
        raise RuntimeError('worker setup failed: ' + _setup_error)
    started = time.time()
    _page.evaluate('(c) => window.__balanceDriver.begin(c)', task)
    while not _page.evaluate('(n) => window.__balanceDriver.run(n)', CHUNK)['done']:
        pass
    record = _page.evaluate('() => window.__balanceDriver.result()')
    record['elapsed'] = round(time.time() - started, 2)
    record['options'] = task.get('options', {})
    return record


def play_all(v, tasks, jobs, label):
    records, done = [], 0
    ctx = multiprocessing.get_context('spawn')
    with ctx.Pool(processes=min(jobs, len(tasks)), initializer=init_worker, initargs=(v,)) as pool:
        for record in pool.imap_unordered(play, tasks):
            records.append(record); done += 1
            print('\r%s: %d/%d runs' % (label, done, len(tasks)), end='', flush=True)
    print()
    records.sort(key=lambda r: (r['skill'], r['seed'], json.dumps(r['options'], sort_keys=True)))
    return records


def parse_seeds(text, runs):
    if not text:
        return list(range(1, runs + 1))
    seeds = []
    for part in text.split(','):
        if '-' in part:
            a, b = part.split('-'); seeds.extend(range(int(a), int(b) + 1))
        else:
            seeds.append(int(part))
    return seeds


def git(*args):
    return subprocess.check_output(['git'] + list(args), cwd=ROOT, text=True).strip()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('game', help='game slug, e.g. stick-army')
    ap.add_argument('--runs', type=int, default=50, help='seeds 1..N per skill (default 50)')
    ap.add_argument('--seeds', help='explicit seeds, e.g. 1-20,42')
    ap.add_argument('--skills', default='casual,decent,expert')
    ap.add_argument('--jobs', type=int, default=4, help='parallel browser pages (default 4)')
    ap.add_argument('--cap-minutes', type=float, default=40, help='simulated time cap per run (default 40)')
    ap.add_argument('--ref', help='also run the same seeds against this commit and compare')
    ap.add_argument('--ref-bot', choices=['current', 'own'], default='current',
                    help="which bot plays --ref: the current one (default), or the ref commit's own bot.js when the "
                         "adapter's observe/act contract changed between the versions")
    ap.add_argument('--verify', action='store_true', help='play every run twice, plus once with effects on, and check the records match')
    ap.add_argument('--option', action='append', default=[], metavar='KEY=VALUE',
                    help="pass an option to the game's adapter start(), e.g. --option level=veteran (repeatable)")
    ap.add_argument('--out', help='output directory (default work/balance/<timestamp>)')
    args = ap.parse_args()

    profiles = json.loads((ROOT / 'tools/balance/profiles.json').read_text())
    override = ROOT / 'tests' / args.game / 'profiles.json'
    if override.is_file():
        for name, values in json.loads(override.read_text()).items():
            profiles.setdefault(name, {}).update(values)
    skills = [s.strip() for s in args.skills.split(',') if s.strip()]
    unknown = [s for s in skills if s not in profiles]
    if unknown:
        sys.exit('unknown skill profile(s): %s' % ', '.join(unknown))
    seeds = parse_seeds(args.seeds, args.runs)
    cap = args.cap_minutes * 60
    options = {'fast': True}
    for pair in args.option:
        key, sep, value = pair.partition('=')
        if not sep or not key:
            sys.exit('--option takes KEY=VALUE, got %r' % pair)
        options[key] = value
    tasks = [{'seed': seed, 'skill': skill, 'profile': profiles[skill], 'cap': cap, 'options': dict(options)} for skill in skills for seed in seeds]
    bot_source = (ROOT / 'tests' / args.game / 'bot.js').read_text()
    out = Path(args.out) if args.out else ROOT / 'work' / 'balance' / datetime.now().strftime('%Y%m%d-%H%M%S')
    out.mkdir(parents=True, exist_ok=True)

    server, base = serve(ROOT / 'site')
    current = variant('working tree', ROOT, args.game, base, bot_source)
    started = time.time()
    results = {'game': args.game, 'commit': git('rev-parse', '--short', 'HEAD'), 'dirty': bool(git('status', '--porcelain')), 'options': options,
               'skills': skills, 'seeds': seeds, 'cap_minutes': args.cap_minutes, 'profiles': {s: profiles[s] for s in skills},
               'columns': current['config'].get('columns', []), 'runs': play_all(current, tasks, args.jobs, 'working tree')}

    if args.verify:
        # Replays run in reverse order, so each run lands on a page with a different history: state leaking
        # between runs on a shared page shows up as a mismatch.
        again = play_all(current, tasks[::-1], args.jobs, 'repeat')
        slow = play_all(current, [dict(t, options=dict(t['options'], fast=False)) for t in tasks[::-1]], args.jobs, 'effects on')
        def strip(r):
            return {k: v for k, v in r.items() if k not in ('elapsed', 'options')}
        mismatched = [(a['skill'], a['seed']) for a, b, c in zip(results['runs'], again, slow) if not (strip(a) == strip(b) == strip(c))]
        results['verify'] = {'checked': len(tasks), 'mismatched': mismatched}
        print('verify: %d runs, %d mismatched %s' % (len(tasks), len(mismatched), mismatched[:5] if mismatched else ''))

    if args.ref:
        # Save the working tree's runs first, so a failure in the reference run doesn't lose them.
        (out / 'results.json').write_text(json.dumps(results, indent=1))
        worktree = Path(tempfile.mkdtemp(prefix='balance-ref-'))
        try:
            git('worktree', 'add', '--detach', str(worktree), args.ref)
            ref_server, ref_base = serve(worktree / 'site')
            ref_bot = (worktree / 'tests' / args.game / 'bot.js').read_text() if args.ref_bot == 'own' else bot_source
            old = variant(args.ref, worktree, args.game, ref_base, ref_bot)
            results['ref'] = {'name': args.ref, 'commit': git('rev-parse', '--short', args.ref), 'bot': args.ref_bot,
                              'runs': play_all(old, tasks, args.jobs, args.ref)}
            ref_server.shutdown()
        finally:
            subprocess.call(['git', 'worktree', 'remove', '--force', str(worktree)], cwd=ROOT)
    server.shutdown()
    results['elapsed_seconds'] = round(time.time() - started, 1)

    (out / 'results.json').write_text(json.dumps(results, indent=1))
    (out / 'summary.md').write_text(report.summary(results))
    print('wrote %s and %s' % (out / 'results.json', out / 'summary.md'))
    if args.verify and results['verify']['mismatched']:
        sys.exit(1)


if __name__ == '__main__':
    main()
