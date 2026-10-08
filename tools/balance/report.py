"""summary.md for tools/balance/run.py (SPEC-005). Regenerate from saved results with:

    python3 tools/balance/report.py work/balance/<timestamp>/results.json
"""
import json
import math
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

Z_FLAG = 2.58  # two-proportion z beyond this (about 99%) counts as a real survival change


def quartiles(values):
    if len(values) < 2:
        v = values[0] if values else 0
        return v, v, v
    q = statistics.quantiles(values, n=4, method='inclusive')
    return q[0], statistics.median(values), q[2]


def fmt(x):
    if isinstance(x, float):
        return ('%.1f' % x).rstrip('0').rstrip('.') if abs(x) < 100 else '%d' % round(x)
    return str(x)


def table(head, rows):
    out = ['| ' + ' | '.join(head) + ' |', '|' + '|'.join([' --- '] * len(head)) + '|']
    out += ['| ' + ' | '.join(fmt(c) for c in row) + ' |' for row in rows]
    return '\n'.join(out)


def by_skill(runs, skill):
    return [r for r in runs if r['skill'] == skill]


def survival(runs, wave):
    return sum(1 for r in runs if r['wave'] >= wave) / len(runs) if runs else 0


def z_score(p1, n1, p2, n2):
    pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
    if pooled in (0, 1):
        return 0
    return (p1 - p2) / math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))


def rank_z(a, b):
    """Mann-Whitney U as a z score (normal approximation with tie correction): do a's values run higher than b's?"""
    n1, n2 = len(a), len(b)
    if not n1 or not n2:
        return 0
    pooled = sorted([(v, 0) for v in a] + [(v, 1) for v in b])
    ranks, i, ties = {}, 0, 0
    while i < len(pooled):
        j = i
        while j < len(pooled) and pooled[j][0] == pooled[i][0]:
            j += 1
        ranks[pooled[i][0]] = (i + j + 1) / 2; ties += (j - i) ** 3 - (j - i); i = j
    u = sum(ranks[v] for v in a) - n1 * (n1 + 1) / 2
    n = n1 + n2
    var = n1 * n2 / 12 * ((n + 1) - ties / (n * (n - 1)))
    return (u - n1 * n2 / 2) / math.sqrt(var) if var > 0 else 0


def wave_means(runs, columns, max_wave):
    """Per wave: the mean of each column over runs that reached that wave."""
    rows = []
    for w in range(1, max_wave + 1):
        reached = [r for r in runs if r['wave'] >= w]
        if not reached:
            break
        row = [w, len(reached)]
        for col in columns:
            row.append(sum(r['waves'].get(str(w), {}).get(col['key'], 0) for r in reached) / len(reached))
        rows.append(row)
    return rows


def skill_section(name, runs, columns, ref_runs=None):
    lines = ['## %s' % name, '']
    waves = [r['wave'] for r in runs]
    q1, med, q3 = quartiles(waves)
    lines.append('**Wave reached:** median %s (quartiles %s–%s, range %d–%d) over %d runs. Mean score %s. Median run %s simulated.' % (
        fmt(med), fmt(q1), fmt(q3), min(waves), max(waves), len(runs), fmt(statistics.mean(r['score'] for r in runs)),
        fmt(statistics.median(r['t'] for r in runs) / 60) + ' min'))
    if ref_runs:
        rq1, rmed, rq3 = quartiles([r['wave'] for r in ref_runs])
        # Both: a full wave of movement and a rank test beyond noise (outcomes are often bimodal, so medians wobble).
        flag = ' **changed**' if abs(med - rmed) >= 1 and abs(rank_z(waves, [r['wave'] for r in ref_runs])) >= Z_FLAG else ''
        lines.append('Ref: median %s (quartiles %s–%s).%s' % (fmt(rmed), fmt(rq1), fmt(rq3), flag))
    lines.append('')

    top = max(waves + ([r['wave'] for r in ref_runs] if ref_runs else []))
    lines.append('**Survival** (share of runs alive at the start of each wave):')
    lines.append('')
    rows = []
    for w in range(1, top + 1):
        p = survival(runs, w)
        if ref_runs:
            rp = survival(ref_runs, w)
            z = z_score(p, len(runs), rp, len(ref_runs))
            rows.append([w, '%d%%' % round(p * 100), '%d%%' % round(rp * 100), '**changed**' if abs(z) >= Z_FLAG else ''])
        else:
            rows.append([w, '%d%%' % round(p * 100)])
    lines.append(table(['wave', 'alive', 'ref', ''] if ref_runs else ['wave', 'alive'], rows))
    lines.append('')

    lines.append('**How runs end:**')
    lines.append('')
    ends = defaultdict(list)
    for r in runs:
        cause = 'timeout' if r.get('timeout') else 'stuck in shop' if r.get('stuck') else (r.get('end') or {}).get('cause', 'unknown')
        ends[cause].append(r['wave'])
    lines.append(table(['cause', 'runs', 'median wave'], [[c, len(v), fmt(statistics.median(v))] for c, v in sorted(ends.items(), key=lambda kv: -len(kv[1]))]))
    lines.append('')

    if columns:
        shown = max(w for w in range(1, top + 1) if sum(1 for r in runs if r['wave'] >= w) >= max(3, len(runs) // 10)) if runs else 0
        lines.append('**Per wave** (mean per run that reached the wave):')
        lines.append('')
        lines.append(table(['wave', 'runs'] + [c['label'] for c in columns], wave_means(runs, columns, shown)))
        lines.append('')
        if ref_runs:
            lines.append('Ref per wave:')
            lines.append('')
            lines.append(table(['wave', 'runs'] + [c['label'] for c in columns], wave_means(ref_runs, columns, shown)))
            lines.append('')

    offered, taken, owners = Counter(), Counter(), defaultdict(list)
    for r in runs:
        for offer in r['offers']:
            offered.update(offer)
        items = set()
        for p in r['purchases']:
            taken[p['item']] += 1; items.add(p['item'])
        for item in items:
            owners[item].append(r['wave'])
    if offered:
        lines.append('**Shop** (median wave of runs that took an item is correlation, not cause):')
        lines.append('')
        rows = [[item, offered[item], taken[item], '%d%%' % round(100 * taken[item] / offered[item]) if offered[item] else '-',
                 fmt(statistics.median(owners[item])) if owners[item] else '-'] for item in sorted(offered, key=lambda i: -taken[i])]
        lines.append(table(['item', 'offered', 'taken', 'take rate', 'median wave of takers'], rows))
        lines.append('')

    odd = []
    timeouts = sum(1 for r in runs if r.get('timeout'))
    if timeouts:
        odd.append('%d run(s) hit the time cap.' % timeouts)
    stuck = sum(1 for r in runs if r.get('stuck'))
    if stuck:
        odd.append('%d run(s) got stuck in the shop.' % stuck)
    # Only for games that track captures (Stick Army); others have nothing to capture.
    if any(c['key'] == 'capture' for c in columns) and not any(r['waves'].get(w, {}).get('capture', 0) for r in runs for w in r['waves']):
        odd.append('No captures in any run.')
    if odd:
        lines.append('**Odd:** ' + ' '.join(odd))
        lines.append('')
    return lines


def summary(results):
    runs = results['runs']
    ref = results.get('ref')
    lines = ['# Balance: %s' % results['game'], '']
    lines.append('Commit %s%s, %d seeds × %s, cap %s simulated minutes, %s s wall time.' % (
        results['commit'], ' (uncommitted changes)' if results.get('dirty') else '', len(results['seeds']), ', '.join(results['skills']),
        fmt(results['cap_minutes']), fmt(results.get('elapsed_seconds', 0))))
    if runs:
        sim = sum(r['t'] for r in runs); wall = sum(r['elapsed'] for r in runs) or 1
        lines.append('Simulation speed: %dx real time per page (median run %s s of wall time).' % (sim / wall, fmt(statistics.median(r['elapsed'] for r in runs))))
    if ref:
        lines.append('Compared with %s (%s) on the same seeds. "changed" marks a median wave that moves by a full wave or more and differs on a rank test, or survival at a wave that differs, each beyond about 99%% confidence.' % (ref['name'], ref['commit']))
        if ref.get('bot') == 'own':
            lines.append("The reference was played by its own bot (`--ref-bot own`), because the bot's view of the game changed between the versions. Differences include the bots' own changes.")
    if 'verify' in results:
        v = results['verify']
        lines.append('Verify: %d runs replayed twice (once with effects on); %s.' % (v['checked'], 'all identical' if not v['mismatched'] else '%d mismatched' % len(v['mismatched'])))
    lines.append('')
    lines.append('Bots measure difficulty, not fun. When they disagree with playtesting, playtesting wins and the profiles get recalibrated.')
    lines.append('')
    for skill in results['skills']:
        lines += skill_section(skill, by_skill(runs, skill), results.get('columns', []), by_skill(ref['runs'], skill) if ref else None)
    return '\n'.join(lines).rstrip() + '\n'


if __name__ == '__main__':
    path = Path(sys.argv[1])
    data = json.loads(path.read_text())
    (path.parent / 'summary.md').write_text(summary(data))
    print('wrote', path.parent / 'summary.md')
