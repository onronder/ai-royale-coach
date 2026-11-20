import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCardSync, type SyncResult } from './handler.ts';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
serve(request => handleCardSync(request, {
  authenticate: async req => {
    const token = req.headers.get('authorization')?.replace(/^Bearer /i, '');
    if (!token) return null;
    const { data, error } = await supabase.auth.getUser(token);
    return error ? null : data.user?.id ?? null;
  },
  rpc: async (name, args) => {
    const { data, error } = await supabase.rpc(name, args);
    if (error || !data) throw new Error('Sync state unavailable');
    return data as SyncResult;
  },
  player: async tag => {
    const key = Deno.env.get('CLASH_ROYALE_API_KEY');
    if (!key) throw new Error('Game service unavailable');
    const response = await fetch(`https://proxy.royaleapi.dev/v1/players/%23${tag}`, {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error('Game service unavailable');
    return response.json();
  },
}));
