import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { savedDeckOptions } from '../../../src/lib/playerQueries';
import { DeckBuilder } from '../../../src/components/deck/DeckBuilder';
import { DeckTab } from '../../../src/components/dashboard/DeckTab';
import { SubscriptionUserContext } from '../../../src/hooks/useSubscription';
import { TooltipProvider } from '../../../src/components/ui/tooltip';
import i18n from '../../../src/i18n';
import '../../../src/index.css';
import type { ClashRoyalePlayer } from '../../../src/services/clashRoyaleApi';

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const tier = new URLSearchParams(location.search).get('tier') ?? 'paid';
const allowed = ['paid', 'trial', 'stale-trial', 'ending-trial', 'admin-only'].includes(tier);
const ids = ['fixture-first', 'fixture-second'];
for (const id of ids) qc.setQueryData(['subscription-status', id], {
  hasAccess: allowed, trial: { isActive: ['trial', 'stale-trial', 'ending-trial'].includes(tier),
    endsAt: new Date(Date.now() + (tier === 'stale-trial' ? -86400000 : tier === 'ending-trial' ? 60000 : 86400000)).toISOString() }, subscription: { status: tier === 'paid' ? 'active' : tier },
});
const names = ['Baby Dragon', 'Knight', 'Fireball', 'Archers', 'Golem', 'Witch', 'Wizard', 'Zap',
  'Guards', 'Prince', 'Hunter', 'Tesla', 'Rage', 'Freeze', 'Mirror'];
function Screen() {
  const builder = new URLSearchParams(useLocation().search).get('subtab') === 'builder';
  const [tag, setTag] = useState('#QQQ');
  const [account, setAccount] = useState(ids[0]);
  const [show, setShow] = useState(true);
  const cards = names.map((name, i) => ({ id: i+1, name, level: 7, maxLevel: 11, rarity: 'epic',
    iconUrls: { medium: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="40"/%3E' } }));
  const saved = useQuery(savedDeckOptions(account, tag, builder));
  const currentDeck = cards.slice(0, 8);
  const player = { tag, name: 'Fixture', currentDeck, cards, trophies: 5000 } as ClashRoyalePlayer;
  return <SubscriptionUserContext.Provider value={account}><TooltipProvider>
    <nav aria-label="Fixture controls">
      <button onClick={() => setTag(tag === '#QQQ' ? '#PPP' : '#QQQ')}>Switch player</button>
      <button onClick={() => setAccount(account === ids[0] ? ids[1] : ids[0])}>Switch account</button>
      <button onClick={() => setShow(!show)}>Switch tab</button>
      <button onClick={() => void i18n.changeLanguage('tr')}>Switch language</button>
      <button onClick={() => void qc.invalidateQueries({ queryKey: ['player-context', account, 'account', 'saved-decks'] })}>Saved deck event</button>
      <button onClick={() => void qc.invalidateQueries({ queryKey: ['operation-progress', account] })}>Operation event</button>
    </nav>
    <main className="mx-auto max-w-5xl p-4">
      {show && (builder
        ? <DeckBuilder key={account + tag} userId={account} playerTag={tag} availableCards={cards} currentDeck={currentDeck} savedDecks={saved.data} />
        : <DeckTab player={player} battles={null} playerLoading={false} playerError={null} playerTag={tag} />)}
    </main>
  </TooltipProvider></SubscriptionUserContext.Provider>;
}
document.documentElement.classList.add('dark');
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={qc}><BrowserRouter><Screen /></BrowserRouter></QueryClientProvider>);
