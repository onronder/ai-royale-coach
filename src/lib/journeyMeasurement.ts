export type JourneyFlow = 'free_coaching' | 'first_coaching' | 'deck_recommendation' | 'card_sync';
export type JourneyOutcome = 'running' | 'success' | 'failed' | 'cancelled' | 'interrupted' | 'needs_input';
export type JourneyReuse = 'unknown' | 'fresh' | 'joined' | 'generated';
export interface JourneyRecord {
  p_id: string; p_flow: JourneyFlow; p_trigger: 'automatic' | 'manual';
  p_outcome: JourneyOutcome; p_duration_ms: number | null; p_hidden: boolean;
  p_reuse: JourneyReuse; p_build: string;
}
// Only an allowlisted record leaves the browser. No tag, deck, prompt or error text.
export function beginJourney(flow: JourneyFlow, trigger: 'automatic' | 'manual', build: string,
  send: (record: JourneyRecord) => Promise<unknown>, now = () => performance.now(),
  visibility: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> = document) {
  const started = now();
  let hidden = visibility.visibilityState !== 'visible', ended = false;
  const changed = () => { hidden ||= visibility.visibilityState !== 'visible'; };
  visibility.addEventListener('visibilitychange', changed);
  const base = { p_id: crypto.randomUUID(), p_flow: flow, p_trigger: trigger, p_build: build };
  // Serialize start/finish; failures are isolated from product work and never retried.
  const first = Promise.resolve().then(() => send({ ...base, p_outcome: 'running', p_duration_ms: null,
    p_hidden: hidden, p_reuse: 'unknown' })).catch(() => {});
  return {
    id: base.p_id,
    finish(outcome: Exclude<JourneyOutcome, 'running'>, reuse: JourneyReuse = 'unknown') {
      if (ended) return;
      ended = true; changed();
      visibility.removeEventListener('visibilitychange', changed);
      const duration = Math.round(now() - started);
      void first.then(() => send({ ...base, p_outcome: outcome,
        p_duration_ms: duration >= 0 && duration <= 3_600_000 ? duration : null,
        p_hidden: hidden, p_reuse: reuse })).catch(() => {});
    },
  };
}
