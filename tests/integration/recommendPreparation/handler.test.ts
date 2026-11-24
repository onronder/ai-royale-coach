import { mock, test, expect, beforeEach } from 'bun:test';
import { evidenceKey, evidenceHash } from '../../../supabase/functions/_shared/deck-evidence';
let listener: (request: Request) => Promise<Response>;
let enabled=true, legacyEnd: string | null = null;
let allowed=true, authenticated=true, fail='', count=0, active=0, peak=0, network=0, savedFingerprint='', reads:string[]=[];
const player={tag:'#P0LY',cards:[{id:26000000,name:'Knight',level:14,maxLevel:14}],currentDeck:[],trophies:6000};
const battles:any[]=[],templates:any[]=[],archetypes:any[]=[];
(globalThis as any).Deno={env:{get:(key:string)=>key==='LOG_LEVEL'?'error':'fixture'}};
globalThis.fetch=async()=>{network++;throw new Error('External calls forbidden');};
async function prepare(name:string,data:any){
 reads.push(name);count++;active++;peak=Math.max(active,peak);
 await new Promise(resolve=>setTimeout(resolve,40));active--;
 return {data,error:fail===name?new Error('fixture'):null};
}
const client={
 auth:{getUser:async()=>({data:{user:authenticated?{id:'fixture-user'}:null},error:null})},
 rpc:async()=>({data:false,error:null}),
 functions:{invoke:async(_name:string,{body}:any)=>prepare(body.endpoint,body.endpoint==='player'?player:battles)},
 from:(table:string)=>{
  const result=async()=>{
   if(table==='deck_templates')return prepare('templates',templates);
   if(table==='deck_archetypes')return prepare('archetypes',archetypes);
   if(table==='profiles')return {data:{trial_ends_at:legacyEnd,trial_used:true},error:null};
   if(table==='user_subscriptions')return {data:allowed?{status:'active',current_period_end:'2099-01-01T00:00:00Z'}:null,error:null};
   if(table==='player_profiles')return {data:{ai_enabled:enabled},error:null};
   if(table==='recommendation_history')return {data:[{id:'saved',recommended_cards:['Knight'],recommendation_score:0.75,avg_elixir:3,deck_name:'Stored',recommendation_reason:'Stored reason',ai_explanation:'Unchanged explanation'}],error:null};
   throw new Error('Unexpected table '+table);
  };
  const chain:any={select:()=>chain,in:()=>chain,eq:(key:string,value:string)=>{if(key==='input_fingerprint')savedFingerprint=value;return chain;},gte:()=>chain,order:()=>chain,limit:()=>chain,single:result,maybeSingle:result,then:(yes:any,no:any)=>result().then(yes,no)};
  return chain;
 }
};
mock.module('https://deno.land/std@0.168.0/http/server.ts',()=>({serve:(fn:typeof listener)=>{listener=fn;}}));
mock.module('https://esm.sh/@supabase/supabase-js@2.81.1',()=>({createClient:()=>client}));
await import('../../../supabase/functions/recommend-deck/index.ts');
const request=(auth=true)=>new Request('https://fixture.invalid',{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer fixture'}:{})},body:JSON.stringify({playerTag:'#P0LY',language:'en'})});
beforeEach(()=>{enabled=true;legacyEnd=null;allowed=true;authenticated=true;fail='';count=active=peak=network=0;reads=[];savedFingerprint='';});
test('access rejection performs no preparation or provider calls',async()=>{
 expect((await listener(request(false))).status).toBe(401);authenticated=false;expect((await listener(request())).status).toBe(401);
 authenticated=true;allowed=false;expect((await listener(request())).status).toBe(403);expect(count).toBe(0);expect(network).toBe(0);
});
test('four reads overlap after access; existing fingerprint and cached recommendation stay identical',async()=>{
 const start=performance.now();const response=await listener(request());const elapsed=performance.now()-start;
 expect(response.status).toBe(200);expect(count).toBe(4);expect(peak).toBe(4);
 expect(savedFingerprint).toBe(await evidenceHash(JSON.stringify([evidenceKey(player,battles),templates,archetypes])));
 const data=await response.json();expect(data.fromCache).toBe(true);expect(data.recommendations[0]).toMatchObject({historyId:'saved',deckName:'Stored',cards:['Knight'],avgElixir:3,matchScore:75,reason:'Stored reason',aiExplanation:'Unchanged explanation',fromCache:true});
 expect(network).toBe(0);console.log(JSON.stringify({fixtureReadDelayMs:40,serialReadDelayMs:160,observedHandlerMs:Math.round(elapsed),parallelPeak:peak}));
});
for(const failure of ['player','battles','templates','archetypes'])test(failure+' read failure cannot produce AI or successful output',async()=>{
 fail=failure;expect((await listener(request())).status).toBe(503);expect(network).toBe(0);expect(savedFingerprint).toBe('');expect(count).toBe(4);
});

test('a paid plan with a stale trial date still requires its selected AI profile',async()=>{
 enabled=false;legacyEnd='2099-01-01T00:00:00Z';
 expect((await listener(request())).status).toBe(403);
 expect(count).toBe(0);expect(network).toBe(0);
});
