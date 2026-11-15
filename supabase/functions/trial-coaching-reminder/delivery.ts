import { isTicket, runAttempt, type AttemptStore, type Mail, type Provider } from '../_shared/email-attempt.ts';
const copy = {
  en: ['Return to your coaching task', 'Your deck recommendation is waiting. Play one match with that deck, then check the result in AI Royale.', 'You requested one reminder during this trial.'],
  tr: ['Koçluk görevine geri dön', 'Deste önerin seni bekliyor. Bu desteyle bir maç oyna, ardından sonucu AI Royale’de kontrol et.', 'Deneme süresinde bir kez hatırlatılmasını istedin.'],
  fr: ['Reprends ta mission de coaching', 'Ta recommandation de deck t’attend. Joue un match avec ce deck, puis consulte le résultat dans AI Royale.', 'Tu as demandé un rappel unique pendant cet essai.'],
  es: ['Retoma tu tarea de entrenamiento', 'Tu recomendación de mazo te espera. Juega una partida con ese mazo y consulta el resultado en AI Royale.', 'Pediste un único recordatorio durante esta prueba.'],
  pt: ['Volte à sua tarefa de treino', 'Sua recomendação de deck está pronta. Jogue uma partida com esse deck e confira o resultado no AI Royale.', 'Você pediu um único lembrete durante este teste.'],
};
export function reminderMail(email: string, language: string | null, playerTag: string): Mail {
  const [subject, body, why] = copy[language?.toLowerCase().split('-')[0] as keyof typeof copy] ?? copy.en;
  return { from: 'AI Royale <noreply@notification.ai-royale.com>', to: [email], subject,
    text: [body, 'https://ai-royale.com/select-player?coaching=' + encodeURIComponent(playerTag), why].join('\n\n') };
}

export async function deliverReminder(req: Request, store: AttemptStore, provider: Provider, now?: () => number): Promise<Response> {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const input = await req.json().catch(() => null);
  if (!isTicket(input?.ticket)) return new Response(null, { status: 400 });
  const outcome = await runAttempt(input.ticket, 'trial-coaching', store, provider,
    async c => c.email && c.player_tag ? reminderMail(c.email, c.language, c.player_tag) : null, now);
  return new Response(null, { status: outcome === 'pending' ? 202 : 204 });
}
