import { isTicket, runAttempt, type AttemptStore, type Mail, type Provider } from '../_shared/email-attempt.ts';
import { coachingReading, readingText, type ReadingText, type SavedAdvice } from '../_shared/coaching-reading.ts';
import { localizedCardName } from '../_shared/card-names.ts';
import { productLanguage, type Language } from '../_shared/language.ts';

type Result = { outcome: 'win' | 'loss' | 'draw'; score: number[]; trophy_change: number | null } | null;
export interface SummaryTask extends SavedAdvice { id: string; battle_result: Result; previous_match: { battle_result: Result } | null }
export interface Summary { user_id: string; subscription_id: string; task_id: string; player_tag: string; language: string; email: string }

const copy: Record<Language, Record<string, string>> = {
  en: { subject: 'Your AI Royale coaching summary', intro: 'Here is what we suggested during your trial and what happened.', swap: 'Card change', coach: 'Coach answer', match: 'Matching match', previous: 'Earlier match', none: 'No matching match found.', win: 'Victory', loss: 'Defeat', draw: 'Draw', trophies: 'trophies', link: 'Open your Coach screen', why: 'You asked for one coaching summary before your trial ends.' },
  tr: { subject: 'AI Royale koçluk özetin', intro: 'Deneme süresinde önerdiğimiz değişiklik ve sonucu.', swap: 'Kart değişikliği', coach: 'Koç cevabı', match: 'Eşleşen maç', previous: 'Önceki maç', none: 'Eşleşen maç bulunamadı.', win: 'Zafer', loss: 'Mağlubiyet', draw: 'Beraberlik', trophies: 'kupa', link: 'Koç ekranını aç', why: 'Deneme bitmeden bir kez koçluk özeti istedin.' },
  es: { subject: 'Tu resumen de entrenamiento de AI Royale', intro: 'Esto es lo que te sugerimos durante la prueba y lo que pasó.', swap: 'Cambio de carta', coach: 'Respuesta del entrenador', match: 'Partida coincidente', previous: 'Partida anterior', none: 'No se encontró ninguna partida coincidente.', win: 'Victoria', loss: 'Derrota', draw: 'Empate', trophies: 'trofeos', link: 'Abre tu pantalla de Entrenador', why: 'Pediste un único resumen antes de que termine tu prueba.' },
  fr: { subject: 'Votre résumé de coaching AI Royale', intro: 'Voici ce que nous avons suggéré pendant votre essai et le résultat.', swap: 'Changement de carte', coach: 'Réponse du coach', match: 'Match correspondant', previous: 'Match précédent', none: 'Aucun match correspondant trouvé.', win: 'Victoire', loss: 'Défaite', draw: 'Égalité', trophies: 'trophées', link: 'Ouvrir votre écran Coach', why: 'Vous avez demandé un résumé unique avant la fin de votre essai.' },
  pt: { subject: 'Seu resumo de treino do AI Royale', intro: 'Veja o que sugerimos durante o teste e o que aconteceu.', swap: 'Troca de carta', coach: 'Resposta do treinador', match: 'Partida correspondente', previous: 'Partida anterior', none: 'Nenhuma partida correspondente encontrada.', win: 'Vitória', loss: 'Derrota', draw: 'Empate', trophies: 'troféus', link: 'Abra sua tela de Treinador', why: 'Você pediu um único resumo antes do fim do teste.' },
};

// Same identity first-session-coaching uses for its translation cache.
export async function translationHash(task: SummaryTask, language: string): Promise<string | null> {
  const reading = coachingReading(task, language);
  if (!reading || !Object.keys(reading.needed).length) return null;
  const glossary = [...new Set<string>([...task.source_deck, ...task.recommended_deck].map(c => c.name))].map(name => [
    localizedCardName(name, reading.adviceLanguage), localizedCardName(name, reading.followUpLanguage), localizedCardName(name, language)]);
  const input = JSON.stringify({ fields: reading.needed, glossary, adviceLanguage: reading.adviceLanguage, followUpLanguage: reading.followUpLanguage });
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)));
  return Array.from(hash, b => b.toString(16).padStart(2, '0')).join('');
}

export function summaryEmail(task: SummaryTask, playerTag: string, rawLanguage: string, translation?: Partial<ReadingText>) {
  const language = productLanguage(rawLanguage);
  const c = copy[language];
  const reading = coachingReading(task, language);
  if (!reading) return null;
  const text = readingText(reading, translation);
  const result = (r: Result) => r ? `${r.score.join(' – ')} · ${c[r.outcome]}${r.trophy_change !== null ? ` · ${r.trophy_change > 0 ? '+' : ''}${r.trophy_change} ${c.trophies}` : ''}` : c.none;
  const lines = [c.intro, `${c.swap}: ${reading.facts}`];
  // A paragraph is shown only when it exists in the reader's language; no new AI call.
  if (text.answer) lines.push(`${c.coach}: ${text.answer}`);
  lines.push(`${c.match}: ${result(task.battle_result)}`);
  if (task.previous_match?.battle_result) lines.push(`${c.previous}: ${result(task.previous_match.battle_result)}`);
  lines.push(`${c.link}: https://ai-royale.com/select-player?coaching=${encodeURIComponent(playerTag)}`, c.why);
  return { subject: c.subject, text: lines.join('\n\n') };
}

export interface SummaryReads {
  task(taskId: string, userId: string): Promise<SummaryTask | null>;
  translation(taskId: string, language: string, hash: string): Promise<Partial<ReadingText> | undefined>;
}

export async function deliverSummary(req: Request, store: AttemptStore, provider: Provider, reads: SummaryReads, now?: () => number): Promise<Response> {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const input = await req.json().catch(() => null);
  if (!isTicket(input?.ticket)) return new Response(null, { status: 400 });
  await runAttempt(input.ticket, 'trial-summary', store, provider, async (c): Promise<Mail | null> => {
    const task = c.due_task && c.email && c.player_tag ? await reads.task(c.due_task, c.user_id) : null;
    if (!task) return null;
    const language = productLanguage(c.language ?? 'en');
    const hash = await translationHash(task, language);
    const email = summaryEmail(task, c.player_tag!, language, hash ? await reads.translation(task.id, language, hash) : undefined);
    return email && { from: 'AI Royale <noreply@notification.ai-royale.com>', to: [c.email!], ...email };
  }, now);
  return new Response(null, { status: 204 });
}
