"""Check the game's BOARD against the Worker rules before deploying the site."""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    games = json.loads((ROOT / 'scores/games.json').read_text())
    failed = False
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
        else:
            print(f'PASS: {game} BOARD={board}')
    return int(failed)


if __name__ == '__main__':
    sys.exit(main())
