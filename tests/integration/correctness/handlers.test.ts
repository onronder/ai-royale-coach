// Execute actual Edge entrypoints; only the server listener, database transport
// and game service are replaced. SQL behaviour is covered separately by run.ts.
import {mock,test,expect} from 'bun:test';
import {battle,tag} from '../../fixtures/observedBattles';
let listener:(req:Request)=>Promise<Response>;
let game:unknown=[],writes:Array<{name:string;args:any}>=[],network=0;
(globalThis as any).Deno={env:{get:(name:string)=>name==='LOG_LEVEL'?'error':'fixture'}};
globalThis.fetch=async()=>{network++;throw new Error('Network prohibited');};
const client={
 auth:{getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111'}},error:null})},
 functions:{invoke:async()=>({data:game,error:null})},
 rpc:async(name:string,args:any)=>{writes.push({name,args});return {data:true,error:null};},
 from:()=>{const chain:any={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:null,error:null}),upsert:async()=>({data:null,error:null})};return chain;}
};
mock.module('https://deno.land/std@0.168.0/http/server.ts',()=>({serve:(fn:typeof listener)=>{listener=fn;}}));
mock.module('https://esm.sh/@supabase/supabase-js@2.81.1',()=>({createClient:()=>client}));
await import('../../../supabase/functions/track-deck-stats/index.ts');const track=listener!;
await import('../../../supabase/functions/calculate-card-mastery/index.ts');const mastery=listener!;
await import('../../../supabase/functions/calculate-player-stats/index.ts');const summary=listener!;
const req=(auth=true)=>new Request('https://fixture.invalid',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer fixture'}:{})},body:JSON.stringify({playerTag:tag})});
for(const [name,handler] of [['decks',track],['cards',mastery]] as const){
 test(`${name}: unauthenticated request cannot write`,async()=>{writes=[];expect((await handler(req(false))).status).toBe(401);expect(writes).toHaveLength(0);});
 test(`${name}: provider schema failure cannot erase saved observations`,async()=>{writes=[];game={error:'unexpected payload'};expect((await handler(req())).status).toBeGreaterThanOrEqual(500);expect(writes).toHaveLength(0);});
 test(`${name}: handler persists only unique valid player observations`,async()=>{
  writes=[];game=[battle(),battle(),battle('20261119T140000.000Z',1,1)];
  expect((await handler(req())).status).toBe(200);
  const save=writes.find(w=>w.name==='replace_recent_observations')!;
  expect(save.args.p_feature).toBe(name);expect(save.args.p_tag).toBe(tag);expect(save.args.p_samples).toBe(2);
  expect(save.args.p_rows[0].battles_drawn).toBe(1);expect(network).toBe(0);
 });
}
test('player summary uses identical W/L/D denominator',async()=>{
 game=[battle(),battle('20261119T130000.000Z',0,1),battle('20261119T140000.000Z',1,1)];
 const result=await (await summary(req())).json();expect(result.totalBattles).toBe(3);expect(result.wins).toBe(1);expect(result.losses).toBe(1);expect(result.draws).toBe(1);expect(result.winRate).toBeCloseTo(100/3);expect(network).toBe(0);
});
