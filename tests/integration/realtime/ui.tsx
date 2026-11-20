import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../../../src/integrations/supabase/client';
import { SubscriptionUserContext } from '../../../src/hooks/useSubscription';
import { useUnifiedRealtime, useRealtimeReady } from '../../../src/hooks/useUnifiedRealtime';
import { useAllOperations } from '../../../src/hooks/useAllOperations';
import { useOperationProgress } from '../../../src/hooks/useOperationProgress';
import { i18nInit } from '../../../src/i18n';
const first = '11111111-2222-4333-8444-555555555555', second = '22222222-2222-4333-8444-555555555555';
let account = first;
const channels: any[] = [];
(supabase as any).channel = (name: string) => {
 const channel: any = { name, removed: false, listeners: [], on(_type: string, filter: any, cb: any) {this.listeners.push({filter,cb});return this;}, subscribe(cb: any) {this.status=cb;return this;} };
 channels.push(channel);return channel;
};
(supabase as any).removeChannel = async (channel: any) => {channel.removed=true;return 'ok';};
(supabase.auth as any).getUser = async () => ({data:{user:{id:account}},error:null});
function Operations() {
 const all=useAllOperations();const one=useOperationProgress({playerTag:'TAG',operationType:'fixture'});
 return <output data-testid="operations">{all.operations[0]?.status}/{one.progress?.status}</output>;
}
function Screen() {
 const [id,setId]=useState(first),[view,setView]=useState<'leaderboard'|'tournaments'|undefined>(),[tag,setTag]=useState('TAG');
 useUnifiedRealtime(id,view);const ready=useRealtimeReady(id);
 const notify=(status:string)=>channels.findLast(c=>c.name==='user-data:'+id&&!c.removed)?.status(status);
 return <SubscriptionUserContext.Provider value={id}>
  <output data-testid="ready">{String(ready)}</output><output data-testid="tag">{tag}</output><Operations/>
  <button onClick={()=>notify('SUBSCRIBED')}>Connected</button><button onClick={()=>notify('CHANNEL_ERROR')}>Disconnected</button>
  <button onClick={()=>setView('leaderboard')}>Leaderboard</button><button onClick={()=>setView('tournaments')}>Tournaments</button><button onClick={()=>setView(undefined)}>Overview</button>
  <button onClick={()=>setTag(t=>t==='TAG'?'OTHER':'TAG')}>Player</button>
  <button onClick={()=>{account=second;setId(second);}}>Account</button>
  <button onClick={()=>channels.find(c=>c.name==='user-data:'+first)?.status('SUBSCRIBED')}>Stale callback</button>
  <button onClick={()=>{(window as any).channelSnapshot=channels.map(c=>({name:c.name,removed:c.removed,tables:c.listeners.map((l:any)=>l.filter.table)}));}}>Snapshot</button>
 </SubscriptionUserContext.Provider>;
}
await i18nInit;
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><Screen/></QueryClientProvider>);
