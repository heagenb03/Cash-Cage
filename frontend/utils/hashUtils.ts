import { Transaction } from '@/types/game';

/**
 * Simple string hash function (djb2 algorithm)
 * Used for cache invalidation detection
 */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Generate deterministic hash of transaction array
 * Used to detect if game data changed after settlement caching
 */
export function hashTransactions(transactions: Transaction[]): string {
  if (transactions.length === 0) return '';

  // Sort by timestamp to ensure consistent ordering
  const sorted = [...transactions].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Create deterministic string representation
  const content = sorted.map(t =>
    `${t.playerId}:${t.type}:${t.amount}:${new Date(t.timestamp).getTime()}`
  ).join('|');

  return simpleHash(content);
}

/**
 * Check if cached settlements are still valid for current game state
 */
export function isSettlementCacheValid(
  currentTransactions: Transaction[],
  cachedHash: string | undefined
): boolean {
  if (!cachedHash) return false;
  return hashTransactions(currentTransactions) === cachedHash;
}
