import {
  calculateOptimalSettlements,
  validateSettlements,
  getSettlements,
} from '../settlementService';
import { PlayerBalance } from '@/types/game';

function makeBalance(
  name: string,
  buyins: number,
  cashouts: number
): PlayerBalance {
  return {
    playerId: `id_${name}`,
    playerName: name,
    totalBuyins: buyins,
    totalCashouts: cashouts,
    netBalance: cashouts - buyins,
  };
}

// ---- calculateOptimalSettlements ----

describe('calculateOptimalSettlements', () => {
  it('returns empty array for empty balances', () => {
    expect(calculateOptimalSettlements([])).toEqual([]);
  });

  it('returns empty array when all balances are zero', () => {
    const balances = [
      makeBalance('Alice', 100, 100),
      makeBalance('Bob', 50, 50),
    ];
    expect(calculateOptimalSettlements(balances)).toEqual([]);
  });

  it('handles simple two-player case', () => {
    const balances = [
      makeBalance('Alice', 100, 0),   // net = -100 (debtor)
      makeBalance('Bob', 0, 100),     // net = +100 (creditor)
    ];

    const result = calculateOptimalSettlements(balances);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ from: 'Alice', to: 'Bob', amount: 100 });
  });

  it('handles three-player case', () => {
    const balances = [
      makeBalance('Alice', 100, 0),   // net = -100
      makeBalance('Bob', 0, 60),      // net = +60
      makeBalance('Charlie', 0, 40),  // net = +40
    ];

    const result = calculateOptimalSettlements(balances);
    // Alice owes 100 total: 60 to Bob + 40 to Charlie
    const totalPaid = result.reduce((sum, s) => sum + s.amount, 0);
    expect(totalPaid).toBe(100);
    expect(result.every(s => s.from === 'Alice')).toBe(true);
  });

  it('handles case with multiple debtors and creditors', () => {
    const balances = [
      makeBalance('Alice', 80, 0),   // net = -80
      makeBalance('Bob', 60, 0),     // net = -60
      makeBalance('Charlie', 0, 90), // net = +90
      makeBalance('Dave', 0, 50),    // net = +50
    ];

    const result = calculateOptimalSettlements(balances);
    const totalDebts = result.reduce((sum, s) => sum + s.amount, 0);
    expect(totalDebts).toBe(140);
  });

  it('rounds amounts to two decimal places', () => {
    const balances = [
      makeBalance('Alice', 33, 0),  // net = -33
      makeBalance('Bob', 0, 33),    // net = +33
    ];

    const result = calculateOptimalSettlements(balances);
    result.forEach(s => {
      const decimals = s.amount.toString().split('.')[1];
      if (decimals) {
        expect(decimals.length).toBeLessThanOrEqual(2);
      }
    });
  });
});

// ---- validateSettlements ----

describe('validateSettlements', () => {
  it('returns error for empty balances array', () => {
    const result = validateSettlements([]);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error when players have no activity', () => {
    const balances = [
      makeBalance('Alice', 0, 0), // no activity
      makeBalance('Bob', 100, 100),
    ];

    const result = validateSettlements(balances);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Alice');
  });

  it('returns valid for balanced game', () => {
    const balances = [
      makeBalance('Alice', 100, 50),
      makeBalance('Bob', 50, 100),
    ];

    const result = validateSettlements(balances);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.totalBuyins).toBe(150);
    expect(result.totalCashouts).toBe(150);
    expect(result.netDifference).toBe(0);
  });

  it('returns warning for imbalance > $2.50', () => {
    const balances = [
      makeBalance('Alice', 100, 50),
      makeBalance('Bob', 50, 97),  // total cashouts = 147, buyins = 150, diff = 3
    ];

    const result = validateSettlements(balances);
    expect(result.isValid).toBe(true); // warnings don't block
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.netDifference).toBe(3);
  });

  it('returns no warning for imbalance within tolerance ($2.50)', () => {
    const balances = [
      makeBalance('Alice', 100, 50),
      makeBalance('Bob', 50, 98), // diff = 2, within tolerance
    ];

    const result = validateSettlements(balances);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns no warning at exactly $2.50 difference (boundary, strict >)', () => {
    const balances = [
      makeBalance('Alice', 100, 50),
      makeBalance('Bob', 50, 97.5), // diff = 2.50 exactly
    ];

    const result = validateSettlements(balances);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.netDifference).toBe(2.5);
  });

  it('computes totals correctly', () => {
    const balances = [
      makeBalance('Alice', 200, 80),
      makeBalance('Bob', 100, 220),
    ];

    const result = validateSettlements(balances);
    expect(result.totalBuyins).toBe(300);
    expect(result.totalCashouts).toBe(300);
    expect(result.netDifference).toBe(0);
  });
});

// ---- getSettlements ----

describe('getSettlements', () => {
  const balances = [
    makeBalance('Alice', 100, 0),
    makeBalance('Bob', 0, 100),
  ];

  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    jest.restoreAllMocks();
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('returns local result when forceLocal is true', async () => {
    const result = await getSettlements(balances, { forceLocal: true });
    expect(result.source).toBe('client');
    expect(result.algorithm).toBe('client-greedy-v1');
    expect(result.error).toBe('force-local');
    expect(result.settlements).toHaveLength(1);
  });

  it('returns local result for empty balances', async () => {
    const result = await getSettlements([], { forceLocal: false });
    expect(result.source).toBe('client');
    expect(result.settlements).toEqual([]);
  });

  it('returns local result when no endpoint is configured', async () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    const result = await getSettlements(balances);
    expect(result.source).toBe('client');
    expect(result.error).toBe('missing-endpoint');
  });

  it('returns server result on successful fetch', async () => {
    const mockResponse = {
      settlements: [{ from: 'Alice', to: 'Bob', amount: 100 }],
      algorithm: 'server-milp-v1',
      generatedAt: '2025-01-01T00:00:00Z',
      requestId: 'req_123',
      warnings: ['adjusted'],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await getSettlements(balances, {
      endpoint: 'https://api.example.com/settlements/optimal',
    });

    expect(result.source).toBe('server');
    expect(result.algorithm).toBe('server-milp-v1');
    expect(result.settlements).toHaveLength(1);
    expect(result.serverRequestId).toBe('req_123');
    expect(result.warnings).toEqual(['adjusted']);
  });

  it('falls back to local on fetch failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await getSettlements(balances, {
      endpoint: 'https://api.example.com/settlements/optimal',
    });

    expect(result.source).toBe('client');
    expect(result.error).toBe('Network error');
    expect(result.settlements).toHaveLength(1);
  });

  it('falls back to local on non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    });

    const result = await getSettlements(balances, {
      endpoint: 'https://api.example.com/settlements/optimal',
    });

    expect(result.source).toBe('client');
    expect(result.error).toContain('500');
  });

  it('falls back to local when server returns empty settlements array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ settlements: [] }),
    });

    const result = await getSettlements(balances, {
      endpoint: 'https://api.example.com/settlements/optimal',
    });

    expect(result.source).toBe('client');
    expect(result.error).toContain('Invalid settlement payload');
  });

  it('uses EXPO_PUBLIC_API_BASE_URL when no custom endpoint provided', async () => {
    process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.example.com';

    const mockResponse = {
      settlements: [{ from: 'Alice', to: 'Bob', amount: 100 }],
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    await getSettlements(balances);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/settlements/optimal',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('handles timeout via AbortController', async () => {
    jest.useFakeTimers();

    global.fetch = jest.fn().mockImplementation(
      (_url: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          if (options.signal) {
            options.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        })
    );

    const promise = getSettlements(balances, {
      endpoint: 'https://api.example.com/settlements/optimal',
      timeoutMs: 5000,
    });

    jest.advanceTimersByTime(5000);
    const result = await promise;

    expect(result.source).toBe('client');
    // DOMException is not instanceof Error in the Jest/Node environment, so the
    // service normalizes it to 'unknown-error'. Verify fallback was triggered.
    expect(result.error).toBeDefined();
  });
});
