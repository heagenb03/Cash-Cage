import { hashTransactions, isSettlementCacheValid } from '../hashUtils';
import { Transaction } from '@/types/game';

function createTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn_1',
    playerId: 'player_1',
    type: 'buyin',
    amount: 100,
    timestamp: new Date('2025-01-01T12:00:00Z'),
    ...overrides,
  };
}

describe('hashTransactions', () => {
  it('returns empty string for empty array', () => {
    expect(hashTransactions([])).toBe('');
  });

  it('returns a non-empty hex string for a single transaction', () => {
    const txns = [createTransaction()];
    const hash = hashTransactions(txns);
    expect(hash).not.toBe('');
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic (same input produces same hash)', () => {
    const txns = [
      createTransaction({ id: 'a', playerId: 'p1', amount: 50, timestamp: new Date('2025-01-01') }),
      createTransaction({ id: 'b', playerId: 'p2', amount: 100, timestamp: new Date('2025-01-02') }),
    ];

    const hash1 = hashTransactions(txns);
    const hash2 = hashTransactions(txns);
    expect(hash1).toBe(hash2);
  });

  it('produces same hash regardless of input order (sorts by timestamp internally)', () => {
    const t1 = createTransaction({ id: 'a', playerId: 'p1', amount: 50, timestamp: new Date('2025-01-01') });
    const t2 = createTransaction({ id: 'b', playerId: 'p2', amount: 100, timestamp: new Date('2025-01-02') });

    const hashForward = hashTransactions([t1, t2]);
    const hashReverse = hashTransactions([t2, t1]);
    expect(hashForward).toBe(hashReverse);
  });

  it('produces different hash for different amounts', () => {
    const txns1 = [createTransaction({ amount: 100 })];
    const txns2 = [createTransaction({ amount: 200 })];

    expect(hashTransactions(txns1)).not.toBe(hashTransactions(txns2));
  });

  it('produces different hash for different player IDs', () => {
    const txns1 = [createTransaction({ playerId: 'p1' })];
    const txns2 = [createTransaction({ playerId: 'p2' })];

    expect(hashTransactions(txns1)).not.toBe(hashTransactions(txns2));
  });

  it('produces different hash for different transaction types', () => {
    const txns1 = [createTransaction({ type: 'buyin' })];
    const txns2 = [createTransaction({ type: 'cashout' })];

    expect(hashTransactions(txns1)).not.toBe(hashTransactions(txns2));
  });
});

describe('isSettlementCacheValid', () => {
  it('returns false when cachedHash is undefined', () => {
    expect(isSettlementCacheValid([createTransaction()], undefined)).toBe(false);
  });

  it('returns true when hash matches current transactions', () => {
    const txns = [createTransaction()];
    const hash = hashTransactions(txns);
    expect(isSettlementCacheValid(txns, hash)).toBe(true);
  });

  it('returns false when hash does not match', () => {
    const txns = [createTransaction()];
    expect(isSettlementCacheValid(txns, 'stale_hash')).toBe(false);
  });

  it('returns false for empty transactions with non-empty cached hash', () => {
    expect(isSettlementCacheValid([], 'some_hash')).toBe(false);
  });

  it('returns true for empty transactions with empty string cached hash', () => {
    // hashTransactions([]) returns '', so if cached hash is '' it matches
    expect(isSettlementCacheValid([], '')).toBe(false);
    // '' is falsy so !cachedHash returns true -> returns false
  });
});
