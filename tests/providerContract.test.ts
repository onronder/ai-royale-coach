import {test,expect} from 'bun:test';
import captured from './fixtures/provider/battles-2026-11-18.json';
import {observeBattle,observedDeck} from '../supabase/functions/_shared/battle-observation';
import {cardObservation} from '../supabase/functions/_shared/card-observation';
import {safeMatchAdvice,observedMatchResult} from '../supabase/functions/_shared/match-advice';

test('captured ladder identifies either side and preserves tower evidence',()=>{
 const a=observeBattle(captured.ladder,'#P0')!,b=observeBattle(captured.ladder,'q0')!;
 expect(a.format).toBe('1v1');expect(a.outcome).toBe('loss');expect(b.outcome).toBe('win');expect(a.key).toBe(b.key);
 expect(a.deck).not.toBe(observedDeck(a.player.cards));
});
test('captured 2v2 preserves all opponents and the second player',()=>{
 const a=observeBattle(captured.two_v_two,'#P1')!,b=observeBattle(captured.two_v_two,'#Q1')!;
 expect(a.format).toBe('2v2');expect(a.player.tag).toBe('#P1');expect(a.opponents).toHaveLength(2);expect(a.outcome).toBe('loss');expect(b.outcome).toBe('win');
});
test('captured duel/multideck series never count as single matches',()=>{
 expect(observeBattle(captured.duel,'#P0')).toBeNull();expect(observeBattle(captured.multi_deck,'#P0')).toBeNull();
 const changed=structuredClone(captured.ladder) as any;changed.team[0].rounds=[{crowns:0}];expect(observeBattle(changed,'#P0')).toBeNull();
});
test('collection evolution fields cannot establish active Hero/evolution slots',()=>{
 for(const card of captured.multi_deck.team[0].cards) expect(cardObservation(card).activeForm).toBe('unknown');
});
test('model output cannot author observed match facts or unknown counter cards',()=>{
 const own=captured.ladder.team[0].cards.map(c=>c.name),other=captured.ladder.opponent[0].cards.map(c=>c.name);
 const answer=safeMatchAdvice({analysis:'You lost because of a disconnect.',deckMatchup:'Try defending with Knight.',pivotalInteractions:[null,{yourCard:own[0],opponentCard:other[0],description:'You played Knight late.'}],counterDeck:{cards:own.slice(0,7).concat('Invented card')}},own,other,own);
 expect(answer).not.toHaveProperty('analysis');expect(answer.pivotalInteractions).toEqual([]);expect(answer.counterDeck).toBeNull();
 expect(()=>safeMatchAdvice(null,own,other,own)).toThrow();expect(()=>safeMatchAdvice([],own,other,own)).toThrow();
});
test('every counter explanation is bounded prospective advice',()=>{
 const cards=captured.ladder.team[0].cards.map(c=>c.name);
 const answer=safeMatchAdvice({counterDeck:{cards,explanations:{[cards[0]]:'You deployed Knight at 0:30.'},overallStrategy:'You wasted elixir.'}},cards,cards,cards);
 expect(answer.counterDeck?.cards).toEqual(cards);expect(answer.counterDeck?.explanations[cards[0]]).toBe('');expect(answer.counterDeck?.overallStrategy).toBe('');
});
test('observed draws have factual labels in all five languages',()=>{
 for(const [language,label] of Object.entries({en:'Draw',tr:'Beraberlik',es:'Empate',fr:'Égalité',pt:'Empate'})) expect(observedMatchResult(1,1,language)).toBe(`${label}: 1–1`);
});
