// Local-only visual acceptance: actual Oracle component, synthetic data, no network services.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '../../../src/components/ui/tooltip';
import { OracleScanner } from '../../../src/components/oracle/OracleScanner';
import { supabase } from '../../../src/integrations/supabase/client';
import i18n from '../../../src/i18n';
import '../../../src/index.css';

globalThis.fetch = async () => { throw new Error('Network prohibited in matchup UI fixture'); };
const params = new URLSearchParams(location.search);
await i18n.changeLanguage(params.get('lang') || 'tr');
const scenario = params.get('case') || 'zero';
let calls = 0;
const prediction = { deckAWinRate: scenario === 'hundred' ? 100 : 0,
  deckBWinRate: scenario === 'hundred' ? 0 : 100, confidence: 'low',
  explanation: 'Fixture only.', keyMatchups: [], tips: { forDeckA: [], forDeckB: [] } };
(supabase.auth as any).getSession = async () => ({ data: { session: { user: { id: 'fixture' } } } });
Object.defineProperty(supabase, 'functions', { value: { invoke: async (name: string) => {
  if (name !== 'predict-deck-matchup') throw new Error('Unexpected fixture function');
  calls++; document.getElementById('calls')!.textContent = `Synthetic calls: ${calls}`;
  return scenario === 'save-error' ? { data: null, error: new Error('Fixture save failed') }
    : { data: scenario === 'invalid' ? {} : prediction, error: null };
} } });
const cards = Array.from({ length: 8 }, (_, i) => ({ id: 26000000+i, name: `Fixture ${i}`, level: 12,
  maxLevel: 16, elixirCost: 4, iconUrls: { medium: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50"/>' } }));
const client = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
client.setQueryData(['oracle-prediction','FIXTURE'], { likelyDeck: cards, confidence: 60,
  lastPlayedAt: '2026-11-20T06:00:00Z', playstyle: 'Heavy', deckHash: 'fixture', matchCount: 6, totalMatches: 10 });
document.documentElement.classList.add('dark');
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={client}><TooltipProvider>
  <p id="calls">Synthetic calls: 0</p>
  <OracleScanner initialOpponentTag="FIXTURE" userPlayerTag="#FIXTURE" userCurrentDeck={cards}/>
</TooltipProvider></QueryClientProvider>);
