import { describe, expect, it } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';
import { marketingConsentKey } from '../src/lib/marketingConsent';

// Server stand-in: the invite is granted to the first claiming request only; reading never consumes it.
function fakeServer() {
  let claimed = false; const calls: boolean[] = []; let events = 0;
  return { calls, events: () => events, get: async (claim: boolean) => { calls.push(claim); const invite = claim && !claimed; if (claim) claimed = true; return { state: 'not_asked', invite, collectionOpen: true }; } };
}

describe('Preferences then Coach share no cached consent answer', () => {
  it('Coach sends its own claiming request after Preferences and shows the invite once', async () => {
    const server = fakeServer(); const client = new QueryClient();
    await client.fetchQuery({ queryKey: marketingConsentKey('u1', 'prefs'), queryFn: () => server.get(false) });
    const coach = await client.fetchQuery({ queryKey: marketingConsentKey('u1', 'coach'), queryFn: () => server.get(true), staleTime: 60_000 });
    expect(server.calls).toEqual([false, true]);
    expect(coach.invite).toBe(true);
    expect(server.events()).toBe(0);
    const again = await new QueryClient().fetchQuery({ queryKey: marketingConsentKey('u1', 'coach'), queryFn: () => server.get(true) });
    expect(again.invite).toBe(false);
  });
});
