import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {checkAiAccess} from '../supabase/functions/_shared/ai-access';
function db(status='trialing',admin=false){let inserts=0;return {get inserts(){return inserts},rpc:async()=>({data:admin}),from(name:string){return {select(){return this},eq(){return this},maybeSingle:async()=>({data:name==='user_subscriptions'?{status,current_period_end:'2099-01-01T00:00:00Z'}:null}),insert(){inserts++;return Promise.resolve({})}}}};}
describe('trial entitlement is separate from consumption',()=>{
 it('automatic summary does not consume the one daily choice',async()=>{const d=db();assert.equal((await checkAiAccess(d,'user','analyze-player',false)).allowed,true);assert.equal(d.inserts,0);});
 it('reading a saved result does not consume another choice',async()=>{const d=db();await checkAiAccess(d,'user','first-session-coaching',false);await checkAiAccess(d,'user','first-session-coaching',false);assert.equal(d.inserts,0);});
 it('ended trial cannot generate',async()=>{assert.equal((await checkAiAccess(db('expired'),'user','first-session-coaching',false)).allowed,false);});
 it('admin bypass does not consume trial allowance',async()=>{const d=db('trialing',true);const result=await checkAiAccess(d,'user','analyze-player',false);assert.equal(result.isAdmin,true);assert.equal(d.inserts,0);});
});
