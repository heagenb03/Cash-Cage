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

describe('computeRoundingDistortion — significantDistortions', () => {
  it('flags material (non-zero) distortion: $31 -> $40 at unit 20', () => {
    const d = computeRoundingDistortion([bal('A', -31), bal('B', 31)], 20);
    expect(d.significantDistortions.map(s => s.playerName).sort()).toEqual(['A', 'B']);
    expect(d.significantDistortions.every(s => s.tier === 'material')).toBe(true);
    expect(d.zeroOuts).toHaveLength(0); // unchanged: neither rounds to 0
  });

  it('stays empty at the default $5 unit (absolute floor): $8 -> $10', () => {
    const d = computeRoundingDistortion([bal('A', 8), bal('B', -8)], 5);
    // delta 2 is below the 2.5 floor even though ratio 25% >= 20%
    expect(d.significantDistortions).toHaveLength(0);
  });

  it('stays empty on high-stakes coarse games (relative gate): $173 -> $180 at unit 20', () => {
    const d = computeRoundingDistortion([bal('A', 173), bal('B', -173)], 20);
    // delta 7 clears the floor but ratio ~4% is below 20%
    expect(d.significantDistortions).toHaveLength(0);
  });

  it('includes zero-outs tagged tier "zeroOut" and keeps zeroOuts unchanged', () => {
    const d = computeRoundingDistortion([bal('A', -60), bal('B', -9), bal('C', 69)], 20);
    const zo = d.significantDistortions.filter(s => s.tier === 'zeroOut');
    expect(zo.map(s => s.playerName)).toEqual(['B']);        // -9 -> 0
    expect(d.zeroOuts.map(z => z.playerName)).toEqual(['B']); // unchanged
    // C: 69 -> 60 is delta 9 but ratio 13% < 20%, so NOT flagged
    expect(d.significantDistortions.map(s => s.playerName)).toEqual(['B']);
  });

  it('normalizes -0 to 0 on the rounded value', () => {
    const d = computeRoundingDistortion([bal('A', -9)], 20);
    expect(Object.is(d.perPlayer[0].rounded, -0)).toBe(false);
    expect(d.perPlayer[0].rounded).toBe(0);
  });
});
