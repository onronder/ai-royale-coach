import React from 'https://esm.sh/react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { renderAsync } from 'https://esm.sh/@react-email/components@0.0.22'
import { VerificationEmail } from './_templates/verification-email.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  // Verify webhook signature if secret is configured
  let emailData: {
    user: { email: string }
    email_data: {
      token: string
      token_hash: string
      redirect_to: string
      email_action_type: string
      site_url: string
      token_new?: string
      token_hash_new?: string
    }
  }

  try {
    if (hookSecret) {
      const wh = new Webhook(hookSecret)
      emailData = wh.verify(payload, headers) as typeof emailData
    } else {
      // For testing without webhook secret
      emailData = JSON.parse(payload)
    }
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return new Response(
      JSON.stringify({ error: { http_code: 401, message: 'Invalid webhook signature' } }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const {
    user,
    email_data: { token, token_hash, redirect_to, email_action_type, site_url },
  } = emailData

  console.log(`Processing ${email_action_type} email for ${user.email}`)

  try {
    // Determine email subject based on action type
    let subject: string
    switch (email_action_type) {
      case 'recovery':
        subject = 'Reset Your Password - AI Royale'
        break
      case 'magiclink':
        subject = 'Your Magic Link - AI Royale'
        break
      case 'invite':
        subject = 'You\'ve Been Invited - AI Royale'
        break
      case 'email_change':
        subject = 'Confirm Email Change - AI Royale'
        break
      default:
        subject = 'Verify Your Email - AI Royale'
    }

    // Render the email template
    const html = await renderAsync(
      React.createElement(VerificationEmail, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to: redirect_to || site_url || 'https://ai-royale.com',
        email_action_type,
        site_url: site_url || 'https://ai-royale.com',
      })
    )

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'AI Royale <noreply@notification.ai-royale.com>',
      to: [user.email],
      subject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully:', data)

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({
        error: {
          http_code: (error as any).statusCode || 500,
          message: (error as any).message || 'Failed to send email',
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
