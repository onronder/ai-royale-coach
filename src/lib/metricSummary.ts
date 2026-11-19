/**
 * Measured-only metric helpers. Missing values are "unknown", never zero:
 * [100, null, 300] averages to 200 ms with 2/3 coverage, not 133.3 ms.
 */
export interface MeasuredAverage {
  average: number | null;
  measured: number;
  total: number;
}

export function measuredAverage(values: ReadonlyArray<number | null | undefined>): MeasuredAverage {
  let sum = 0;
  let measured = 0;
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      sum += v;
      measured++;
    }
  }
  return { average: measured > 0 ? sum / measured : null, measured, total: values.length };
}

/** Share of `true` among rows whose flag was actually recorded; null when none were. */
export function measuredRate(flags: ReadonlyArray<boolean | null | undefined>): MeasuredAverage {
  const known = flags.filter((f): f is boolean => typeof f === 'boolean');
  const hits = known.filter(Boolean).length;
  return { average: known.length > 0 ? (hits / known.length) * 100 : null, measured: known.length, total: flags.length };
}

/** Combine per-group averages weighted by their measured counts only. */
export function combineMeasured(parts: ReadonlyArray<MeasuredAverage>): MeasuredAverage {
  let sum = 0;
  let measured = 0;
  let total = 0;
  for (const p of parts) {
    total += p.total;
    if (p.average !== null && p.measured > 0) {
      sum += p.average * p.measured;
      measured += p.measured;
    }
  }
  return { average: measured > 0 ? sum / measured : null, measured, total };
}
