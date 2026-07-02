import { PlayerBalance } from '@/types/game';
import {
  roundToUnit,
  roundBalancesToUnit,
  computeRoundingDistortion,
} from '@/utils/roundingUtils';

const bal = (playerName: string, netBalance: number): PlayerBalance => ({
  playerId: playerName,
  playerName,
  totalBuyins: netBalance < 0 ? -netBalance : 0,
  totalCashouts: netBalance > 0 ? netBalance : 0,
  netBalance,
});

describe('roundToUnit', () => {
  it('rounds to nearest unit', () => {
    expect(roundToUnit(53, 20)).toBe(60);
    expect(roundToUnit(9, 20)).toBe(0);
    expect(roundToUnit(-9, 20)).toBe(-0); // -0 acceptable; see toBeCloseTo below
  });
  it('is a no-op for Exact (unit <= 0)', () => {
    expect(roundToUnit(53.47, 0)).toBe(53.47);
    expect(roundToUnit(53.47, -1)).toBe(53.47);
  });
});

describe('computeRoundingDistortion', () => {
  it('flags a real obligation that zeroes out at a $20 unit', () => {
    const d = computeRoundingDistortion([bal('A', -60), bal('B', -9), bal('C', 69)], 20);
    expect(d.zeroOuts.map(z => z.playerName)).toEqual(['B']); // |9|>2.50 and rounds to 0
  });
  it('does NOT flag ordinary distortion that stays non-zero', () => {
    const d = computeRoundingDistortion([bal('A', -31), bal('C', 31)], 20);
    expect(d.zeroOuts).toHaveLength(0);          // 31 -> 40, still non-zero
    expect(d.maxDelta).toBeCloseTo(9);
  });
  it('never flags at the safe $5 unit (max distortion 2.50)', () => {
    const d = computeRoundingDistortion([bal('A', -7.49), bal('C', 7.49)], 5);
    expect(d.zeroOuts).toHaveLength(0);
  });
  it('produces zero distortion in Exact mode', () => {
    const d = computeRoundingDistortion([bal('A', -53.47), bal('C', 53.47)], 0);
    expect(d.perPlayer.every(p => p.delta === 0)).toBe(true);
    expect(d.zeroOuts).toHaveLength(0);
  });
  it('does NOT flag a balance of exactly $2.50 that rounds to 0 (strict > 2.50)', () => {
    const d = computeRoundingDistortion([bal('A', 2.50), bal('C', -2.50)], 10);
    expect(d.zeroOuts).toHaveLength(0);
  });
});

describe('roundBalancesToUnit', () => {
  it('returns copies with rounded netBalance and leaves input untouched', () => {
    const input = [bal('A', -53), bal('C', 53)];
    const out = roundBalancesToUnit(input, 20);
    expect(out.map(b => b.netBalance)).toEqual([-60, 60]);
    expect(input[0].netBalance).toBe(-53); // not mutated
  });
});
