import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionUserContext } from './useSubscription';
import { beginJourney, type JourneyFlow, type JourneyOutcome, type JourneyReuse } from '@/lib/journeyMeasurement';

export function useJourneyMeasurement(flow: JourneyFlow, scope: string, usable: boolean, failed = false) {
  const account = useContext(SubscriptionUserContext);
  const active = useRef<{ journey: ReturnType<typeof beginJourney>; ready: boolean; reuse: JourneyReuse }>();
  const [revision, render] = useState(0);
  useEffect(() => {
    const interrupt = () => { active.current?.journey.finish('interrupted'); active.current = undefined; };
    window.addEventListener('pagehide', interrupt);
    return () => { interrupt(); window.removeEventListener('pagehide', interrupt); };
  }, [account, scope, flow]);
  const begin = useCallback((trigger: 'automatic' | 'manual') => {
    active.current?.journey.finish('interrupted');
    const journey = beginJourney(flow, trigger, import.meta.env.VITE_APP_REVISION || 'unknown', async record => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!account || session?.user.id !== account) return;
      await supabase.rpc('record_journey_measurement', record);
    });
    const item = { journey, ready: false, reuse: 'unknown' as JourneyReuse };
    active.current = item;
    return {
      complete: (outcome: Exclude<JourneyOutcome, 'running'>, reuse?: JourneyReuse) => {
        journey.finish(outcome, reuse);
        if (active.current === item) active.current = undefined;
      },
      ready: (reuse: JourneyReuse = 'unknown') => {
        if (active.current !== item) return;
        item.ready = true; item.reuse = reuse; render(n => n + 1);
      },
    };
  }, [account, flow, scope]);
  useEffect(() => {
    const item = active.current;
    if (!item?.ready || (!usable && !failed)) return;
    let frame = 0;
    const finish = () => {
      if (active.current !== item) return;
      item.journey.finish(failed ? 'failed' : 'success', item.reuse); active.current = undefined;
    };
    // Two animation frames put the completion after React's committed result.
    // Hidden tabs are retained but excluded from foreground latency summaries.
    if (document.visibilityState !== 'visible') { finish(); return; }
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(finish); });
    return () => cancelAnimationFrame(frame);
  }, [usable, failed, revision]);
  return begin;
}
