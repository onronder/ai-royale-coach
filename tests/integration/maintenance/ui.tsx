import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useBackgroundSync } from '../../../src/hooks/useBackgroundSync';
import { useDashboardData } from '../../../src/hooks/useDashboardData';
import i18n, { i18nInit } from '../../../src/i18n';
const account = '11111111-2222-4333-8444-555555555555';
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
function Background({ tag }: { tag: string }) { useBackgroundSync(account, tag); return null; }
function Context({ tag }: { tag: string }) {
  const result = useDashboardData(tag);
  return <><output>{result.contextError ? 'context-error' : result.contextReady ? 'context-ready:' + result.playerContext.cardCollection.length : 'context-loading'}</output><button onClick={() => result.retryContext()}>Retry context</button></>;
}
function Screen() {
  const [tag, setTag] = useState('UQRCGQJR2');
  const [two, setTwo] = useState(false);
  return <><button onClick={() => setTag(t => t === 'UQRCGQJR2' ? 'UY02YVY9G' : 'UQRCGQJR2')}>Switch player</button>
    <button onClick={() => setTwo(true)}>Second observer</button>
    <button onClick={() => void i18n.changeLanguage('tr')}>Change language</button>
    <div data-testid="tag">{tag}</div>
    {location.search.includes('context') ? <Context tag={tag}/> : <><Background tag={tag}/>{two && <Background tag={tag}/>}</>}
    <Toaster/></>;
}
await i18nInit;
createRoot(document.getElementById('root')!).render(<MemoryRouter><QueryClientProvider client={client}><Screen/></QueryClientProvider></MemoryRouter>);
