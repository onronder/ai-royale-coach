import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
import * as React from 'https://esm.sh/react@18.3.1'

interface PasswordResetEmailProps {
  language?: string
  appUrl: string
  resetUrl: string
}

const translations = {
  en: {
    preview: 'Reset your AI Royale password',
    title: 'Reset Your Password',
    greeting: 'Hello Champion!',
    subtitle: 'Password Reset Request',
    intro: "We received a request to reset your password. Click the button below to create a new password.",
    cta: 'Reset Password',
    expiry: 'This link will expire in 1 hour for security reasons.',
    ignore: "If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.",
    footer: 'Stay secure, Champion!',
    copyright: '© 2024 AI Royale. All rights reserved.',
    unsubscribe: "You're receiving this because a password reset was requested for your AI Royale account.",
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  es: {
    preview: 'Restablecer contraseña de AI Royale',
    title: 'Restablecer Contraseña',
    greeting: '¡Hola Campeón!',
    subtitle: 'Solicitud de Restablecimiento',
    intro: 'Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para crear una nueva.',
    cta: 'Restablecer Contraseña',
    expiry: 'Este enlace expirará en 1 hora por razones de seguridad.',
    ignore: 'Si no solicitaste este restablecimiento, puedes ignorar este correo. Tu contraseña no cambiará.',
    footer: '¡Mantente seguro, Campeón!',
    copyright: '© 2024 AI Royale. Todos los derechos reservados.',
    unsubscribe: 'Recibes esto porque se solicitó un restablecimiento para tu cuenta de AI Royale.',
    privacy: 'Política de Privacidad',
    terms: 'Términos de Servicio',
  },
  pt: {
    preview: 'Redefinir senha do AI Royale',
    title: 'Redefinir Sua Senha',
    greeting: 'Olá Campeão!',
    subtitle: 'Solicitação de Redefinição',
    intro: 'Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova.',
    cta: 'Redefinir Senha',
    expiry: 'Este link expirará em 1 hora por motivos de segurança.',
    ignore: 'Se você não solicitou esta redefinição, pode ignorar este e-mail. Sua senha permanecerá inalterada.',
    footer: 'Fique seguro, Campeão!',
    copyright: '© 2024 AI Royale. Todos os direitos reservados.',
    unsubscribe: 'Você recebeu isso porque uma redefinição foi solicitada para sua conta AI Royale.',
    privacy: 'Política de Privacidade',
    terms: 'Termos de Serviço',
  },
  tr: {
    preview: 'AI Royale şifrenizi sıfırlayın',
    title: 'Şifrenizi Sıfırlayın',
    greeting: 'Merhaba Şampiyon!',
    subtitle: 'Şifre Sıfırlama İsteği',
    intro: 'Şifrenizi sıfırlamak için bir istek aldık. Yeni bir şifre oluşturmak için aşağıdaki butona tıklayın.',
    cta: 'Şifreyi Sıfırla',
    expiry: 'Bu bağlantı güvenlik nedeniyle 1 saat içinde sona erecektir.',
    ignore: 'Bu sıfırlamayı talep etmediyseniz, bu e-postayı görmezden gelebilirsiniz. Şifreniz değişmeyecektir.',
    footer: 'Güvende kalın, Şampiyon!',
    copyright: '© 2024 AI Royale. Tüm hakları saklıdır.',
    unsubscribe: "Bu e-postayı AI Royale hesabınız için şifre sıfırlama talep edildiği için alıyorsunuz.",
    privacy: 'Gizlilik Politikası',
    terms: 'Hizmet Şartları',
  },
  fr: {
    preview: 'Réinitialiser votre mot de passe AI Royale',
    title: 'Réinitialiser le Mot de Passe',
    greeting: 'Bonjour Champion!',
    subtitle: 'Demande de Réinitialisation',
    intro: 'Nous avons reçu une demande de réinitialisation de mot de passe. Cliquez sur le bouton pour en créer un nouveau.',
    cta: 'Réinitialiser',
    expiry: 'Ce lien expirera dans 1 heure pour des raisons de sécurité.',
    ignore: "Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail. Votre mot de passe restera inchangé.",
    footer: 'Restez en sécurité, Champion!',
    copyright: '© 2024 AI Royale. Tous droits réservés.',
    unsubscribe: 'Vous recevez ceci car une réinitialisation a été demandée pour votre compte AI Royale.',
    privacy: 'Politique de Confidentialité',
    terms: "Conditions d'Utilisation",
  },
}

export const PasswordResetEmail = ({
  language = 'en',
  appUrl,
  resetUrl,
}: PasswordResetEmailProps) => {
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Section style={logoContainer}>
              <Text style={logoText}>🔐</Text>
            </Section>
            <Heading style={title}>{t.title}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>{t.greeting}</Text>
            <Text style={subtitle}>{t.subtitle}</Text>
            <Text style={intro}>{t.intro}</Text>

            <Section style={ctaSection}>
              <Link style={ctaButton} href={resetUrl}>
                {t.cta}
              </Link>
            </Section>

            <Section style={warningSection}>
              <Text style={expiryText}>{t.expiry}</Text>
            </Section>

            <Section style={ignoreSection}>
              <Text style={ignoreText}>{t.ignore}</Text>
            </Section>

            <Text style={footerText}>{t.footer}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={copyright}>{t.copyright}</Text>
            <Text style={unsubscribe}>{t.unsubscribe}</Text>
            <Text style={footerLinks}>
              <Link href={`${appUrl}/privacy`} style={footerLink}>{t.privacy}</Link>
              {' - '}
              <Link href={`${appUrl}/terms`} style={footerLink}>{t.terms}</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default PasswordResetEmail

// Styles - Arena Vibrant Theme
const main = {
  backgroundColor: '#0a0a1a',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  padding: '20px 0',
}

const container = {
  backgroundColor: '#12122a',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '16px',
  border: '1px solid rgba(212, 175, 55, 0.3)',
  overflow: 'hidden',
}

const header = {
  background: 'linear-gradient(135deg, #1a1a3e 0%, #12122a 100%)',
  backgroundColor: '#1a1a3e',
  padding: '40px 20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
}

const logoContainer = {
  display: 'inline-block',
  padding: '16px',
  backgroundColor: 'rgba(212, 175, 55, 0.1)',
  borderRadius: '16px',
  border: '2px solid rgba(212, 175, 55, 0.5)',
  marginBottom: '16px',
}

const logoText = {
  fontSize: '48px',
  margin: '0',
  lineHeight: '1',
}

const title = {
  color: '#d4af37',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
  textShadow: '0 0 20px rgba(212, 175, 55, 0.5)',
}

const content = {
  padding: '32px 24px',
  backgroundColor: '#12122a',
}

const greeting = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const subtitle = {
  color: '#00d4ff',
  fontSize: '18px',
  fontWeight: '500',
  margin: '0 0 24px',
}

const intro = {
  color: '#a0a0c0',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 32px',
}

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const ctaButton = {
  backgroundColor: '#d4af37',
  color: '#0a0a1a',
  padding: '16px 48px',
  borderRadius: '12px',
  fontSize: '18px',
  fontWeight: '700',
  textDecoration: 'none',
  display: 'inline-block',
}

const warningSection = {
  backgroundColor: 'rgba(235, 40, 71, 0.1)',
  border: '1px solid rgba(235, 40, 71, 0.3)',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '24px',
}

const expiryText = {
  color: '#eb2847',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0',
  textAlign: 'center' as const,
}

const ignoreSection = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '24px',
}

const ignoreText = {
  color: '#808080',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '0',
}

const footerText = {
  color: '#a0a0c0',
  fontSize: '16px',
  textAlign: 'center' as const,
  margin: '0',
}

const hr = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '0',
}

const footer = {
  padding: '24px',
  textAlign: 'center' as const,
  backgroundColor: '#12122a',
}

const copyright = {
  color: '#606080',
  fontSize: '12px',
  margin: '0 0 8px',
}

const unsubscribe = {
  color: '#606080',
  fontSize: '12px',
  margin: '0 0 12px',
}

const footerLinks = {
  color: '#606080',
  fontSize: '12px',
  margin: '0',
}

const footerLink = {
  color: '#00d4ff',
  fontSize: '12px',
  textDecoration: 'none',
}