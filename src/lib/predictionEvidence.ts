export function predictionEvidence(row: {
 observation_mode?: string | null;
 actual_battles_total?: number | null;
 actual_wins_deck_a?: number | null;
 actual_losses_deck_a?: number | null;
}) {
 const observed = !!row.observation_mode;
 const n = observed ? row.actual_battles_total ?? 0 : 0;
 const wins = observed ? row.actual_wins_deck_a ?? 0 : 0;
 return { observationMode:row.observation_mode ?? null,actualBattlesTotal:n,actualWinsA:wins,
  actualLossesA:observed ? row.actual_losses_deck_a ?? 0 : 0,
  actualWinRateA:n ? Math.round(wins/n*100) : null,
  // A post-prediction outcome sample is not calibrated model accuracy.
  predictionError:null };
}
export function measuredPredictionErrors<T extends {actualBattlesTotal:number;predictionError:number|null}>(rows:T[]):T[] {
 return rows.filter(r=>r.actualBattlesTotal>0 && typeof r.predictionError==='number' && Number.isFinite(r.predictionError));
}
