import {PredictionAccuracyDashboard} from '../../../src/components/analytics/PredictionAccuracyDashboard';
// Local-only harness: production components, synthetic observations, blocked network.
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,useNavigate,useLocation} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {TooltipProvider} from '../../../src/components/ui/tooltip';
import {DeckBuilder} from '../../../src/components/deck/DeckBuilder';
import {RecommendedDecksPanel} from '../../../src/components/deck/RecommendedDecksPanel';
import {CardMasteryCard} from '../../../src/components/mastery/CardMasteryCard';
import {ProDNACard} from '../../../src/components/social/ProDNACard';
import {DeckTrendChart} from '../../../src/components/analytics/DeckTrendChart';
import {FirstSessionTask} from '../../../src/components/coaching/FirstSessionTask';
import {calculatePlayerDNA} from '../../../src/utils/playerDnaCalculator';
import {SubscriptionUserContext} from '../../../src/hooks/useSubscription';
import {deckBuilderUrl} from '../../../src/lib/deckNavigation';
import {clashRoyaleApi} from '../../../src/services/clashRoyaleApi';
import {cards,battle,tag} from '../../fixtures/observedBattles';
import {recentStatistics} from '../../../supabase/functions/_shared/recent-statistics';
import '../../../src/i18n';
import '../../../src/index.css';
const user='11111111-2222-4333-8444-555555555555';
const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
qc.setQueryData(['subscription-status',user],{hasAccess:true,accountSlots:3,subscription:{status:'active',accountSlots:3},trial:{isActive:false,hasUsedTrial:true}});
const sample=recentStatistics([battle(),battle('20251119T120000.000Z',0,1)],tag);
const card={...sample.cards[0],id:'c',best_partner_cards:[],worst_matchup_cards:[],ai_tips:null,ai_tips_language:null,last_updated:'2026-11-19T12:00:00Z',win_rate:0.5,crown_avg:1};
function Screen(){
 const location=useLocation(),navigate=useNavigate();const p=new URLSearchParams(location.search),scene=p.get('scene')||'observations';const [rank,setRank]=useState('waiting');const [snapshot,setSnapshot]=useState('collection-a');
 return <main className="max-w-6xl mx-auto p-4 space-y-5">
  {scene==='observations'&&<><section data-testid="mastery"><CardMasteryCard card={card as any} playerTag={tag}/></section><ProDNACard dna={calculatePlayerDNA([battle()],tag)} playerName="Fixture" playerTag={tag}/><DeckTrendChart stats={sample.decks as any}/></>}
  {scene==='builder'&&<DeckBuilder key={`${p.get('account')}:${p.get('deck')}`} userId={p.get('account')||user} playerTag={tag} currentDeck={cards} availableCards={cards} importedNames={p.get('deck')}/>}
  {scene==='recommendations'&&<><button onClick={()=>setSnapshot('collection-b')}>Change fixture collection</button><RecommendedDecksPanel snapshotKey={snapshot} playerTag={tag} trophies={6000} onImportDeck={names=>navigate('/tests/integration/correctness/ui.html?scene=builder&'+deckBuilderUrl(tag,names).split('?')[1])}/></>}
  {(scene==='coaching'||scene==='completed')&&<FirstSessionTask userId={user} playerTag={tag} onMatchResult={async()=>{}}/>}
  {scene==='predictions'&&<PredictionAccuracyDashboard playerTag={tag}/> }
  {scene==='rankings'&&<><button onClick={()=>{setRank('loading');clashRoyaleApi.getGlobalTopLadder().then(rows=>setRank(rows.length?'rows':'empty')).catch(()=>setRank('error'))}}>Load ranking fixture</button><p role="status">{rank}</p></>}
 </main>;
}
document.documentElement.classList.add('dark');
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={qc}><SubscriptionUserContext.Provider value={user}><TooltipProvider><BrowserRouter><Screen/></BrowserRouter></TooltipProvider></SubscriptionUserContext.Provider></QueryClientProvider>);
