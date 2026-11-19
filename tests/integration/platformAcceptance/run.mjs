import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const status=JSON.parse(await readFile('/tmp/royale-err35-private/status.json','utf8'));
const base=status.API_URL;
assert.equal(base,'http://127.0.0.1:56321');
const service=status.SERVICE_ROLE_KEY,anon=status.ANON_KEY;
async function request(path,token=service,body,method='POST'){
 const response=await fetch(base+path,{method,signal:AbortSignal.timeout(90000),headers:{apikey:anon,...(token?{Authorization:'Bearer '+token}:{}),'content-type':'application/json','prefer':'return=representation'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 const text=await response.text();let data;
 try{data=JSON.parse(text);}catch{try{data=JSON.parse(text.trim().split('\n').at(-1));}catch{data={text};}}
 return {status:response.status,inner:typeof data?.status==='number'?data.status:response.status,data,allow:response.headers.get('access-control-allow-origin')};
}
const manifest=JSON.parse(await readFile('/tmp/royale-err35-private/function-manifest.json','utf8'));
const matrix=[];
for(const {name} of manifest){
 const options=await request('/functions/v1/'+name,null,undefined,'OPTIONS');
 const guest=await request('/functions/v1/'+name,null,{playerTag:'#P00',action:'get',endpoint:'battles'});
 const anonymous=await request('/functions/v1/'+name,anon,{playerTag:'#P00',action:'get',endpoint:'battles'});
 matrix.push({name,options:options.status,cors:options.allow,guest:guest.inner,anonymous:anonymous.inner,detail:anonymous.inner>=500?anonymous.data:undefined});
}
const publicNames=['check-grace-period-expiry','clash-royale-api','get-subscription-status','lookup-discount','search-clans','polar-webhook','resend-webhook','marketing-unsubscribe','confirmed-welcome','trial-coaching-reminder','trial-coaching-summary','cleanup-old-messages'];
for(const row of matrix){assert(row.guest<500&&row.anonymous<500,JSON.stringify(row));assert.equal(row.cors,'*');if(!publicNames.includes(row.name)){assert.equal(row.guest,401,row.name);assert.equal(row.anonymous,401,row.name);}}
await writeFile('/tmp/royale-err35-private/runtime-matrix.json',JSON.stringify(matrix,null,2));
console.log(JSON.stringify({functions:matrix.length,matrix}));
const prior=await request('/auth/v1/admin/users',service,undefined,'GET');
for(const u of prior.data.users??[])if(/^acceptance-(free|trial|paid|expired|past_due|admin|renewal_off)@example\.invalid$/.test(u.email))await request('/auth/v1/admin/users/'+u.id,service,undefined,'DELETE');
const accounts={};
for(const kind of ['free','trial','paid','expired','past_due','admin','renewal_off']){
 const email=`acceptance-${kind}@example.invalid`,password='Local-fixture-only-938612!';
 let create=await request('/auth/v1/admin/users',service,{email,password,email_confirm:true});
 if(create.status!==200){
  const existing=await request('/auth/v1/admin/users',service,undefined,'GET');
  create={data:existing.data.users.find(u=>u.email===email)};
 }
 assert(create.data.id,JSON.stringify(create));
 const login=await request('/auth/v1/token?grant_type=password',anon,{email,password});assert.equal(login.status,200);
 accounts[kind]={id:create.data.id,token:login.data.access_token};
 const profile=await request('/rest/v1/profiles?on_conflict=id',service,{id:create.data.id,email,preferred_language:'en'});
 assert([201,409].includes(profile.status),JSON.stringify(profile));
 if(kind==='admin')await request('/rest/v1/admin_roles',service,{user_id:create.data.id,role:'admin'});
 else if(kind!=='free'){
  await request('/rest/v1/user_subscriptions?user_id=eq.'+create.data.id,service,undefined,'DELETE');
  const sub=await request('/rest/v1/user_subscriptions',service,{user_id:create.data.id,status:kind==='trial'||kind==='renewal_off'?'trialing':kind==='paid'?'active':kind,current_period_end:new Date(Date.now()+(kind==='expired'?-1:1)*86400000).toISOString(),account_slots:kind==='paid'?1:3,cancel_at_period_end:kind==='renewal_off'});
  assert.equal(sub.status,201,JSON.stringify(sub));
 }
 const access=await request('/functions/v1/get-subscription-status',accounts[kind].token,{});
 assert.equal(access.data.hasAccess,['trial','paid','admin','renewal_off'].includes(kind),`${kind}: ${JSON.stringify(access)}`);
 console.log('PASS real Auth and subscription access:',kind);
}
await writeFile('/tmp/royale-err35-private/accounts.json',JSON.stringify(accounts),{mode:0o600});
const defaults=await request('/rest/v1/marketing_settings',service,{singleton:true,sending_enabled:false});
assert([201,409].includes(defaults.status));
const flag=await request('/rest/v1/marketing_settings?select=sending_enabled',service,undefined,'GET');assert.equal(flag.data[0].sending_enabled,false);
const protectedEdit=await request('/rest/v1/profiles?id=eq.'+accounts.free.id,accounts.free.token,{trial_ends_at:'2099-01-01T00:00:00Z'},'PATCH');assert.equal(protectedEdit.status,403);
const ownPreference=await request('/rest/v1/profiles?id=eq.'+accounts.free.id,accounts.free.token,{preferred_language:'tr'},'PATCH');assert.equal(ownPreference.status,200);assert.equal(ownPreference.data[0].preferred_language,'tr');
const other=await request('/rest/v1/profiles?id=eq.'+accounts.paid.id,accounts.free.token,undefined,'GET');assert.deepEqual(other.data,[]);
console.log('PASS real PostgREST/RLS: protected trial write blocked, own preference allowed, other account hidden; campaigns OFF');
await writeFile('/tmp/royale-err35-private/platform-results.json',JSON.stringify({matrix,accountAccess:Object.keys(accounts),rls:true,campaignsOff:true},null,2));
