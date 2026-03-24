/** Duration of the free trial in days. */
export const TRIAL_DURATION_DAYS = 7;

/** Returns true if the trial is currently active (trialEndsAt is in the future). */
export function isTrialActive(trialEndsAt: Date | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return trialEndsAt.getTime() > Date.now();
}

/** Returns the number of full days remaining in the trial (0 if expired/null). */
export function getTrialDaysRemaining(trialEndsAt: Date | null | undefined): number {
  if (!trialEndsAt) return 0;
  const remaining = trialEndsAt.getTime() - Date.now();
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

/** Returns a human-readable label for the trial countdown. */
export function getTrialLabel(daysRemaining: number): string {
  if (daysRemaining <= 0) return 'Trial expired';
  if (daysRemaining === 1) return '1 day left';
  return `${daysRemaining} days left`;
}
