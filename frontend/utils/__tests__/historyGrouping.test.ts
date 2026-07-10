import { Game } from '@/types/game';
import { groupGamesByMonth, monthLabel } from '@/utils/historyGrouping';

// Minimal Game stub — the helper only reads `id` and `date`.
function mkGame(id: string, dateISO: string): Game {
  return { id, date: new Date(dateISO) } as unknown as Game;
}

// All date fixtures are pinned to noon UTC so day-of-month resolves the same
// under any local timezone the impl's local getters run in. NOTE: this holds
// only because no fixture sits on a month boundary — a day-1 or last-day
// fixture could still roll a day at extreme (+13/+14) offsets. Keep new
// fixtures off month boundaries, or pin them mid-day in the target month.
const NOW = new Date('2026-07-10T12:00:00Z');

describe('monthLabel', () => {
  it('labels the current month "This Month"', () => {
    expect(monthLabel(new Date('2026-07-02T12:00:00Z'), NOW)).toBe('This Month');
  });

  it('labels an earlier month in the current year with the month name only', () => {
    expect(monthLabel(new Date('2026-03-15T12:00:00Z'), NOW)).toBe('March');
  });

  it('labels a prior-year month with month and year', () => {
    expect(monthLabel(new Date('2024-12-20T12:00:00Z'), NOW)).toBe('December 2024');
  });
});

describe('groupGamesByMonth', () => {
  it('returns an empty array for no games', () => {
    expect(groupGamesByMonth([], NOW)).toEqual([]);
  });

  it('groups games from the same month into one group, preserving order', () => {
    const games = [mkGame('a', '2026-07-08T12:00:00Z'), mkGame('b', '2026-07-02T12:00:00Z')];
    const groups = groupGamesByMonth(games, NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('This Month');
    expect(groups[0].key).toBe('month-2026-07');
    expect(groups[0].games.map(g => g.id)).toEqual(['a', 'b']);
  });

  it('splits consecutive months into separate groups in encounter order', () => {
    const games = [
      mkGame('a', '2026-07-08T12:00:00Z'),
      mkGame('b', '2026-03-15T12:00:00Z'),
      mkGame('c', '2026-03-01T12:00:00Z'),
      mkGame('d', '2024-12-20T12:00:00Z'),
    ];
    const groups = groupGamesByMonth(games, NOW);
    expect(groups.map(g => g.label)).toEqual(['This Month', 'March', 'December 2024']);
    expect(groups.map(g => g.games.length)).toEqual([1, 2, 1]);
    expect(groups.map(g => g.key)).toEqual(['month-2026-07', 'month-2026-03', 'month-2024-12']);
  });
});
