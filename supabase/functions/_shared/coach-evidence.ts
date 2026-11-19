import { canonicalTag, observeBattles } from './battle-observation.ts';
import { cardDisplayLevel } from './card-display-level.ts';

export function chatMessages(value: unknown): Array<{role:'user'|'assistant';content:string}> | null {
  if (!Array.isArray(value) || !value.length || value.length > 60) return null;
  if (value.some(m => !m || !['user','assistant'].includes(m.role) || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 8000)) return null;
  if (value.reduce((n,m) => n + m.content.length, 0) > 40000 || value.at(-1).role !== 'user') return null;
  return value.map(({role,content}) => ({role,content}));
}

// Private coaching records are always scoped by authenticated user and linked tag.
export async function loadCoachEvidence(db: any, userId: string, playerTag: string) {
  const tag = canonicalTag(playerTag).slice(1);
  const owner = await db.from('player_profiles').select('id,ai_enabled').eq('user_id',userId).eq('player_tag',tag).maybeSingle();
  if (owner.error) throw owner.error;
  if (!owner.data) return null;
  const [cache, task] = await Promise.all([
    db.from('player_cache').select('player_data,battles_data,player_fetched_at,battles_fetched_at').eq('player_tag',tag).maybeSingle(),
    db.from('coaching_tasks').select('source_deck,recommended_deck,recommendation,shown_at,battle_result,follow_up_answer').eq('user_id',userId).eq('player_tag',tag).maybeSingle(),
  ]);
  if (cache.error || task.error) throw cache.error ?? task.error;
  const profile = cache.data?.player_data;
  const samePlayer = typeof profile?.tag === 'string' && canonicalTag(profile.tag) === canonicalTag(tag);
  const card = (c:any) => ({id:c.id,name:c.name,level:cardDisplayLevel(c),ownedEvolution:c.evolutionLevel ?? null,activeForm:'unknown'});
  const sample = observeBattles(cache.data?.battles_data,tag);
  return { owner:owner.data, evidence:{
    playerTag:canonicalTag(tag), profileObservedAt:cache.data?.player_fetched_at ?? null,
    battlesObservedAt:cache.data?.battles_fetched_at ?? null,
    profile:samePlayer ? {trophies:profile.trophies,arena:profile.arena?.name,currentDeck:profile.currentDeck?.map(card),collection:profile.cards?.map(card)} : null,
    scope:sample.scope, wins:sample.wins,losses:sample.losses,draws:sample.draws,n:sample.total,excluded:sample.excluded,
    battles:sample.battles.map(b=>({time:b.time,mode:b.mode,outcome:b.outcome,deck:b.player.cards.map(card),score:[b.player.crowns,b.opponents[0].crowns]})),
    task:task.data ?? null,
    limits:'Recent API observations only. No placement, timing, elixir flow, complete history or verified active forms. Unknown levels remain unknown. Task outcome is one observation, not causal proof.',
  }};
}
