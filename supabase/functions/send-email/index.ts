import { productLanguage } from "../_shared/language.ts";
import * as React from 'https://esm.sh/react@18.3.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { WelcomeEmail, getWelcomeSubject } from './_templates/welcome-email.tsx'
import { SubscriptionEmail } from './_templates/subscription-email.tsx'
import { PasswordResetEmail } from './_templates/password-reset-email.tsx'
import { TrialExpiredEmail } from './_templates/trial-expired-email.tsx'
import { WinbackPromoEmail } from './_templates/winback-promo-email.tsx'
import { PaymentFailedEmail } from './_templates/payment-failed-email.tsx'
import { CancellationEmail } from './_templates/cancellation-email.tsx'
import { deliverPromo, sqlPromoStore, winbackCampaignKey, winbackRpc, type PromoMail } from '../_shared/marketing-gate.ts'
import { signUnsubscribe } from '../_shared/unsubscribe-token.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

interface EmailRequest {
  email?: string
  userId?: string
  campaignKey?: string
  type: 'welcome' | 'password_reset' | 'account_update' | 'subscription' | 'trial_expired' | 'winback_promo' | 'payment_failed' | 'subscription_cancelled'
  name?: string
  language?: string
  subscriptionData?: {
    accountSlots: number
    renewalDate?: string
  }
  resetUrl?: string
  promoCode?: string
  discountPercent?: number
  updatePaymentUrl?: string
  accessEndDate?: string
  wasTrial?: boolean
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req)
  if (corsResp) return corsResp

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Parse request body
    const body: EmailRequest = await req.json()
    // Promotions never trust the caller's address or role: admin check, consent gate and one message per campaign/recipient.
    if (body.type === 'winback_promo') return await sendPromo(req, body)
    const { email, type, name, language: requestedLanguage, subscriptionData, resetUrl, promoCode, discountPercent, updatePaymentUrl, accessEndDate, wasTrial } = body
    const language = productLanguage(requestedLanguage);

    if (!email || !type) {
      return errorResponse('Missing required fields: email and type', 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return errorResponse('Invalid email format', 400)
    }

    // For welcome emails, verify the user exists in our database
    if (type === 'welcome') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      // During the staged deployment the old site still sends this request.
      // Once the confirmed-account queue owns welcomes it is only an acknowledgement.
      const { data: cutover, error: cutoverError } = await supabaseAdmin
        .from('welcome_cutover').select('activated_at').eq('singleton', true).maybeSingle()
      if (cutoverError) throw cutoverError
      if (cutover) return jsonResponse({ success: true })

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single()
      
      if (profileError || !profile) {
        logger.error('User not found in profiles', { email })
        return errorResponse('User not found', 404)
      }
    }

    logger.info('Processing email', { type, email, language })

    let html: string
    let subject: string
    const appUrl = Deno.env.get('APP_URL') || 'https://vraqbzokccvqhthixoof.lovableproject.com'

    switch (type) {
      case 'welcome':
        subject = getWelcomeSubject(language)
        html = await renderAsync(
          React.createElement(WelcomeEmail, {
            name,
            language,
            appUrl,
          })
        )
        break

      case 'subscription':
        subject = getSubscriptionSubject(language)
        html = await renderAsync(
          React.createElement(SubscriptionEmail, {
            name,
            language,
            appUrl,
            accountSlots: subscriptionData?.accountSlots || 1,
            renewalDate: subscriptionData?.renewalDate,
          })
        )
        break

      case 'password_reset':
        if (!resetUrl) {
          return errorResponse('Missing required field: resetUrl for password_reset', 400)
        }
        subject = getPasswordResetSubject(language)
        html = await renderAsync(
          React.createElement(PasswordResetEmail, {
            language,
            appUrl,
            resetUrl,
          })
        )
        break

      case 'account_update':
        subject = getAccountUpdateSubject(language)
        html = `<html lang="${language}"><body><p>${{
          en: 'Your account has been updated.', tr: 'Hesabınız güncellendi.',
          es: 'Tu cuenta se ha actualizado.', fr: 'Votre compte a été mis à jour.',
          pt: 'Sua conta foi atualizada.',
        }[language]}</p></body></html>`
        break

      case 'trial_expired':
        subject = getTrialExpiredSubject(language)
        html = await renderAsync(
          React.createElement(TrialExpiredEmail, {
            name,
            language,
            appUrl,
          })
        )
        break

      case 'payment_failed':
        subject = getPaymentFailedSubject(language)
        html = await renderAsync(
          React.createElement(PaymentFailedEmail, {
            name,
            language,
            appUrl,
            updatePaymentUrl: updatePaymentUrl || 'https://polar.sh/purchases/subscriptions',
          })
        )
        break

      case 'subscription_cancelled':
        subject = getCancellationSubject(language)
        html = await renderAsync(
          React.createElement(CancellationEmail, {
            name,
            language,
            appUrl,
            accessEndDate,
            wasTrial: wasTrial || false,
          })
        )
        break

      default:
        return errorResponse('Invalid email type', 400)
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'AI Royale <noreply@notification.ai-royale.com>',
      to: [email],
      subject,
      html,
    })

    if (error) {
      logger.error('Resend error', { error })
      throw error
    }

    logger.info('Email sent successfully', { messageId: data?.id })

    return jsonResponse({ success: true, messageId: data?.id })
  } catch (error) {
    logger.error('Error sending email', { error: error instanceof Error ? error.message : 'Unknown' })
    return errorResponse((error as Error).message || 'Failed to send email', 500)
  }
})

async function sendPromo(req: Request, body: EmailRequest): Promise<Response> {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: caller } = token ? await admin.auth.getUser(token) : { data: { user: null } }
  const { data: isAdmin } = caller?.user ? await admin.rpc('has_admin_role', { p_user_id: caller.user.id, p_role: 'admin' }) : { data: false }
  const { userId, promoCode, discountPercent } = body
  if (!promoCode || !discountPercent || discountPercent < 1 || discountPercent > 100) return errorResponse('Missing promoCode/discountPercent', 400)
  const code = promoCode.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40)
  const campaignKey = winbackCampaignKey(code, body.campaignKey)
  const { data: profile } = userId ? await admin.from('profiles').select('preferred_language, email').eq('id', userId).maybeSingle() : { data: null }
  const language = productLanguage(profile?.preferred_language ?? undefined)
  const appUrl = Deno.env.get('APP_URL') || 'https://ai-royale.com'
  const secret = Deno.env.get('MARKETING_UNSUBSCRIBE_SECRET') ?? ''
  const rpc = winbackRpc(async (fn: string, args: Record<string, unknown>) => { const { data, error } = await admin.rpc(fn, args); if (error) throw error; return data })
  const resend = { async send(mail: PromoMail, key: string) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', body: JSON.stringify(mail), headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json', 'Idempotency-Key': key } })
    const data = await r.json().catch(() => null)
    if (!r.ok || !data?.id) throw new Error('provider error ' + r.status); return String(data.id)
  },
  // The provider's own record of the message: its created_at is the first acceptance, also for an idempotent replay.
  async acceptedAt(id: string) {
    const r = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}` } })
    const data = r.ok ? await r.json().catch(() => null) : null
    const t = data?.id === id && typeof data?.created_at === 'string' ? Date.parse(data.created_at) : NaN
    return Number.isNaN(t) ? null : new Date(t).toISOString()
  } }
  const result = await deliverPromo({ callerIsAdmin: Boolean(isAdmin), campaignKey, userId: userId ?? '' }, sqlPromoStore(rpc), resend, async () => {
    if (!secret) throw new Error('unsubscribe secret missing')
    const unsubscribeUrl = `${url}/functions/v1/marketing-unsubscribe?t=${encodeURIComponent(await signUnsubscribe(secret, userId!, campaignKey))}&l=${language}`
    return {
      from: 'AI Royale <noreply@notification.ai-royale.com>', to: [],
      subject: getWinbackPromoSubject(language, discountPercent),
      html: await renderAsync(React.createElement(WinbackPromoEmail, { language, appUrl, promoCode: code, discountPercent, unsubscribeUrl })),
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }
  }).catch(() => ({ status: 'blocked' as const, reason: 'gate_unavailable' }))
  if (result.status === 'sent' && !result.repeat) {
    // The cooldown time lives on the delivery row (provider acceptance); the legacy profile stamp is no longer written.
    await admin.from('winback_campaigns').insert({ admin_user_id: caller!.user!.id, target_user_id: userId, target_email: profile?.email ?? '', promo_code: code,
      discount_percent: discountPercent, polar_discount_id: (body as { polarDiscountId?: string }).polarDiscountId ?? null })
  }
  logger.info('Promotional send decision', { status: result.status, reason: 'reason' in result ? result.reason : undefined })
  return jsonResponse(result, result.status === 'blocked' && result.reason === 'not_authorized' ? 403 : 200)
}

// Subject line translations
function getSubscriptionSubject(language: string): string {
  const subjects: Record<string, string> = {
    en: 'Your AI Royale PRO is Active! 👑',
    es: '¡Tu AI Royale PRO está Activo! 👑',
    pt: 'Seu AI Royale PRO está Ativo! 👑',
    tr: 'AI Royale PRO Aktif! 👑',
    fr: 'Votre AI Royale PRO est Actif! 👑',
  }
  return subjects[language] || subjects.en
}

function getPasswordResetSubject(language: string): string {
  const subjects: Record<string, string> = {
    en: 'Reset Your Password - AI Royale',
    es: 'Restablecer Contraseña - AI Royale',
    pt: 'Redefinir Senha - AI Royale',
    tr: 'Şifrenizi Sıfırlayın - AI Royale',
    fr: 'Réinitialiser le Mot de Passe - AI Royale',
  }
  return subjects[language] || subjects.en
}

function getAccountUpdateSubject(language: string): string {
  const subjects: Record<string, string> = {
    en: 'Account Updated - AI Royale',
    es: 'Cuenta Actualizada - AI Royale',
    pt: 'Conta Atualizada - AI Royale',
    tr: 'Hesap Güncellendi - AI Royale',
    fr: 'Compte Mis à Jour - AI Royale',
  }
  return subjects[language] || subjects.en
}

function getTrialExpiredSubject(language: string): string {
  const subjects: Record<string, string> = {
    en: 'Your AI Royale trial has ended',
    es: 'Tu prueba de AI Royale ha terminado',
    pt: 'Seu teste do AI Royale terminou',
    tr: 'AI Royale deneme süren sona erdi',
    fr: 'Votre essai AI Royale est terminé',
  }
  return subjects[language] || subjects.en
}

function getWinbackPromoSubject(language: string, discountPercent: number): string {
  const subjects: Record<string, string> = {
    en: `We Miss You! Get ${discountPercent}% Off AI Royale PRO 💝`,
    es: `¡Te Extrañamos! Obtén ${discountPercent}% de Descuento en AI Royale PRO 💝`,
    pt: `Sentimos Sua Falta! Ganhe ${discountPercent}% de Desconto no AI Royale PRO 💝`,
    tr: `Seni Özledik! AI Royale PRO'da %${discountPercent} İndirim 💝`,
    fr: `Vous Nous Manquez! ${discountPercent}% de Réduction sur AI Royale PRO 💝`,
  }
  return subjects[language] || subjects.en
}

function getPaymentFailedSubject(language: string): string {
  const subjects: Record<string, string> = {
    en: '⚠️ Payment Failed - Action Required',
    es: '⚠️ Pago Fallido - Acción Requerida',
    pt: '⚠️ Pagamento Falhou - Ação Necessária',
    tr: '⚠️ Ödeme Başarısız - İşlem Gerekli',
    fr: '⚠️ Paiement Échoué - Action Requise',
  }
  return subjects[language] || subjects.en
}

function getCancellationSubject(language: string): string {
  const subjects: Record<string, string> = {
    en: 'Your AI Royale Subscription Has Been Cancelled',
    es: 'Tu Suscripción a AI Royale Ha Sido Cancelada',
    pt: 'Sua Assinatura do AI Royale Foi Cancelada',
    tr: 'AI Royale Aboneliğiniz İptal Edildi',
    fr: 'Votre Abonnement AI Royale a Été Annulé',
  }
  return subjects[language] || subjects.en
}
