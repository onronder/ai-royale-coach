import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCoachingDeck } from '../supabase/functions/_shared/coaching-source-deck';

// Slot order observed in the player's Trophy Road battle, 2026-11-14 16:53:03 UTC.
const ids = [26000000,26000018,26000103,26000063,26000055,26000035,26000024,26000023];
const names = ['Knight','Mini P.E.K.K.A','Boss Bandit','Electro Dragon','Mega Knight','Lumberjack','Royal Giant','Ice Wizard'];
const collection = ids.map((id,i) => ({id,name:names[i],level:i === 2 ? 5 : 10,maxLevel:i === 2 ? 6 : 16}));
const seven = collection.filter(card => card.name !== 'Boss Bandit');
const tag = '#UQRCGQJR2';
const profile = {tag,currentDeck:seven,cards:collection};
const battle = {battleTime:'20261114T165303.000Z',type:'PvP',deckSelection:'collection',gameMode:{name:'Ladder'},
  team:[{tag,cards:ids.map(id=>({id,level:1}))}],opponent:[{}]};
const never = async (): Promise<never> => { throw new Error('unexpected battle lookup'); };

describe('source deck for a coaching recommendation', () => {
  it('uses a complete profile without requesting battle history', async () => {
    assert.deepEqual(await resolveCoachingDeck({...profile,currentDeck:collection},tag,never),{kind:'ready',cards:collection});
  });
  it('requires confirmation of the eight-card match and uses the owned Boss Bandit level', async () => {
    assert.deepEqual(await resolveCoachingDeck(profile,tag,async()=>[battle]),{kind:'confirm',cards:collection});
    assert.deepEqual(await resolveCoachingDeck(profile,tag,async()=>[battle],ids),{kind:'ready',cards:collection});
  });
  it('revalidates on confirmation and re-prompts if the source has changed', async () => {
    const reordered = [...ids].reverse();
    assert.equal((await resolveCoachingDeck(profile,tag,async()=>[battle],reordered)).kind,'confirm');
    assert.equal((await resolveCoachingDeck({...profile,currentDeck:collection},tag,never,reordered)).kind,'confirm');
  });
  it('rejects a mismatched player, invalid cards, and absent collection without fetching history', async () => {
    for (const p of [{...profile,tag:'#OTHER'}, {...profile,cards:[]}, {...profile,currentDeck:seven.slice(1)},
      {...profile,currentDeck:[seven[0],...seven.slice(0,6)]}]) {
      assert.equal((await resolveCoachingDeck(p,tag,never)).kind,'unavailable');
    }
  });
  it('rejects unavailable fresh profile and battle data', async () => {
    assert.equal((await resolveCoachingDeck(null, tag, never)).kind, 'unavailable');
    assert.equal((await resolveCoachingDeck(profile, tag, async () => null)).kind, 'unavailable');
  });
  it('does not use other modes, sides, players, multiplayer games or malformed decks', async () => {
    const own=battle.team[0];
    for (const b of [{...battle,type:'royaleRoulette'}, {...battle,gameMode:{name:'Draft'}}, {...battle,deckSelection:'draft'},
      {...battle,team:[{...own,tag:'#OTHER'}]}, {...battle,team:[own,own]}, {...battle,opponent:[{},{}]},
      {...battle,team:[{...own,cards:seven}]}, {...battle,battleTime:'invalid'},
      {...battle,team:[{...own,cards:[own.cards[0],...own.cards.slice(0,7)]}]}]) {
      assert.equal((await resolveCoachingDeck(profile,tag,async()=>[b])).kind,'unavailable');
    }
    assert.equal((await resolveCoachingDeck(profile,tag,async()=>[])).kind,'unavailable');
    assert.equal((await resolveCoachingDeck({...profile,cards:seven},tag,async()=>[battle])).kind,'unavailable');
  });
  it('does not search older decks to force a match or silently reorder the seven profile cards', async () => {
    const changed={...battle,battleTime:'20261114T170000.000Z',team:[{tag,cards:[...battle.team[0].cards].reverse()}]};
    for (const list of [[battle,changed],[changed,battle]]) {
      assert.equal((await resolveCoachingDeck(profile,tag,async()=>list,ids)).kind,'unavailable');
    }
  });
});
