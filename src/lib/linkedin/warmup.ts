/**
 * Limites quotidiennes de warm-up progressif (anti-ban LinkedIn).
 * Semaine 1 = 5/jour, Semaine 2 = 10/jour, Semaine 3 = 15/jour, Semaine 4+ = 20/jour.
 */
const WARMUP_LIMITS = [5, 10, 15, 20] as const;

export function getDailyLimit(firstInvitationAt: string | null): number {
  if (!firstInvitationAt) return WARMUP_LIMITS[0];
  const first = new Date(firstInvitationAt).getTime();
  const now = Date.now();
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksElapsed = Math.floor((now - first) / msPerWeek);
  const index = Math.min(weeksElapsed, WARMUP_LIMITS.length - 1);
  return WARMUP_LIMITS[Math.max(0, index)];
}
