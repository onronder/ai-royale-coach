// Result-level logs cannot establish actions or event order. Reject obvious replay
// claims even when the model ignores the prompt; retain only bounded prose fields.
export function resultOnlyAdvice(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2000) return '';
  if (/\d\s*(?:s\b|sec|second|saniye|segundo|minute|minuto|dakika)|\b\d{1,2}:\d{2}\b|\b(?:early.game|mid.game|late.game|overtime|replay|placed|misplaced|deployed|you played|you used|you spent|you wasted|you lost because|yerleştirdin|oynadın|harcadın|kullandın|desplegaste|colocaste|jugaste|gastaste|vous avez placé|vous avez joué|tu as joué|tu as placé|você colocou|você jogou|você gastou)\b/iu.test(value)) return '';
  return value.trim();
}
