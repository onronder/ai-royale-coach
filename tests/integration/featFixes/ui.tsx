// Real components/hooks and QueryClient; the runner blocks every real service.
import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { CoachChatPanel } from '../../../src/components/coach/CoachChatPanel';
import { SubscriptionUserContext } from '../../../src/hooks/useSubscription';
import { useBackgroundSync } from '../../../src/hooks/useBackgroundSync';
import { useDeckStats } from '../../../src/hooks/useDeckStats';
import { collectionOptions, masteryOptions } from '../../../src/lib/playerQueries';
import { supabase } from '../../../src/integrations/supabase/client';
import i18n, { i18nInit } from '../../../src/i18n';
import '../../../src/index.css';

const firstAccount = '11111111-2222-4333-8444-555555555555';
const secondAccount = '22222222-2222-4333-8444-555555555555';
const params = new URLSearchParams(location.search);
function Background({ account, tag }: { account: string | null; tag: string }) {
  useBackgroundSync(account, tag); return null;
}
function Data({ account, tag }: { account: string; tag: string }) {
  const mastery = useQuery(masteryOptions(account, tag));
  const collection = useQuery(collectionOptions(account, tag));
  const decks = useDeckStats(tag);
  return <div data-testid="data">
    <output data-testid="mastery">{mastery.data?.[0]?.card_name || 'empty'}</output>
    <output data-testid="collection">{collection.data?.[0]?.card_name || 'empty'}</output>
    <output data-testid="decks">{decks.data?.aggregated[0]?.battles_played ?? 0}</output>
  </div>;
}
function Screen() {
  const [account, setAccount] = useState<string | null>(firstAccount);
  const [tag, setTag] = useState('UQRCGQJR2');
  const [owner, setOwner] = useState(true), [joined, setJoined] = useState(false);
  const [open, setOpen] = useState(true);
  // Same account boundary as App.tsx; cache data cannot carry into another account.
  const client = useMemo(() => {
    const value = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } } });
    const plan = params.get('plan') || 'paid';
    value.setQueryData(['subscription-status', account], {
      hasAccess: ['paid', 'trial'].includes(plan), accountSlots: 1,
      subscription: plan === 'paid' ? { status: 'active', accountSlots: 1 } : null,
      trial: { isActive: plan === 'trial', hasUsedTrial: plan !== 'free', daysRemaining: 2 },
    });
    return value;
  }, [account]);
  const switchAccount = async (next: string | null) => {
    if (next) {
      const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const { error } = await supabase.auth.setSession({ access_token: encode({}) + '.' + encode({ sub: next, exp: Math.floor(Date.now()/1000)+3600 }) + '.fixture', refresh_token: 'fixture' });
      if (error) throw error;
    }
    else await supabase.auth.signOut({ scope: 'local' });
    setAccount(next);
  };
  return <MemoryRouter><QueryClientProvider client={client}><SubscriptionUserContext.Provider value={account}>
    <nav style={{ position: 'fixed', left: 0, top: 0, zIndex: 100, background: '#ddd', color: '#000' }}>
      <button data-testid="switch-player" onClick={() => setTag(t => t === 'UQRCGQJR2' ? 'UY02YVY9G' : 'UQRCGQJR2')}>Player</button>
      <button data-testid="language" onClick={() => void i18n.changeLanguage(i18n.language === 'tr' ? 'en' : 'tr')}>Language</button>
      <button data-testid="join" onClick={() => setJoined(true)}>Join</button>
      <button data-testid="unmount" onClick={() => setOwner(false)}>Unmount</button>
      <button data-testid="account" onClick={() => void switchAccount(secondAccount)}>Account</button>
      <button data-testid="logout" onClick={() => void switchAccount(null)}>Logout</button>
      <button data-testid="toggle" onClick={() => setOpen(o => !o)}>Panel</button>
    </nav>
    <div style={{ marginTop: 50 }} data-testid="scope">{account}:{tag}</div>
    {params.has('background') ? <>
      {owner && <Background account={account} tag={tag}/>}
      {joined && <Background account={account} tag={tag}/>}
      {account && <Data account={account} tag={tag}/>}
    </> : <CoachChatPanel key={tag + account} isOpen={open} onClose={() => setOpen(false)} playerTag={tag}/>}
    <Toaster/>
  </SubscriptionUserContext.Provider></QueryClientProvider></MemoryRouter>;
}
document.documentElement.classList.add('dark');
await i18nInit;
createRoot(document.getElementById('root')!).render(<Screen/>);
