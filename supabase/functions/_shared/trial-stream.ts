export function successfulChatStream(text: string): boolean {
  let content = false;
  let completed = false;
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') { completed = true; continue; }
    try {
      const item = JSON.parse(data);
      if (item.error) return false;
      for (const choice of item.choices || []) {
        if (choice.finish_reason === 'content_filter') return false;
        if (typeof choice.delta?.content === 'string' && choice.delta.content.trim()) content = true;
      }
    } catch { return false; }
  }
  return content && completed;
}