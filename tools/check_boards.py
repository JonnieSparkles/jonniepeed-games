"""Check each game's BOARD (and any other *_BOARD it posts to) against the Worker rules before deploying the site."""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]


def cap_problem(rules):
    """Why a board can't take new runs, or None. See "Score caps" in docs/guides/00-leaderboards.md."""
    cap = rules.get('plausible')
    if not isinstance(cap, dict):
        return 'has no score cap ("plausible")'
    if not all(isinstance(cap.get(k), (int, float)) and not isinstance(cap.get(k), bool) for k in ('perSecond', 'grace')) \
            or cap['perSecond'] <= 0 or cap['grace'] < 0:
        return 'needs "plausible": {"perSecond": > 0, "grace": >= 0}'
    if 'time_ms' not in rules.get('meta', {}):
        return 'needs a time_ms meta key for its score cap'
    return None


def set_problem(game, found, games, levels):
    """A game with levels posts to one board per level, and they reset together: its board constants are a set of
    consecutive boards starting a group of that size (1-2, then 3-4), the newest in scores/games.json, and as many as
    its levels in stats/games.json. True when that's broken."""
    numbers = sorted(int(v) for _, v in found if re.fullmatch(r'\d+', v.strip()))
    n = len(numbers)
    newest = max((int(b) for b in games.get(game, {}).get('boards', {})), default=0)
    problems = []
    if levels and len(levels) != n:
        problems.append(f'has {len(levels)} levels in stats/games.json but {n} board constants')
    if n > 1 and (numbers != list(range(numbers[0], numbers[0] + n)) or (numbers[0] - 1) % n):
        problems.append(f'boards {numbers} are not one set (consecutive, starting {n}k+1): reset all its levels together')
    if n and numbers[-1] != newest:
        problems.append(f'boards {numbers} are not the newest set (newest board is {newest})')
    for problem in problems:
        print(f'FAIL: {game} {problem}', file=sys.stderr)
    if not problems and n > 1:
        print(f'PASS: {game} boards {numbers} are one set')
    return bool(problems)


def main():
    games = json.loads((ROOT / 'scores/games.json').read_text())
    failed = False
    for game, entry in games.items():
        newest = max(entry['boards'], key=int)
        problem = cap_problem(entry['boards'][newest])
        if problem:
            print(f'FAIL: {game} board {newest} {problem}', file=sys.stderr)
            failed = True
    levels = {g: e.get('levels') for g, e in json.loads((ROOT / 'stats/games.json').read_text()).items()}
    for path in sorted((ROOT / 'site').glob('*/game.js')):
        found = re.findall(r'\bconst\s+(\w*BOARD)\s*=\s*([^;]+);', path.read_text())
        if len(found) > 1 or levels.get(path.parent.name):
            failed = set_problem(path.parent.name, found, games, levels.get(path.parent.name)) or failed
        # BOARD, plus any other board a game posts to, such as a harder level's (Stick Army's VETERAN_BOARD).
        for name, value in found:
            game = path.parent.name
            if not re.fullmatch(r'\d+', value.strip()):
                print(f'FAIL: {game} {name} must be a positive integer literal', file=sys.stderr)
                failed = True
                continue
            board = int(value)
            if game not in games or str(board) not in games[game]['boards']:
                print(f'FAIL: {game} {name}={board} is not allowed in scores/games.json', file=sys.stderr)
                failed = True
            elif cap_problem(games[game]['boards'][str(board)]):
                print(f'FAIL: {game} {name}={board} {cap_problem(games[game]["boards"][str(board)])}, so it takes no new runs', file=sys.stderr)
                failed = True
            else:
                print(f'PASS: {game} {name}={board}')
    return int(failed)


if __name__ == '__main__':
    sys.exit(main())
