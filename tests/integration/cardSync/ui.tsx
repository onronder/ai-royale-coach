// Isolated browser harness; every remote request is intercepted by browser.mjs.
import React, { useState } from 'react';
import { Toaster } from 'sonner';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SubscriptionUserContext } from '../../../src/hooks/useSubscription';
import { CardCollectionTracker } from '../../../src/components/cards/CardCollectionTracker';
import { FirstSessionTask } from '../../../src/components/coaching/FirstSessionTask';
import FirstCoaching from '../../../src/pages/FirstCoaching';
import { RecommendedDecksPanel } from '../../../src/components/deck/RecommendedDecksPanel';
import { useAllOperations } from '../../../src/hooks/useAllOperations';
import { useBackgroundSync } from '../../../src/hooks/useBackgroundSync';
import { TooltipProvider } from '../../../src/components/ui/tooltip';
import '../../../src/i18n';
import '../../../src/index.css';
const id='11111111-2222-4333-8444-555555555555';
const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
const scene=new URLSearchParams(location.search).get('scene')||'collection';
qc.setQueryData(['subscription-status',id],{hasAccess:scene!=='free',accountSlots:3,subscription:scene==='free'?null:{status:'active',accountSlots:3},trial:{isActive:false,hasUsedTrial:scene!=='free'}});
function Screen(){
 const [shown,setShown]=useState(true),[tag,setTag]=useState('UY02YVY9G');
 const {operations,cancelOperation}=useAllOperations();
 useBackgroundSync(scene==='background'?id:null,tag);
 return <main className="max-w-5xl mx-auto p-4"><Toaster/>
  <button onClick={()=>setShown(!shown)}>Toggle fixture</button>
  <button onClick={()=>setTag(tag==='UY02YVY9G'?'UQRCGQJR2':'UY02YVY9G')}>Switch tag</button>
  {operations.filter(o=>o.status==='running').map(o=><button key={o.id} onClick={()=>cancelOperation(o.id)}>Cancel fixture</button>)}
  {shown && (scene==='free'?<FirstCoaching/>:scene==='coaching'?<FirstSessionTask userId={id} playerTag={tag} onMatchResult={async()=>{}}/>:
    scene==='recommendations'?<RecommendedDecksPanel playerTag={tag} trophies={6500}/>:<CardCollectionTracker userId={id} playerTag={tag}/>)}
 </main>;
}
document.documentElement.classList.add('dark');
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={qc}><SubscriptionUserContext.Provider value={id}><BrowserRouter><TooltipProvider><Screen/></TooltipProvider></BrowserRouter></SubscriptionUserContext.Provider></QueryClientProvider>);
