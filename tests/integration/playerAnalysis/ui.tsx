// Local-only acceptance harness. The runner blocks every non-fixture request.
/* eslint-disable react-refresh/only-export-components -- Standalone test entry, not a reusable component module. */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider, focusManager, onlineManager } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { createQueryClientWithMetrics } from '../../../src/lib/queryClientWithMetrics';
import { SubscriptionUserContext } from '../../../src/hooks/useSubscription';
import { MatchDiscussionProvider } from '../../../src/contexts/MatchDiscussionContext';
import { TooltipProvider } from '../../../src/components/ui/tooltip';
import { usePlayerAnalysis } from '../../../src/hooks/usePlayerAnalysis';
import { dashboardDestination } from '../../../src/lib/deckNavigation';
import { ClashRoyalePlayer, ClashRoyaleBattle } from '../../../src/services/clashRoyaleApi';
import Dashboard from '../../../src/pages/Dashboard';
import i18n, { i18nInit } from '../../../src/i18n';
import '../../../src/index.css';

const params = new URLSearchParams(location.search);
const user = '11111111-2222-4333-8444-555555555555';
const qc = createQueryClientWithMetrics();
const tier = params.get('tier') || 'paid';
const cards = ['Knight', 'Archers', 'Goblins', 'Giant', 'Minions', 'Fireball', 'Arrows', 'Skeletons']
  .map((name, i) => ({ id: 26000000 + i, name, level: 10, maxLevel: 14, rarity: 'common', elixirCost: 3, iconUrls: { medium: '' } }));
const player = (tag: string, trophies = 6500) => ({
  tag, name: 'Fixture player', trophies, bestTrophies: 6600, expLevel: 40,
  wins: 72, losses: 28, battleCount: 100, threeCrownWins: 20, challengeCardsWon: 0,
  challengeMaxWins: 0, tournamentCardsWon: 0, tournamentBattleCount: 0,
  donations: 0, donationsReceived: 0, totalDonations: 0, warDayWins: 0,
  clanCardsCollected: 0, arena: { id: 1, name: 'Fixture Arena' }, cards, currentDeck: cards,
} as ClashRoyalePlayer);
const battles: ClashRoyaleBattle[] = [];
qc.setQueryData(['subscription-status', user], {
  hasAccess: ['trial', 'paid'].includes(tier), accountSlots: tier === 'paid' ? 3 : 1,
  subscription: tier === 'free' ? null : { status: tier === 'trial' ? 'trialing' : tier === 'expired' ? 'expired' : 'active', accountSlots: 3 },
  trial: { isActive: tier === 'trial', hasUsedTrial: tier !== 'free' },
});
for (const tag of ['UQRCGQJR2', 'UY02YVY9G']) {
  qc.setQueryData(['clash-player', tag], player('#' + tag));
  qc.setQueryData(['clash-battles', tag], battles);
}

function Probe({ ready, tag, trophies }: { ready: boolean; tag: string; trophies: number }) {
  const route = dashboardDestination(useLocation().search);
  const result = usePlayerAnalysis(ready ? player(tag, trophies) : undefined, ready ? battles : undefined,
    route.tab === 'coach' && route.subtab === 'overview');
  return <output data-testid="analysis-result">{result.isError ? 'error' : result.data ? JSON.stringify(result.data) : result.isFetching ? 'loading' : 'idle'}</output>;
}

function Screen() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(params.get('ready') !== 'false');
  const [tag, setTag] = useState('#UQRCGQJR2');
  const [trophies, setTrophies] = useState(6500);
  const [mounted, setMounted] = useState(true);
  const full = params.get('full') === 'true';
  return <>
    <nav className="bg-background p-2 flex flex-wrap gap-2" aria-label="Fixture controls">
      {['coach:overview', 'coach:matches', 'coach:analytics', 'coach:leaderboard', 'deck:current', 'deck:builder', 'deck:collection', 'social:clans', 'social:tournaments'].map(destination => {
        const [tab, subtab] = destination.split(':');
        return <button key={destination} onClick={() => navigate('/player/UQRCGQJR2?' + new URLSearchParams({ tab, subtab }))}>Fixture {destination}</button>;
      })}
      <button onClick={() => setReady(v => !v)}>Toggle data</button>
      <button onClick={() => setMounted(v => !v)}>Toggle mount</button>
      <button onClick={() => setTag(v => v === '#UQRCGQJR2' ? '#UY02YVY9G' : '#UQRCGQJR2')}>Switch player</button>
      <button onClick={() => setTrophies(v => v + 1)}>Change evidence</button>
      <button onClick={() => void i18n.changeLanguage(i18n.resolvedLanguage === 'tr' ? 'en' : 'tr')}>Switch language</button>
      <button onClick={() => void qc.invalidateQueries({ queryKey: ['player-analysis'] })}>Invalidate</button>
      <button onClick={() => { focusManager.setFocused(false); focusManager.setFocused(true); onlineManager.setOnline(false); onlineManager.setOnline(true); }}>Focus reconnect</button>
    </nav>
    {full ? <Routes><Route path="/player/:playerTag" element={<Dashboard/>}/></Routes> : mounted && <>
      <Probe ready={ready} tag={tag} trophies={trophies}/>
      {params.get('two') === 'true' && <Probe ready={ready} tag={tag} trophies={trophies}/>}
    </>}
  </>;
}

await i18nInit;
await i18n.changeLanguage(params.get('language') || 'en');
document.documentElement.classList.add('dark');
createRoot(document.getElementById('root')!).render(
  <HelmetProvider><QueryClientProvider client={qc}><SubscriptionUserContext.Provider value={user}>
    <MemoryRouter initialEntries={['/player/UQRCGQJR2?' + new URLSearchParams({ tab: params.get('tab') || 'coach', subtab: params.get('subtab') || 'overview' })]}>
      <TooltipProvider><MatchDiscussionProvider><Screen/></MatchDiscussionProvider></TooltipProvider>
    </MemoryRouter>
  </SubscriptionUserContext.Provider></QueryClientProvider></HelmetProvider>,
);
