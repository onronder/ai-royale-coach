export const CHAT_PAGE_SIZE = 50;
export const CHAT_DAY_PAGE_SIZE = 30;
export function chatDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
// Build both local midnights independently: a DST day need not be 24 hours.
export function chatDayBounds(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Invalid chat day');
  const [year, month, date] = day.split('-').map(Number);
  const start = new Date(year, month - 1, date);
  if (chatDayKey(start) !== day) throw new Error('Invalid chat day');
  return { start: start.toISOString(), end: new Date(year, month - 1, date + 1).toISOString() };
}
export type ChatCursor = { created_at: string; id: string };
export function chatCursorFilter(cursor: ChatCursor) {
  if (!/^[0-9a-f-]{36}$/i.test(cursor.id) || !Number.isFinite(Date.parse(cursor.created_at))) throw new Error('Invalid chat cursor');
  const time = new Date(cursor.created_at).toISOString();
  return `created_at.lt.${time},and(created_at.eq.${time},id.lt.${cursor.id})`;
}
