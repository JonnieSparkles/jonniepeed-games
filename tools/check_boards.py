"""Check the game's BOARD against the Worker rules before deploying the site."""
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


def main():
    games = json.loads((ROOT / 'scores/games.json').read_text())
    failed = False
    for game, entry in games.items():
        newest = max(entry['boards'], key=int)
        problem = cap_problem(entry['boards'][newest])
        if problem:
            print(f'FAIL: {game} board {newest} {problem}', file=sys.stderr)
            failed = True
    for path in sorted((ROOT / 'site').glob('*/game.js')):
        match = re.search(r'\bconst\s+BOARD\s*=\s*([^;]+);', path.read_text())
        if not match:
            continue
        game = path.parent.name
        if not re.fullmatch(r'\d+', match[1].strip()):
            print(f'FAIL: {game} BOARD must be a positive integer literal', file=sys.stderr)
            failed = True
            continue
        board = int(match[1])
        if game not in games or str(board) not in games[game]['boards']:
            print(f'FAIL: {game} BOARD={board} is not allowed in scores/games.json', file=sys.stderr)
            failed = True
        elif cap_problem(games[game]['boards'][str(board)]):
            print(f'FAIL: {game} BOARD={board} {cap_problem(games[game]["boards"][str(board)])}, so it takes no new runs', file=sys.stderr)
            failed = True
        else:
            print(f'PASS: {game} BOARD={board}')
    return int(failed)


if __name__ == '__main__':
    sys.exit(main())
