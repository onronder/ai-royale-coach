import { successfulChatStream } from '../../supabase/functions/_shared/trial-stream';

// Use the same completion contract as server-side trial accounting. EOF alone
// is not success: the provider must finish a non-empty, error-free response.
export async function readCoachChatStream(body: ReadableStream<Uint8Array>, onContent: (content: string) => void): Promise<string> {
  const reader = body.getReader(), decoder = new TextDecoder();
  let buffer = '', wire = '', content = '', completed = false;
  const line = (value: string) => {
    if (!value.startsWith('data:')) return;
    const data = value.slice(5).trim();
    if (data === '[DONE]') { completed = true; return; }
    const item = JSON.parse(data);
    if (item.error || item.choices?.some((choice: { finish_reason?: string }) => choice.finish_reason === 'content_filter'))
      throw new Error('Coaching stream failed');
    const delta = item.choices?.[0]?.delta?.content;
    if (typeof delta === 'string') { content += delta; onContent(content); }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      const chunk = done ? decoder.decode() : decoder.decode(value, { stream: true });
      buffer += chunk; wire += chunk;
      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const value = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        line(value);
      }
      if (done) {
        if (buffer) line(buffer);
        if (completed && content.trim() && successfulChatStream(wire)) return content;
        throw new Error('Coaching stream ended without completion');
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
