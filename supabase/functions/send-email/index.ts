import React from 'https://esm.sh/react@18.3.1'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'
import { WelcomeEmail } from './_templates/welcome-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  email: string
  type: 'welcome' | 'password_reset' | 'account_update'
  name?: string
  language?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // Parse request body
    const body: EmailRequest = await req.json()
    const { email, type, name, language = 'en' } = body

    if (!email || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For welcome emails, verify the user exists in our database (just signed up)
    if (type === 'welcome') {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      // Check if user exists in profiles (created on signup)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .single()
      
      if (profileError || !profile) {
        console.error('User not found in profiles:', email)
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log(`Processing ${type} email for ${email} in ${language}`)

    let html: string
    let subject: string
    const appUrl = Deno.env.get('APP_URL') || 'https://ai-royale.com'

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

      case 'password_reset':
        subject = getPasswordResetSubject(language)
        // For now, use a simple text email for password reset
        html = `<p>Password reset functionality coming soon.</p>`
        break

      case 'account_update':
        subject = getAccountUpdateSubject(language)
        html = `<p>Your account has been updated.</p>`
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid email type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'AI Royale <noreply@notification.ai-royale.com>',
      to: [email],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, messageId: data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({
        error: (error as Error).message || 'Failed to send email',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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
