// Session-free unsubscribe for campaign emails. GET only shows a confirmation button (link scanners change nothing);
// POST — the button or a mail client's List-Unsubscribe one-click — withdraws consent. Repeating it is harmless.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'
import { verifyUnsubscribe } from '../_shared/unsubscribe-token.ts'

const copy: Record<string, { title: string; ask: string; button: string; done: string; bad: string }> = {
  en: { title: 'Campaign emails', ask: 'Stop receiving AI Royale discount and campaign emails?', button: 'Unsubscribe', done: 'You will no longer receive AI Royale campaign emails. Account and service emails continue.', bad: 'This link is not valid. You can change your choice in AI Royale → Email preferences.' },
  tr: { title: 'Kampanya e-postaları', ask: 'AI Royale indirim ve kampanya e-postalarını almayı bırakmak istiyor musun?', button: 'Abonelikten çık', done: 'Artık AI Royale kampanya e-postası almayacaksın. Hesap ve hizmet e-postaları devam eder.', bad: 'Bu bağlantı geçerli değil. Tercihini AI Royale → E-posta tercihleri bölümünden değiştirebilirsin.' },
  es: { title: 'Correos de campañas', ask: '¿Dejar de recibir correos de descuentos y campañas de AI Royale?', button: 'Darme de baja', done: 'Ya no recibirás correos de campañas de AI Royale. Los correos de cuenta y servicio continúan.', bad: 'Este enlace no es válido. Puedes cambiar tu elección en AI Royale → Preferencias de correo.' },
  fr: { title: 'E-mails de campagnes', ask: 'Ne plus recevoir les e-mails de réductions et campagnes AI Royale ?', button: 'Me désabonner', done: 'Vous ne recevrez plus d’e-mails de campagnes AI Royale. Les e-mails de compte et de service continuent.', bad: 'Ce lien n’est pas valide. Vous pouvez modifier votre choix dans AI Royale → Préférences e-mail.' },
  pt: { title: 'E-mails de campanhas', ask: 'Parar de receber e-mails de descontos e campanhas do AI Royale?', button: 'Cancelar inscrição', done: 'Você não receberá mais e-mails de campanhas do AI Royale. E-mails de conta e serviço continuam.', bad: 'Este link não é válido. Você pode mudar sua escolha em AI Royale → Preferências de e-mail.' },
}
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const page = (lang: string, title: string, inner: string, status = 200) => new Response(
  `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title></head>` +
  `<body style="font-family:system-ui,sans-serif;max-width:480px;margin:48px auto;padding:0 16px;line-height:1.5">${inner}</body></html>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const lang = copy[url.searchParams.get('l') ?? ''] ? url.searchParams.get('l')! : 'en'
  const t = copy[lang]
  const token = url.searchParams.get('t') ?? ''
  const v = await verifyUnsubscribe(Deno.env.get('MARKETING_UNSUBSCRIBE_SECRET') ?? '', token)
  if (!v) return page(lang, t.title, `<p>${esc(t.bad)}</p>`, 400)
  if (req.method === 'GET') {
    return page(lang, t.title, `<h1>${esc(t.title)}</h1><p>${esc(t.ask)}</p><form method="post"><button type="submit" style="padding:10px 18px">${esc(t.button)}</button></form>`)
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const { error } = await admin.rpc('unsubscribe_marketing', { p_user: v.userId })
  if (error) return page(lang, t.title, `<p>${esc(t.bad)}</p>`, 503)
  return page(lang, t.title, `<h1>${esc(t.title)}</h1><p>${esc(t.done)}</p>`)
})
