import { isNameTakenInGame, matchSavedByExactName, filterSavedByQuery } from '../addPlayer';
import type { Player } from '@/types/game';
import type { SavedPlayer } from '@/services/savedPlayersService';

const player = (name: string, completed = false): Player => ({
  id: `p_${name}`,
  name,
  ...(completed ? { completedAt: new Date() } : {}),
});
const saved = (name: string): SavedPlayer => ({ id: `s_${name}`, name });

describe('isNameTakenInGame', () => {
  it('matches case-insensitively and trimmed', () => {
    expect(isNameTakenInGame([player('Gabe')], '  gabe ')).toBe(true);
  });
  it('counts completed players', () => {
    expect(isNameTakenInGame([player('Gabe', true)], 'Gabe')).toBe(true);
  });
  it('returns false for a distinct name', () => {
    expect(isNameTakenInGame([player('Gabe')], 'Gabe B')).toBe(false);
  });
  it('returns false for an empty/whitespace name', () => {
    expect(isNameTakenInGame([player('Gabe')], '   ')).toBe(false);
  });
});

describe('matchSavedByExactName', () => {
  it('returns the single exact match', () => {
    const list = [saved('Gabe'), saved('Mike')];
    expect(matchSavedByExactName(list, 'gabe').map(p => p.id)).toEqual(['s_Gabe']);
  });
  it('treats a substring as NOT an exact match', () => {
    expect(matchSavedByExactName([saved('Gabe')], 'Gab')).toEqual([]);
  });
  it('returns 2+ for legacy duplicate saved names', () => {
    const list = [{ id: 'a', name: 'Gabe' }, { id: 'b', name: 'gabe' }] as SavedPlayer[];
    expect(matchSavedByExactName(list, 'Gabe')).toHaveLength(2);
  });
  it('returns [] for an empty name', () => {
    expect(matchSavedByExactName([saved('Gabe')], '  ')).toEqual([]);
  });
});

describe('filterSavedByQuery', () => {
  it('substring-matches case-insensitively', () => {
    const list = [saved('Gabe'), saved('Mike')];
    expect(filterSavedByQuery(list, 'ab').map(p => p.id)).toEqual(['s_Gabe']);
  });
  it('empty query returns the same list reference (recent-first order preserved)', () => {
    const list = [saved('Gabe'), saved('Mike')];
    expect(filterSavedByQuery(list, '  ')).toBe(list);
  });
  it('no match returns []', () => {
    expect(filterSavedByQuery([saved('Gabe')], 'zzz')).toEqual([]);
  });
});
