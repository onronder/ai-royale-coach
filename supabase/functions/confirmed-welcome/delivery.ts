export interface WelcomeMail { from: string; to: string[]; subject: string; html: string }
interface Signup { user_id: string; email: string; language: string; payload: WelcomeMail | null }
export type Rpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;

export async function deliverWelcome(req: Request, rpc: Rpc, render: (signup: Signup) => Promise<WelcomeMail>,
  send: (mail: WelcomeMail, key: string) => Promise<string>) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const input = await req.json().catch(() => null);
  if (typeof input?.ticket !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(input.ticket)) {
    return new Response(null, { status: 400 });
  }
  const [signup] = await rpc('claim_confirmed_welcome', { p_ticket: input.ticket }) as Signup[];
  if (signup) {
    const draft = signup.payload ?? await render(signup);
    const frozen = await rpc('begin_confirmed_welcome', { p_user: signup.user_id, p_payload: draft }) as WelcomeMail | null;
    if (frozen) {
      const id = await send(frozen, 'welcome/' + signup.user_id);
      if (!id || !await rpc('record_confirmed_welcome', { p_user: signup.user_id, p_message: id })) {
        throw new Error('Welcome acceptance could not be recorded');
      }
    }
  }
  return new Response(null, { status: 204 });
}
