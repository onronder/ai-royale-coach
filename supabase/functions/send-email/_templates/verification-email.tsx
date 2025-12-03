import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface VerificationEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  site_url: string
}

export const VerificationEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  site_url,
}: VerificationEmailProps) => {
  const verificationUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
  
  const isPasswordReset = email_action_type === 'recovery'
  const isMagicLink = email_action_type === 'magiclink'
  
  const title = isPasswordReset 
    ? 'Reset Your Password' 
    : isMagicLink 
    ? 'Your Magic Link' 
    : 'Verify Your Email'
  
  const description = isPasswordReset
    ? 'Click the button below to reset your password and get back in the arena.'
    : isMagicLink
    ? 'Click the button below to sign in to your account.'
    : 'Welcome to AI Royale! Click the button below to verify your email and start dominating the arena.'

  const buttonText = isPasswordReset
    ? 'Reset Password'
    : isMagicLink
    ? 'Sign In'
    : 'Verify Email'

  return (
    <Html>
      <Head />
      <Preview>{title} - AI Royale</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={header}>
            <Heading style={logo}>
              <span style={logoIcon}>👑</span> AI Royale
            </Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h1}>{title}</Heading>
            
            <Text style={text}>{description}</Text>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={verificationUrl}>
                {buttonText}
              </Button>
            </Section>

            {/* Alternative Link */}
            <Text style={altText}>
              Or copy and paste this link into your browser:
            </Text>
            <Text style={linkText}>
              <Link href={verificationUrl} style={link}>
                {verificationUrl.length > 60 
                  ? verificationUrl.substring(0, 60) + '...' 
                  : verificationUrl}
              </Link>
            </Text>

            {/* Token for manual entry */}
            {token && (
              <>
                <Hr style={divider} />
                <Text style={altText}>
                  Or use this verification code:
                </Text>
                <Section style={codeContainer}>
                  <Text style={code}>{token}</Text>
                </Section>
              </>
            )}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              If you didn't request this email, you can safely ignore it.
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} AI Royale. All rights reserved.
            </Text>
            <Text style={footerLinks}>
              <Link href={`${site_url}/privacy`} style={footerLink}>Privacy Policy</Link>
              {' • '}
              <Link href={`${site_url}/terms`} style={footerLink}>Terms of Service</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default VerificationEmail

// Arena Vibrant Styles
const main = {
  backgroundColor: '#0a0a1a',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
}

const header = {
  textAlign: 'center' as const,
  padding: '20px 0',
}

const logo = {
  color: '#00d4ff',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
  textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
}

const logoIcon = {
  marginRight: '8px',
}

const content = {
  backgroundColor: '#12122a',
  borderRadius: '16px',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  padding: '40px 32px',
  boxShadow: '0 0 40px rgba(0, 212, 255, 0.1)',
}

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}

const text = {
  color: '#a0a0c0',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  margin: '0 0 30px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
}

const button = {
  backgroundColor: '#00d4ff',
  borderRadius: '8px',
  color: '#0a0a1a',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
}

const altText = {
  color: '#6b6b8a',
  fontSize: '13px',
  textAlign: 'center' as const,
  margin: '20px 0 8px',
}

const linkText = {
  textAlign: 'center' as const,
  margin: '0 0 20px',
}

const link = {
  color: '#00d4ff',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
}

const divider = {
  borderColor: 'rgba(255, 215, 0, 0.2)',
  margin: '30px 0',
}

const codeContainer = {
  backgroundColor: '#0a0a1a',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  border: '1px solid rgba(0, 212, 255, 0.3)',
}

const code = {
  color: '#ffd700',
  fontSize: '24px',
  fontWeight: '700',
  letterSpacing: '4px',
  margin: '0',
  fontFamily: 'monospace',
}

const footer = {
  padding: '30px 0 0',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#4a4a6a',
  fontSize: '12px',
  margin: '8px 0',
}

const footerLinks = {
  color: '#4a4a6a',
  fontSize: '12px',
  margin: '16px 0 0',
}

const footerLink = {
  color: '#6b6b8a',
  textDecoration: 'underline',
}
