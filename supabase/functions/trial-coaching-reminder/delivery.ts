const copy = {
  en: ['Return to your coaching task', 'Your deck recommendation is waiting. Play one match with that deck, then check the result in AI Royale.', 'You requested one reminder during this trial.'],
  tr: ['Koçluk görevine geri dön', 'Deste önerin seni bekliyor. Bu desteyle bir maç oyna, ardından sonucu AI Royale’de kontrol et.', 'Deneme süresinde bir kez hatırlatılmasını istedin.'],
  fr: ['Reprends ta mission de coaching', 'Ta recommandation de deck t’attend. Joue un match avec ce deck, puis consulte le résultat dans AI Royale.', 'Tu as demandé un rappel unique pendant cet essai.'],
  es: ['Retoma tu tarea de entrenamiento', 'Tu recomendación de mazo te espera. Juega una partida con ese mazo y consulta el resultado en AI Royale.', 'Pediste un único recordatorio durante esta prueba.'],
  pt: ['Volte à sua tarefa de treino', 'Sua recomendação de deck está pronta. Jogue uma partida com esse deck e confira o resultado no AI Royale.', 'Você pediu um único lembrete durante este teste.'],
};
export interface Reminder { user_id: string; subscription_id: string; email: string; language: string; player_tag: string }
interface Delivery {
  take(ticket: string): Promise<Reminder | null>;
  send(payload: { from: string; to: string[]; subject: string; text: string }, key: string): Promise<void>;
  markSent(reminder: Reminder): Promise<void>;
}

export async function deliverReminder(req: Request, delivery: Delivery): Promise<Response> {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const input = await req.json().catch(() => null);
  if (typeof input?.ticket !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.ticket)) {
    return new Response(null, { status: 400 });
  }
  const reminder = await delivery.take(input.ticket);
  if (reminder) {
    const [subject, body, why] = copy[reminder.language?.toLowerCase().split('-')[0] as keyof typeof copy] ?? copy.en;
    await delivery.send({
      from: 'AI Royale <noreply@notification.ai-royale.com>', to: [reminder.email], subject,
      text: [body, 'https://ai-royale.com/select-player?coaching=' + encodeURIComponent(reminder.player_tag), why].join('\n\n'),
    }, 'trial-coaching/' + reminder.subscription_id);
    await delivery.markSent(reminder);
  }
  return new Response(null, { status: 204 });
}
