import React from 'https://esm.sh/react@18.3.1'
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
} from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'

interface PaymentFailedEmailProps {
  name?: string
  language?: string
  appUrl: string
  updatePaymentUrl?: string
}

const translations: Record<string, {
  preview: string
  greeting: string
  greetingNoName: string
  title: string
  subtitle: string
  body1: string
  body2: string
  whatYouLose: string
  feature1: string
  feature2: string
  feature3: string
  feature4: string
  cta: string
  needHelp: string
  helpLink: string
  footer: string
  privacy: string
  terms: string
}> = {
  en: {
    preview: 'Your payment failed - action required to keep your PRO access',
    greeting: 'Hey',
    greetingNoName: 'Hey Champion',
    title: 'Payment Failed',
    subtitle: 'We couldn\'t process your payment',
    body1: 'We tried to charge your payment method for your AI Royale PRO subscription, but the payment was declined.',
    body2: 'Your PRO access is at risk! Please update your payment method to continue enjoying all AI features without interruption.',
    whatYouLose: 'Features at risk:',
    feature1: '🤖 AI Coach unlimited access',
    feature2: '📊 Advanced deck analysis',
    feature3: '🎯 Match predictions & insights',
    feature4: '⚔️ Pro player strategies',
    cta: 'Update Payment Method',
    needHelp: 'Having trouble?',
    helpLink: 'Contact support',
    footer: '© 2025 AI Royale. All rights reserved.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  es: {
    preview: 'Tu pago falló - se requiere acción para mantener tu acceso PRO',
    greeting: 'Hola',
    greetingNoName: 'Hola Campeón',
    title: 'Pago Fallido',
    subtitle: 'No pudimos procesar tu pago',
    body1: 'Intentamos cobrar tu método de pago para tu suscripción AI Royale PRO, pero el pago fue rechazado.',
    body2: '¡Tu acceso PRO está en riesgo! Por favor actualiza tu método de pago para continuar disfrutando de todas las funciones de IA sin interrupción.',
    whatYouLose: 'Funciones en riesgo:',
    feature1: '🤖 Acceso ilimitado al Coach IA',
    feature2: '📊 Análisis avanzado de mazos',
    feature3: '🎯 Predicciones y análisis de partidas',
    feature4: '⚔️ Estrategias de jugadores pro',
    cta: 'Actualizar Método de Pago',
    needHelp: '¿Tienes problemas?',
    helpLink: 'Contactar soporte',
    footer: '© 2025 AI Royale. Todos los derechos reservados.',
    privacy: 'Política de Privacidad',
    terms: 'Términos de Servicio',
  },
  pt: {
    preview: 'Seu pagamento falhou - ação necessária para manter seu acesso PRO',
    greeting: 'Olá',
    greetingNoName: 'Olá Campeão',
    title: 'Pagamento Falhou',
    subtitle: 'Não conseguimos processar seu pagamento',
    body1: 'Tentamos cobrar seu método de pagamento para sua assinatura AI Royale PRO, mas o pagamento foi recusado.',
    body2: 'Seu acesso PRO está em risco! Por favor, atualize seu método de pagamento para continuar aproveitando todos os recursos de IA sem interrupção.',
    whatYouLose: 'Recursos em risco:',
    feature1: '🤖 Acesso ilimitado ao Coach IA',
    feature2: '📊 Análise avançada de decks',
    feature3: '🎯 Previsões e insights de partidas',
    feature4: '⚔️ Estratégias de jogadores pro',
    cta: 'Atualizar Método de Pagamento',
    needHelp: 'Precisa de ajuda?',
    helpLink: 'Contatar suporte',
    footer: '© 2025 AI Royale. Todos os direitos reservados.',
    privacy: 'Política de Privacidade',
    terms: 'Termos de Serviço',
  },
  tr: {
    preview: 'Ödemeniz başarısız oldu - PRO erişiminizi korumak için işlem gerekli',
    greeting: 'Merhaba',
    greetingNoName: 'Merhaba Şampiyon',
    title: 'Ödeme Başarısız',
    subtitle: 'Ödemenizi işleyemedik',
    body1: 'AI Royale PRO aboneliğiniz için ödeme yönteminizi ücretlendirmeye çalıştık, ancak ödeme reddedildi.',
    body2: 'PRO erişiminiz risk altında! Tüm AI özelliklerinden kesintisiz yararlanmaya devam etmek için lütfen ödeme yönteminizi güncelleyin.',
    whatYouLose: 'Risk altındaki özellikler:',
    feature1: '🤖 AI Koç sınırsız erişim',
    feature2: '📊 Gelişmiş deste analizi',
    feature3: '🎯 Maç tahminleri ve içgörüler',
    feature4: '⚔️ Pro oyuncu stratejileri',
    cta: 'Ödeme Yöntemini Güncelle',
    needHelp: 'Sorun mu yaşıyorsunuz?',
    helpLink: 'Destek ile iletişime geçin',
    footer: '© 2025 AI Royale. Tüm hakları saklıdır.',
    privacy: 'Gizlilik Politikası',
    terms: 'Hizmet Şartları',
  },
  fr: {
    preview: 'Votre paiement a échoué - action requise pour conserver votre accès PRO',
    greeting: 'Salut',
    greetingNoName: 'Salut Champion',
    title: 'Paiement Échoué',
    subtitle: 'Nous n\'avons pas pu traiter votre paiement',
    body1: 'Nous avons essayé de débiter votre méthode de paiement pour votre abonnement AI Royale PRO, mais le paiement a été refusé.',
    body2: 'Votre accès PRO est en danger ! Veuillez mettre à jour votre méthode de paiement pour continuer à profiter de toutes les fonctionnalités IA sans interruption.',
    whatYouLose: 'Fonctionnalités à risque :',
    feature1: '🤖 Accès illimité au Coach IA',
    feature2: '📊 Analyse de deck avancée',
    feature3: '🎯 Prédictions et analyses de matchs',
    feature4: '⚔️ Stratégies de joueurs pro',
    cta: 'Mettre à Jour le Paiement',
    needHelp: 'Vous avez des difficultés ?',
    helpLink: 'Contacter le support',
    footer: '© 2025 AI Royale. Tous droits réservés.',
    privacy: 'Politique de Confidentialité',
    terms: 'Conditions d\'Utilisation',
  },
}

export const PaymentFailedEmail = ({
  name,
  language = 'en',
  appUrl,
  updatePaymentUrl,
}: PaymentFailedEmailProps) => {
  const t = translations[language] || translations.en
  const greeting = name ? `${t.greeting} ${name},` : `${t.greetingNoName},`
  const paymentUrl = updatePaymentUrl || 'https://polar.sh/purchases/subscriptions'

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with warning icon */}
          <Section style={header}>
            <Text style={warningIcon}>⚠️</Text>
            <Heading style={title}>{t.title}</Heading>
            <Text style={subtitle}>{t.subtitle}</Text>
          </Section>

          {/* Main content */}
          <Section style={content}>
            <Text style={greetingStyle}>{greeting}</Text>
            <Text style={bodyText}>{t.body1}</Text>
            <Text style={bodyTextUrgent}>{t.body2}</Text>

            {/* Features at risk */}
            <Section style={featuresSection}>
              <Text style={featuresTitle}>{t.whatYouLose}</Text>
              <Text style={featureItem}>{t.feature1}</Text>
              <Text style={featureItem}>{t.feature2}</Text>
              <Text style={featureItem}>{t.feature3}</Text>
              <Text style={featureItem}>{t.feature4}</Text>
            </Section>

            {/* CTA Button */}
            <Section style={ctaSection}>
              <Link href={paymentUrl} style={ctaButton}>
                {t.cta}
              </Link>
            </Section>

            {/* Help link */}
            <Text style={helpText}>
              {t.needHelp}{' '}
              <Link href={`${appUrl}/help`} style={helpLink}>
                {t.helpLink}
              </Link>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>{t.footer}</Text>
            <Text style={footerLinks}>
              <Link href={`${appUrl}/privacy`} style={footerLink}>
                {t.privacy}
              </Link>
              {' | '}
              <Link href={`${appUrl}/terms`} style={footerLink}>
                {t.terms}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default PaymentFailedEmail

// Styles - Arena Vibrant Theme with Amber/Warning tones
const main = {
  backgroundColor: '#0f0f0f',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#1a1a0f',
  borderRadius: '16px 16px 0 0',
  padding: '40px 30px 30px',
  textAlign: 'center' as const,
  borderTop: '4px solid #fbbf24',
  border: '1px solid rgba(251, 191, 36, 0.3)',
  borderBottom: 'none',
}

const warningIcon = {
  fontSize: '48px',
  margin: '0 0 16px 0',
}

const title = {
  color: '#fbbf24',
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
}

const subtitle = {
  color: '#a1a1a1',
  fontSize: '16px',
  margin: '0',
}

const content = {
  backgroundColor: '#1a1a1a',
  padding: '30px',
  border: '1px solid rgba(251, 191, 36, 0.2)',
  borderTop: 'none',
}

const greetingStyle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 20px 0',
}

const bodyText = {
  color: '#d1d1d1',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
}

const bodyTextUrgent = {
  color: '#fbbf24',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 24px 0',
  fontWeight: '600',
}

const featuresSection = {
  backgroundColor: 'rgba(251, 191, 36, 0.1)',
  borderRadius: '12px',
  padding: '20px',
  margin: '0 0 24px 0',
  border: '1px solid rgba(251, 191, 36, 0.2)',
}

const featuresTitle = {
  color: '#fbbf24',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const featureItem = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '0 0 8px 0',
  lineHeight: '20px',
}

const ctaSection = {
  textAlign: 'center' as const,
  margin: '30px 0',
}

const ctaButton = {
  backgroundColor: '#fbbf24',
  borderRadius: '8px',
  color: '#000000',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: '700',
  padding: '14px 32px',
  textDecoration: 'none',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const helpText = {
  color: '#a1a1a1',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
}

const helpLink = {
  color: '#fbbf24',
  textDecoration: 'underline',
}

const footer = {
  backgroundColor: '#141414',
  borderRadius: '0 0 16px 16px',
  padding: '24px 30px',
  textAlign: 'center' as const,
  border: '1px solid rgba(251, 191, 36, 0.1)',
  borderTop: 'none',
}

const footerText = {
  color: '#666666',
  fontSize: '12px',
  margin: '0 0 8px 0',
}

const footerLinks = {
  margin: '0',
}

const footerLink = {
  color: '#888888',
  fontSize: '12px',
  textDecoration: 'none',
}
