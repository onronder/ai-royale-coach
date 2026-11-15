import { productLanguage } from '../../_shared/language.ts';
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
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
import * as React from 'https://esm.sh/react@18.3.1'

const copy = {
  "en": {
    "resetTitle": "Reset your password",
    "magicTitle": "Your sign-in link",
    "verifyTitle": "Verify your email address",
    "resetDescription": "Use the button below to choose a new password.",
    "magicDescription": "Use the button below to sign in to your account.",
    "verifyDescription": "Welcome to AI Royale! Confirm your email address to get started.",
    "resetAction": "Reset password",
    "magicAction": "Sign in",
    "verifyAction": "Verify email",
    "link": "Or copy this link into your browser.",
    "code": "Or use this verification code.",
    "ignore": "If you did not request this email, you can ignore it.",
    "rights": "All rights reserved.",
    "privacy": "Privacy policy",
    "terms": "Terms of service"
  },
  "tr": {
    "resetTitle": "Şifreni sıfırla",
    "magicTitle": "Giriş bağlantın",
    "verifyTitle": "E-posta adresini doğrula",
    "resetDescription": "Yeni bir şifre belirlemek için aşağıdaki düğmeyi kullan.",
    "magicDescription": "Hesabına giriş yapmak için aşağıdaki düğmeyi kullan.",
    "verifyDescription": "AI Royale’e hoş geldin! Başlamak için e-posta adresini doğrula.",
    "resetAction": "Şifremi sıfırla",
    "magicAction": "Giriş yap",
    "verifyAction": "E-postamı doğrula",
    "link": "Dilersen bağlantıyı tarayıcına yapıştırabilirsin.",
    "code": "Dilersen bu doğrulama kodunu kullanabilirsin.",
    "ignore": "Bu e-postayı sen istemediysen dikkate almayabilirsin.",
    "rights": "Tüm hakları saklıdır.",
    "privacy": "Gizlilik politikası",
    "terms": "Kullanım koşulları"
  },
  "es": {
    "resetTitle": "Restablece tu contraseña",
    "magicTitle": "Tu enlace de acceso",
    "verifyTitle": "Verifica tu correo electrónico",
    "resetDescription": "Usa el botón para elegir una contraseña nueva.",
    "magicDescription": "Usa el botón para acceder a tu cuenta.",
    "verifyDescription": "¡Te damos la bienvenida a AI Royale! Confirma tu dirección de correo para empezar.",
    "resetAction": "Restablecer contraseña",
    "magicAction": "Iniciar sesión",
    "verifyAction": "Verificar correo",
    "link": "También puedes copiar este enlace en tu navegador.",
    "code": "También puedes usar este código de verificación.",
    "ignore": "Si no solicitaste este correo, puedes ignorarlo.",
    "rights": "Todos los derechos reservados.",
    "privacy": "Política de privacidad",
    "terms": "Condiciones del servicio"
  },
  "fr": {
    "resetTitle": "Réinitialisez votre mot de passe",
    "magicTitle": "Votre lien de connexion",
    "verifyTitle": "Vérifiez votre adresse e-mail",
    "resetDescription": "Utilisez le bouton pour choisir un nouveau mot de passe.",
    "magicDescription": "Utilisez le bouton pour vous connecter à votre compte.",
    "verifyDescription": "Bienvenue sur AI Royale ! Confirmez votre adresse e-mail pour commencer.",
    "resetAction": "Réinitialiser le mot de passe",
    "magicAction": "Se connecter",
    "verifyAction": "Vérifier mon adresse",
    "link": "Vous pouvez aussi copier ce lien dans votre navigateur.",
    "code": "Vous pouvez également utiliser ce code de vérification.",
    "ignore": "Si vous n’avez pas demandé cet e-mail, vous pouvez l’ignorer.",
    "rights": "Tous droits réservés.",
    "privacy": "Politique de confidentialité",
    "terms": "Conditions d’utilisation"
  },
  "pt": {
    "resetTitle": "Redefina sua senha",
    "magicTitle": "Seu link de acesso",
    "verifyTitle": "Verifique seu e-mail",
    "resetDescription": "Use o botão abaixo para escolher uma nova senha.",
    "magicDescription": "Use o botão abaixo para entrar na sua conta.",
    "verifyDescription": "Boas-vindas ao AI Royale! Confirme seu e-mail para começar.",
    "resetAction": "Redefinir senha",
    "magicAction": "Entrar",
    "verifyAction": "Verificar e-mail",
    "link": "Você também pode colar este link no navegador.",
    "code": "Você também pode usar este código de verificação.",
    "ignore": "Se não solicitou este e-mail, você pode ignorá-lo.",
    "rights": "Todos os direitos reservados.",
    "privacy": "Política de privacidade",
    "terms": "Termos de uso"
  }
};

interface VerificationEmailProps {
  language?: string
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
  language: requestedLanguage,
}: VerificationEmailProps) => {
  const verificationUrl = `${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`
  
  const language = productLanguage(requestedLanguage);
  const textCopy = copy[language];
  const mode = email_action_type === 'recovery' ? 'reset' : email_action_type === 'magiclink' ? 'magic' : 'verify';
  const title = textCopy[`${mode}Title`];
  const description = textCopy[`${mode}Description`];
  const buttonText = textCopy[`${mode}Action`];

  return (
    <Html lang={language}>
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
              {textCopy.link}
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
                  {textCopy.code}
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
              {textCopy.ignore}
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} AI Royale. {textCopy.rights}
            </Text>
            <Text style={footerLinks}>
              <Link href={`${site_url}/privacy`} style={footerLink}>{textCopy.privacy}</Link>
              {' • '}
              <Link href={`${site_url}/terms`} style={footerLink}>{textCopy.terms}</Link>
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
