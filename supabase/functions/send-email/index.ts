import React from 'https://esm.sh/react@18.3.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'
import { corsHeaders, handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { WelcomeEmail } from './_templates/welcome-email.tsx'
import { SubscriptionEmail } from './_templates/subscription-email.tsx'
import { PasswordResetEmail } from './_templates/password-reset-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

interface EmailRequest {
  email: string
  type: 'welcome' | 'password_reset' | 'account_update' | 'subscription'
  name?: string
  language?: string
  subscriptionData?: {
    accountSlots: number
    renewalDate?: string
  }
  resetUrl?: string
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
    const { email, type, name, language = 'en', subscriptionData, resetUrl } = body

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
        html = `<p>Your account has been updated.</p>`
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

// Subject line translations
function getWelcomeSubject(language: string): string {
  const subjects: Record<string, string> = {
    en: 'Welcome to AI Royale, Champion! 👑',
    es: '¡Bienvenido a AI Royale, Campeón! 👑',
    pt: 'Bem-vindo ao AI Royale, Campeão! 👑',
    tr: "AI Royale'e Hoş Geldiniz, Şampiyon! 👑",
    fr: 'Bienvenue sur AI Royale, Champion! 👑',
  }
  return subjects[language] || subjects.en
}

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
