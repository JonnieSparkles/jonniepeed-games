"""Made-up runs for looking at the dashboards locally: 90 days of all three games, with a launch spike over the
last few days, and some saved scores with initials. Writes two SQL files and prints the commands that load them
into the LOCAL databases. Never load these into the real ones.

    python3 stats/test/seed.py [--days 90] [--out DIR]
"""
import argparse
import datetime as dt
import json
import math
import random
import tempfile
import uuid
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--days', type=int, default=90)
parser.add_argument('--out', default=tempfile.mkdtemp(prefix='play-stats-seed-'))
args = parser.parse_args()
random.seed(8)

NOW = dt.datetime.now(dt.timezone.utc)
BOARDS = {'thimbleful': 3, 'dont-step-on-a-crack': 2, 'stick-army': None}
WEIGHT = {'thimbleful': 1.0, 'dont-step-on-a-crack': 0.8, 'stick-army': 0.6}
NAMES = ['JON', 'KAT', 'MAX', 'ZED', 'BEA', 'ROB', 'LIL', 'DOT', 'AAA', 'SAM', 'ACE', 'JIM', 'TOM', 'EVE', 'FOX', 'OWL']
SOURCES = [None, 'jonniepeed.games', 't.co', 'www.reddit.com', 'news.ycombinator.com', 'bsky.app']


def stamp(t):
    return t.strftime('%Y-%m-%dT%H:%M:%S.') + f'{t.microsecond // 1000:03d}Z'


def play(game, outcome):
    """A plausible score, play time and stats for one run."""
    if game == 'thimbleful':
        score = int(random.lognormvariate(3.3, .6)); ms = score * 4200 + random.randint(0, 20000)
        return score, ms, {'golds': score // 9, 'spills': 5 if outcome == 'over' else random.randint(0, 4),
                           'earned': random.choice([0, 0, 0, 1, 2]), 'storm': min(100, max(0, int((ms / 1000 - 60) / 1.8)))}
    if game == 'dont-step-on-a-crack':
        score = int(random.lognormvariate(5.2, .7)); ms = score * 380 + random.randint(0, 9000)
        return score, ms, {'steps': int(score / 1.3), 'streak': random.randint(3, 60), 'street': min(6, 1 + score // 220),
                           'giants': random.randint(0, 4)}
    wave = min(22, 1 + int(random.lognormvariate(1.5, .6)))
    stats = {'wave': wave, 'kills': wave * 22, 'captured': random.randint(0, wave * 2), 'popped': random.randint(0, wave * 3),
             'planes': wave * 2, 'zeppelins': wave // 5, 'tanks': max(0, wave - 8), 'crew': random.randint(0, 8),
             'fallen': random.randint(0, 5), 'tags': random.randint(0, 300)}
    if outcome in ('over', 'won'):
        stats['cause'] = random.choices(['bomb', 'lander', 'sniper', 'tank'], [5, 3, 1, 2 if wave > 9 else 0])[0]
    if outcome == 'won':
        stats.update(won_at=15, endless=wave > 15)
    return wave * 900 + random.randint(0, 800), wave * 42000 + random.randint(0, 30000), stats


runs, scores = [], []
for back in range(args.days, -1, -1):
    day = NOW - dt.timedelta(days=back)
    busy = (8 + 4 * math.sin(back / 5)) * (6 - back if back <= 3 else 1)   # a launch spike at the end
    for game, weight in WEIGHT.items():
        for _ in range(max(0, int(random.gauss(busy * weight / 2.4, 2)))):
            visit = str(uuid.uuid4())
            device = random.choices(['phone', 'desktop', 'tablet'], [6, 3, 1])[0]
            orientation = 'portrait' if device == 'phone' and random.random() < .8 else 'landscape'
            source = random.choices(SOURCES, [5, 3, 2 if back <= 3 else .2, 2 if back <= 3 else .2, .5 if back <= 3 else 0, .6])[0]
            t = day.replace(hour=random.randint(0, 23), minute=random.randint(0, 59), second=random.randint(0, 59))
            for i in range(1 + int(random.expovariate(1 / 1.6))):
                started = min(t + dt.timedelta(minutes=2 * i), NOW - dt.timedelta(seconds=30))
                outcome = random.choices(['over', 'quit', None], [75, 18, 7])[0]
                score, ms, stats = play(game, outcome)
                if game == 'stick-army' and outcome == 'over' and stats['wave'] >= 15:
                    outcome = 'won'; stats.update(won_at=15, endless=stats['wave'] > 15)
                touch = device != 'desktop'
                score_run = str(uuid.uuid4()) if BOARDS[game] and outcome == 'over' else None
                ended = outcome is not None
                runs.append(dict(run_key=str(uuid.uuid4()), visit=visit, game=game, board=BOARDS[game], device=device,
                                 orientation=orientation, host='jonniepeed.games', source=source, started_at=stamp(started),
                                 ended_at=stamp(started + dt.timedelta(milliseconds=ms)) if ended else None, outcome=outcome,
                                 time_ms=ms if ended else None, score=score if ended else None,
                                 input=('touch' if touch else 'keys') if ended else None, score_run=score_run,
                                 stats=json.dumps(stats) if ended else None))
                if score_run and random.random() < .35:
                    scores.append(dict(game=game, board=BOARDS[game], run_id=score_run, name=random.choice(NAMES), score=score,
                                       input='touch' if touch else 'keys', meta=json.dumps({'time_ms': ms}),
                                       created_at=stamp(started + dt.timedelta(milliseconds=ms))))


def sql(table, rows):
    quote = lambda v: 'NULL' if v is None else str(v) if isinstance(v, int) else "'" + str(v).replace("'", "''") + "'"
    return ''.join(f"INSERT INTO {table} ({', '.join(r)}) VALUES ({', '.join(quote(v) for v in r.values())});\n" for r in rows)


out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
(out / 'seed-stats.sql').write_text(sql('runs', runs))
(out / 'seed-scores.sql').write_text(sql('scores', scores))
print(f'{len(runs)} runs and {len(scores)} saved scores. Load them into the LOCAL databases:')
print(f'  (cd stats && wrangler d1 execute jonniepeed-games-stats --local --persist-to ../scores/.wrangler/state --file={out / "seed-stats.sql"})')
print(f'  (cd scores && wrangler d1 execute jonniepeed-games-scores --local --file={out / "seed-scores.sql"})')
