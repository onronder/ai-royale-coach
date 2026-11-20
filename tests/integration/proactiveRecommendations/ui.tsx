// Local-only fixture. browser.mjs intercepts every non-local request.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SubscriptionUserContext } from '../../../src/hooks/useSubscription';
import { MatchDiscussionProvider } from '../../../src/contexts/MatchDiscussionContext';
import { FloatingCoachButton } from '../../../src/components/coach/FloatingCoachButton';
import { RecommendedDecksPanel } from '../../../src/components/deck/RecommendedDecksPanel';
import { useProactiveRecommendations } from '../../../src/hooks/useProactiveRecommendations';
import i18n from '../../../src/i18n';
import '../../../src/index.css';

const params = new URLSearchParams(location.search);
const user = '11111111-2222-4333-8444-555555555555';
const qc = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
const tier = params.get('tier') || 'paid';
qc.setQueryData(['subscription-status', user], {
  hasAccess: tier !== 'free', accountSlots: tier === 'free' ? 0 : 3,
  subscription: tier === 'free' ? null : { status: tier === 'trial' ? 'trialing' : 'active', accountSlots: 3 },
  trial: { isActive: tier === 'trial', hasUsedTrial: tier !== 'free' },
});

function Probe(props: Parameters<typeof useProactiveRecommendations>[0]) {
  const suggestion = useProactiveRecommendations(props);
  return <output data-testid="suggestion">{suggestion ? JSON.stringify(suggestion) : 'none'}</output>;
}

function Screen() {
  const [rate, setRate] = useState(Number(params.get('rate') ?? 72));
  const [matches, setMatches] = useState(Number(params.get('matches') ?? 25));
  const [trophies, setTrophies] = useState(Number(params.get('trophies') ?? 6500));
  const [ready, setReady] = useState(params.get('ready') !== 'false');
  const [tag, setTag] = useState('#UQRCGQJR2');
  const [panel, setPanel] = useState(params.get('panel') === 'true');
  const floating = params.get('floating') === 'true';
  return <main className="p-6 space-y-4">
    <label>Win rate<input aria-label="Win rate" type="number" value={rate} onChange={e => setRate(Number(e.target.value))}/></label>
    <label>Matches<input aria-label="Matches" type="number" value={matches} onChange={e => setMatches(Number(e.target.value))}/></label>
    <label>Trophies<input aria-label="Trophies" type="number" value={trophies} onChange={e => setTrophies(Number(e.target.value))}/></label>
    <button onClick={() => setReady(v => !v)}>Toggle data</button>
    <button onClick={() => setPanel(v => !v)}>Toggle normal panel</button>
    <button onClick={() => setTag('#UY02YVY9G')}>Switch player</button>
    <button onClick={() => void i18n.changeLanguage('tr')}>Turkish</button>
    <button onClick={() => void qc.invalidateQueries({ queryKey: ['deck-recommendations'] })}>Invalidate</button>
    {floating ? <FloatingCoachButton playerTag={tag}
      playerStats={ready ? { trophies, bestTrophies: trophies, arena: 'Fixture', winRate: rate } : undefined}
      recentMatches={{ wins: 0, losses: matches, avgTrophyChange: '0' }}/>
      : <Probe playerTag={tag} trophies={ready ? trophies : 0} recentWinRate={ready ? rate : 0} totalBattles={matches}/>}
    {panel && <RecommendedDecksPanel playerTag={tag} trophies={trophies}/>}
  </main>;
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}><SubscriptionUserContext.Provider value={user}>
    <BrowserRouter><MatchDiscussionProvider><Screen/></MatchDiscussionProvider></BrowserRouter>
  </SubscriptionUserContext.Provider></QueryClientProvider>,
);
