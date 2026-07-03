import { PlayerBalance } from '@/types/game';

/** Threshold below which a balance is "negligible" — mirrors the app's imbalance tolerance. */
const REAL_OBLIGATION_THRESHOLD = 2.5;

/** Absolute floor: distortion below this ($) is never material. Matches imbalance tolerance. */
export const MATERIAL_DELTA_FLOOR = 2.5;
/** Relative gate: distortion below this fraction of the true balance is never material. */
export const MATERIAL_DISTORTION_RATIO = 0.2;

export type DistortionTier = 'zeroOut' | 'material';

export interface PlayerDistortion {
  playerName: string;
  original: number;
  rounded: number;
  delta: number;
  tier?: DistortionTier; // present only on entries in significantDistortions
}

export interface RoundingDistortion {
  perPlayer: PlayerDistortion[];
  zeroOuts: PlayerDistortion[];
  significantDistortions: PlayerDistortion[];
  maxDelta: number;
}

/** Round to the nearest `unit`. `unit <= 0` means Exact → return the value unchanged. */
export function roundToUnit(value: number, unit: number): number {
  if (!unit || unit <= 0) return value;
  return Math.round(value / unit) * unit;
}

/** Non-mutating copy of `balances` with each `netBalance` rounded to `unit`. */
export function roundBalancesToUnit(
  balances: PlayerBalance[],
  unit: number,
): PlayerBalance[] {
  return balances.map(b => ({ ...b, netBalance: roundToUnit(b.netBalance, unit) }));
}

/**
 * Per-player distortion introduced by rounding to `unit`. A "zero-out" is a real
 * obligation (|original| > 2.50) that rounds to exactly 0 (pays/receives nothing) —
 * the only case that warrants a hard confirm.
 */
export function computeRoundingDistortion(
  balances: PlayerBalance[],
  unit: number,
): RoundingDistortion {
  const perPlayer: PlayerDistortion[] = balances.map(b => {
    const rounded = roundToUnit(b.netBalance, unit) || 0; // normalize -0 → 0
    return {
      playerName: b.playerName,
      original: b.netBalance,
      rounded,
      delta: Math.abs(rounded - b.netBalance),
    };
  });

  const zeroOuts = perPlayer.filter(
    p => Math.abs(p.original) > REAL_OBLIGATION_THRESHOLD && p.rounded === 0,
  );

  const significantDistortions: PlayerDistortion[] = perPlayer
    .filter(
      p =>
        Math.abs(p.original) > REAL_OBLIGATION_THRESHOLD &&
        p.delta > MATERIAL_DELTA_FLOOR &&
        p.delta >= MATERIAL_DISTORTION_RATIO * Math.abs(p.original),
    )
    .map(p => ({ ...p, tier: (p.rounded === 0 ? 'zeroOut' : 'material') as DistortionTier }));

  const maxDelta = perPlayer.reduce((m, p) => Math.max(m, p.delta), 0);

  return { perPlayer, zeroOuts, significantDistortions, maxDelta };
}
