import { expect, test } from 'bun:test';
import { readCoachChatStream } from '../src/lib/coachChatStream';
import { successfulChatStream } from '../supabase/functions/_shared/trial-stream';

const delta = 'data: {"choices":[{"delta":{"content":"Öneri ⚔"}}]}\r\n\r\n';
function body(text: string, split = false) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({ start(controller) {
    if (split) for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    else controller.enqueue(bytes);
    controller.close();
  } });
}
for (const [name, wire, success] of [
  ['complete', delta + 'data: [DONE]\n\n', true],
  ['split unicode, CRLF, no space, final line without newline', ':keepalive\n' + delta + 'data:[DONE]', true],
  ['EOF is not completion', delta, false],
  ['provider error before DONE', delta + 'data: {"error":{"message":"failed"}}\n\ndata: [DONE]\n', false],
  ['malformed complete frame', delta + 'data: {broken}\n\ndata: [DONE]\n', false],
  ['content filtered', delta + 'data: {"choices":[{"finish_reason":"content_filter"}]}\n\ndata: [DONE]\n', false],
  ['no content', 'data: [DONE]\n', false],
] as const) test(name, async () => {
  const updates: string[] = [];
  expect(successfulChatStream(wire)).toBe(success);
  const result = readCoachChatStream(body(wire, true), content => updates.push(content));
  if (success) { expect(await result).toBe('Öneri ⚔'); expect(updates.at(-1)).toBe('Öneri ⚔'); }
  else await expect(result).rejects.toThrow();
});
test('transport failure remains failure and releases its reader', async () => {
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error('connection lost')); } });
  await expect(readCoachChatStream(stream, () => {})).rejects.toThrow('connection lost');
  expect(stream.locked).toBe(false);
});
test('completion does not cancel the stream before server accounting can flush', async () => {
  let close!: () => void, cancelled = false, settled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(delta + 'data: [DONE]\n'));
      close = () => controller.close();
    },
    cancel() { cancelled = true; },
  });
  const result = readCoachChatStream(stream, () => {}).then(value => { settled = true; return value; });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(settled).toBe(false); expect(cancelled).toBe(false);
  close(); expect(await result).toBe('Öneri ⚔'); expect(cancelled).toBe(false);
});
