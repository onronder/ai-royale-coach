// Imported ONLY into the disposable copy. Real Auth/PostgREST and Edge runtime;
// fake game/AI transport. No provider credentials or external requests.
import captured from './battles.json' with {type:'json'};
const original=globalThis.fetch;
for(const match of Object.values(captured))for(const side of [match.team,match.opponent])for(const p of side)p.tag += '0';
const deck=captured.ladder.team[0].cards;
const extra=captured.ladder.opponent[0].cards.find(c=>!deck.some(d=>d.id===c.id))!;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 const internal=new URL(Deno.env.get('SUPABASE_URL')!);
 if(url.origin===internal.origin&&['kong','127.0.0.1','localhost'].includes(url.hostname)) return original(input,init);
 const json=(data:unknown)=>new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
 if(['api.clashroyale.com','proxy.royaleapi.dev'].includes(url.hostname)){
  if(url.searchParams.get('name')==='fixture_503')return new Response('{}',{status:503});
  if(url.searchParams.get('name')==='fixture_429')return new Response('{}',{status:429});
  if(url.searchParams.get('name')==='fixture_timeout')throw new Error('Synthetic timeout');
  if(url.pathname.endsWith('/battlelog')){
   const saved=await original(internal.origin+'/rest/v1/coaching_tasks?player_tag=eq.P00&select=recommended_deck,shown_at',{headers:{apikey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,Authorization:'Bearer '+Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}});
   const tasks=await saved.json(),task=Array.isArray(tasks)?tasks.find(t=>t.shown_at&&t.recommended_deck):null;
   if(task){const b=structuredClone(captured.ladder);b.battleTime=new Date().toISOString().replace(/[-:]/g,'');b.team[0].cards=task.recommended_deck;return json([b]);}
   return json([captured.ladder,captured.two_v_two,captured.duel]);
  }
  if(url.pathname.includes('/players/'))return json({tag:'#P00',name:'Fixture',currentDeck:captured.ladder.team[0].cards,cards:[...deck,extra],trophies:6000});
  if(url.pathname.includes('/rankings/')||url.pathname.includes('/locations')||url.pathname.includes('/clans'))return json({items:[]});
 }
 if(url.hostname==='ai.gateway.lovable.dev'&&url.pathname.endsWith('/chat/completions'))return json({id:'fake-local-match',model:'fake',choices:[{message:{content:JSON.stringify({analysis:'You lost because of a disconnect.',deckMatchup:'Try comparing these decks.',recommendations:['Try practising a defensive counterpush.'],pivotalInteractions:[null],counterDeck:null})}}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}});
 if(url.hostname==='ai.gateway.lovable.dev'&&url.pathname.endsWith('/responses')){
  const text=JSON.stringify({remove_id:deck[0].id,add_id:extra.id,reason:'Practice fixture.',practice:'Try a defensive counterpush.'});
  const part={type:'output_text',text,annotations:[]},item={id:'msg_local',type:'message',role:'assistant',content:[part],status:'completed'};
  const response={id:'resp_local',created_at:Math.floor(Date.now()/1000),model:'openai/gpt-6-astra',status:'completed',output:[item],usage:{input_tokens:11,output_tokens:9,input_tokens_details:{cached_tokens:4},output_tokens_details:{reasoning_tokens:2}}};
  const events=[{type:'response.created',response:{...response,status:'in_progress',output:[]}},{type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',content:[]}},{type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{...part,text:''}},{type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:text},{type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text},{type:'response.content_part.done',item_id:item.id,output_index:0,content_index:0,part},{type:'response.output_item.done',output_index:0,item},{type:'response.completed',response}];
  console.log('ACCEPTANCE_FAKE_AI_RESPONSES');
  return new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''),{headers:{'content-type':'text/event-stream','x-lovable-aig-run-id':'run_local'}});
 }
 if(url.hostname==='api.resend.com'&&url.pathname==='/emails'){const payload=JSON.parse(String(init?.body));if(!JSON.stringify(payload.to).includes('@example.invalid'))throw Error('Synthetic recipient required');console.log('ACCEPTANCE_FAKE_EMAIL');return json({id:'fake_email_local'});}
 console.error('ACCEPTANCE_EGRESS_BLOCKED',url.origin,url.pathname);
 throw new Error('External request prohibited by isolated acceptance transport');
};
