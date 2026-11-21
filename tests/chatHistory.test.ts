import { test, expect } from 'bun:test';
import { chatDayBounds, chatDayKey, chatCursorFilter } from '../src/lib/chatHistory';
test('local calendar day includes DST boundaries, never a fixed 24 hours', () => {
 const previous = process.env.TZ;
 try {
  process.env.TZ = 'America/New_York';
  for (const [day, hours] of [['2026-03-08',23],['2026-11-01',25]] as const) {
   const bounds = chatDayBounds(day);
   expect((Date.parse(bounds.end)-Date.parse(bounds.start))/3600000).toBe(hours);
   expect(chatDayKey(new Date(bounds.start))).toBe(day);
  }
  process.env.TZ = 'Europe/Istanbul';
  expect(chatDayBounds('2026-11-20')).toEqual({start:'2026-11-19T21:00:00.000Z',end:'2026-11-20T21:00:00.000Z'});
 } finally { process.env.TZ = previous; }
});
test('invalid days and cursors cannot alter history filters', () => {
 expect(()=>chatDayBounds('2026-02-30')).toThrow();
 expect(()=>chatCursorFilter({id:'bad),id.gt.0',created_at:'now'})).toThrow();
 expect(chatCursorFilter({id:'11111111-2222-4333-8444-555555555555',created_at:'2026-11-20T12:00:00Z'})).toContain('id.lt.11111111-2222-4333-8444-555555555555');
});
test('history cursor preserves PostgreSQL microseconds and timezone exactly', () => {
 const id = '11111111-2222-4333-8444-555555555555';
 for (const time of ['2026-11-20T12:00:00.123456+00:00', '2026-11-20T15:00:00.000001+03:00', '2026-11-20T12:00:00.999999Z']) {
  expect(chatCursorFilter({id, created_at: time})).toBe(`created_at.lt.${time},and(created_at.eq.${time},id.lt.${id})`);
 }
 for (const time of ['2026-11-20', 'November 20, 2026', '2026-11-20T12:00:00Z),id.gt.0', '2026-11-20T12:00:00.123456Z\n']) {
  expect(() => chatCursorFilter({id, created_at: time})).toThrow();
 }
});
