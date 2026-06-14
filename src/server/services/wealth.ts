/**
 * Logica pura per obiettivi e patrimonio netto. Importi in centesimi.
 */

/** Patrimonio netto = attività − passività. */
export function netWorth(assets: number, liabilities: number): number {
  return assets - liabilities;
}

export interface GoalProgress {
  current: number;
  target: number;
  remaining: number;
  percent: number; // 0-100 (cap)
  reached: boolean;
}

export function goalProgress(current: number, target: number): GoalProgress {
  const reached = target > 0 ? current >= target : current > 0;
  const remaining = Math.max(0, target - current);
  const rawPercent =
    target > 0 ? (current / target) * 100 : current > 0 ? 100 : 0;
  const percent = Math.max(0, Math.min(100, Math.round(rawPercent)));
  return { current, target, remaining, percent, reached };
}
