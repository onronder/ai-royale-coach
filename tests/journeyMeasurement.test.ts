import { describe, expect, it } from 'bun:test';
import { beginJourney, type JourneyRecord } from '../src/lib/journeyMeasurement';
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
function visibility() {
  const events = new EventTarget();
  return { visibilityState: 'visible', addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events), change() { events.dispatchEvent(new Event('visibilitychange')); } };
}
describe('browser journey measurement', () => {
 it('uses one id, no result before finish, monotonic total elapsed time, unknown cache', async () => {
   const rows: JourneyRecord[] = []; let time=5; const v=visibility();
   const m=beginJourney('free_coaching','manual','fixture',async r=>{rows.push(r)},()=>time,v as any);
   await flush();expect(rows).toHaveLength(1);expect(rows[0].p_duration_ms).toBeNull();
   time=1605;m.finish('success');m.finish('failed');await flush();
   expect(rows).toHaveLength(2);expect(rows[1].p_duration_ms).toBe(1600);expect(rows[1].p_id).toBe(rows[0].p_id);
   expect(rows[1].p_reuse).toBe('unknown');expect(Object.keys(rows[1]).sort()).toEqual(['p_build','p_duration_ms','p_flow','p_hidden','p_id','p_outcome','p_reuse','p_trigger']);
 });
 it('remembers any background time even when completion is visible', async () => {
   const rows:JourneyRecord[]=[];const v=visibility();const m=beginJourney('card_sync','automatic','fixture',async r=>{rows.push(r)},()=>5,v as any);
   v.visibilityState='hidden';v.change();v.visibilityState='visible';v.change();m.finish('success','joined');await flush();
   expect(rows[1].p_hidden).toBe(true);expect(rows[1].p_reuse).toBe('joined');
 });
 it('failed telemetry cannot fail product work and does not retry indefinitely', async () => {
   let calls=0;const m=beginJourney('first_coaching','manual','fixture',async()=>{calls++;throw new Error('offline')},()=>10,visibility() as any);
   expect(()=>m.finish('interrupted')).not.toThrow();await flush();expect(calls).toBe(2);
 });
 it('invalid/overlong elapsed time is unknown rather than zero', async () => {
   let n=0;const rows:JourneyRecord[]=[];const m=beginJourney('deck_recommendation','automatic','fixture',async r=>{rows.push(r)},()=>n,visibility() as any);
   n=4_000_000;m.finish('failed');await flush();expect(rows[1].p_duration_ms).toBeNull();
 });
});
