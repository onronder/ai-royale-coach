// Controlled transport benchmark, not a claim about production latency or billing.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { handleCardSync } from '../../../supabase/functions/sync-card-collection/handler';
import { jsonResponse, errorResponse, handleCors } from '../../../supabase/functions/_shared/cors';
const before = execFileSync('git',['show','ff89823f1e1fcdfc199881af5594b2781f012b69:supabase/functions/sync-card-collection/index.ts'],{encoding:'utf8'});
const executable=ts.transpileModule(before.replace(/^import .*\n/gm,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const pause=()=>new Promise(r=>setTimeout(r,2));
const player={tag:'#UY02YVY9G',name:'Fixture',trophies:6500,cards:Array.from({length:120},(_,i)=>({id:26000000+i,name:'Card '+i,level:10,count:0,maxLevel:15,rarity:'common',elixirCost:3}))};
let requests=0,provider=0,oldHandler: (r: Request)=>Promise<Response>;
const query:any={select(){return this},eq(){return this},maybeSingle(){return this},upsert(){return this},
 then(resolve:any,reject:any){requests++;return pause().then(()=>({data:null,error:null})).then(resolve,reject)}};
const client={auth:{getUser:async()=>({data:{user:{id:'fixture'}},error:null})},from:()=>query};
const game=async()=>{provider++;await pause();return jsonResponse(player)};
new Function('serve','createClient','Deno','handleCors','jsonResponse','errorResponse','logger','fetch',executable)(
 (handler:any)=>{oldHandler=handler},()=>client,{env:{get:()=> 'fixture'}},handleCors,jsonResponse,errorResponse,{info(){},error(){}},game);
const req=()=>new Request('https://fixture.invalid',{method:'POST',headers:{authorization:'Bearer fixture'},body:JSON.stringify({playerTag:'UY02YVY9G'})});
const oldTimes:number[]=[],newTimes:number[]=[];let oldCount=0,newCount=0;
for(let i=0;i<5;i++){
 requests=provider=0;let start=performance.now();const old=await oldHandler!(req());oldTimes.push(performance.now()-start);
 assert.equal((await old.json()).synced_cards,120);assert.equal(provider,1);oldCount=requests;
 requests=provider=0;start=performance.now();const result=await handleCardSync(req(),{
  authenticate:async()=> 'fixture',player:async()=>{provider++;await pause();return player},
  rpc:async fn=>{requests++;await pause();return {operation_id:'fixture',run_id:'run',status:fn.startsWith('claim')?'running':'completed',claimed:true,
    success:!fn.startsWith('claim'),reused:false,synced_cards:fn.startsWith('claim')?null:120,error_code:null}}});
 newTimes.push(performance.now()-start);assert.equal((await result.json()).synced_cards,120);assert.equal(provider,1);newCount=requests;
}
assert.equal(oldCount,152);assert.equal(newCount,2);
console.log(JSON.stringify({fixture:'120 cards; fake provider; 2ms per DB transport and provider call; 5 runs; auth excluded',
 old:{database_round_trips:oldCount,mean_ms:oldTimes.reduce((a,b)=>a+b)/5},
 new:{database_round_trips:newCount,mean_ms:newTimes.reduce((a,b)=>a+b)/5},
 limitation:'Controlled overhead demonstration only. Not production p50/p95, AI savings or a Lovable bill estimate.'},null,2));
