import { useCardCollection } from '../../../src/hooks/useCardCollection';
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
  const [enabled,setEnabled]=useState(!location.search.includes('demand'));
  const [mirror,setMirror]=useState(false);
  const result = useDashboardData(tag,enabled);
  const shared = useCardCollection('#'+tag,account,enabled&&mirror);
  return <><button onClick={()=>setEnabled(true)}>Open context</button><button onClick={()=>setMirror(true)}>Open collection mirror</button>
    <button onClick={()=>void client.invalidateQueries({queryKey:['player-context',account]})}>Refresh shared context</button>
    <span data-testid="mirror">{mirror ? shared.data?.[0]?.card_name : ''}</span>
    <span data-testid="context-card">{result.playerContext.cardCollection[0]?.card_name}</span>
    <output>{result.contextError ? 'context-error' : result.contextReady ? 'context-ready:' + result.playerContext.cardCollection.length : 'context-loading'}</output><button onClick={() => result.retryContext()}>Retry context</button></>;
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
