import { Game } from '@/types/game';

export interface MonthGroup {
  key: string;
  label: string;
  games: Game[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function monthKey(d: Date): string {
  return `month-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Human label for a month relative to `now`:
 * - current calendar month -> "This Month"
 * - earlier month, same year -> "December"
 * - any month in a prior year -> "December 2024"
 */
export function monthLabel(date: Date, now: Date): string {
  const d = new Date(date);
  if (d.getFullYear() === now.getFullYear()) {
    if (d.getMonth() === now.getMonth()) return 'This Month';
    return MONTH_NAMES[d.getMonth()];
  }
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Buckets games — assumed already ordered newest-first by `game.date` — into
 * consecutive month groups, preserving order within and across groups.
 */
export function groupGamesByMonth(games: Game[], now: Date): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let current: MonthGroup | null = null;

  for (const game of games) {
    const d = new Date(game.date);
    const key = monthKey(d);
    if (!current || current.key !== key) {
      current = { key, label: monthLabel(d, now), games: [] };
      groups.push(current);
    }
    current.games.push(game);
  }

  return groups;
}
