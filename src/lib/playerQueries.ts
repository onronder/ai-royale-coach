import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { canonicalTag } from '../../supabase/functions/_shared/battle-observation';
import type { CardCollectionRow } from '@/types/dashboard.types';
const settings = (account: string | null, tag: string | null, part: string, enabled: boolean) => ({
 queryKey: ['player-context', account, part === 'saved-decks' ? 'account' : canonicalTag(tag || '').slice(1), part],
 enabled: enabled && !!account && !!tag, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
});
export const collectionOptions = (account: string | null, tag: string | null, enabled = true) => queryOptions({
 ...settings(account,tag,'collection',enabled),
 queryFn: async () => {
  const normalized = canonicalTag(tag || '');
  const {data,error} = await supabase.from('card_collection').select('*').eq('user_id',account!)
   .in('player_tag',[normalized,normalized.slice(1)]).order('updated_at',{ascending:false});
  if(error) throw error;
  const unique = new Map<number, CardCollectionRow>();
  for (const row of data || []) if (!unique.has(row.card_id)) unique.set(row.card_id,row);
  return [...unique.values()].sort((a,b)=>a.rarity.localeCompare(b.rarity)||a.card_name.localeCompare(b.card_name));
 },
});
export const savedDeckOptions = (account: string | null, tag: string | null, enabled = true) => queryOptions({
 ...settings(account,tag,'saved-decks',enabled),
 queryFn: async () => {const {data,error}=await supabase.from('saved_decks').select('*').eq('user_id',account!);if(error)throw error;return data||[];},
});
export const masteryOptions = (account: string | null, tag: string | null, enabled = true) => queryOptions({
 ...settings(account,tag,'mastery',enabled),
 queryFn: async () => {const {data,error}=await supabase.from('card_mastery').select('*').eq('user_id',account!).eq('player_tag',canonicalTag(tag||''))
  .eq('observation_scope','recent-battles-v2').order('mastery_level',{ascending:false}).order('times_used',{ascending:false});if(error)throw error;return data||[];},
});
export const achievementOptions = (account: string | null, tag: string | null, enabled = true) => queryOptions({
 ...settings(account,tag,'achievements',enabled),
 queryFn: async () => {const normalized=canonicalTag(tag||'');const {data,error}=await supabase.from('user_achievements').select('*, achievement:achievements(*)')
  .eq('user_id',account!).in('player_tag',[normalized,normalized.slice(1)]).order('unlocked_at',{ascending:false,nullsFirst:false});if(error)throw error;return data||[];},
});
