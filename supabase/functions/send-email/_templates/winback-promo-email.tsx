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

interface WinbackPromoEmailProps {
  name?: string
  language?: string
  appUrl: string
  promoCode: string
  discountPercent: number
}

const translations = {
  en: {
    preview: (discount: number) => `We Miss You! Get ${discount}% Off AI Royale PRO`,
    title: 'We Miss You!',
    greeting: (name?: string) => name ? `Hey ${name},` : 'Hey Champion,',
    subtitle: (discount: number) => `Get ${discount}% Off Your First Month`,
    intro: "It's been a while since we've seen you in the arena. We hope you're still crushing it in Clash Royale! We'd love to have you back with a special offer just for you.",
    whatYouMiss: "What You're Missing:",
    feature1: '🤖 Personal AI Coach for strategy advice',
    feature2: '📊 Deep deck analysis and optimization',
    feature3: '🎯 Win rate predictions and matchup insights',
    feature4: '⚔️ Counter-deck building assistance',
    promoLabel: 'Your Exclusive Code:',
    promoExpiry: 'Limited time offer',
    cta: 'Claim Your Discount',
    footer: 'See you in the arena!',
    copyright: `© ${new Date().getFullYear()} AI Royale. All rights reserved.`,
    unsubscribe: 'You received this email because you signed up for AI Royale.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  es: {
    preview: (discount: number) => `¡Te Extrañamos! Obtén ${discount}% de Descuento en AI Royale PRO`,
    title: '¡Te Extrañamos!',
    greeting: (name?: string) => name ? `Hola ${name},` : 'Hola Campeón,',
    subtitle: (discount: number) => `Obtén ${discount}% de Descuento en Tu Primer Mes`,
    intro: 'Ha pasado un tiempo desde que te vimos en la arena. ¡Esperamos que sigas aplastando en Clash Royale! Nos encantaría tenerte de vuelta con una oferta especial solo para ti.',
    whatYouMiss: 'Lo Que Te Estás Perdiendo:',
    feature1: '🤖 Coach IA personal para consejos de estrategia',
    feature2: '📊 Análisis profundo y optimización de mazos',
    feature3: '🎯 Predicciones de tasa de victoria e insights de emparejamiento',
    feature4: '⚔️ Asistencia para construir mazos counter',
    promoLabel: 'Tu Código Exclusivo:',
    promoExpiry: 'Oferta por tiempo limitado',
    cta: 'Reclama Tu Descuento',
    footer: '¡Nos vemos en la arena!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Todos los derechos reservados.`,
    unsubscribe: 'Recibiste este email porque te registraste en AI Royale.',
    privacy: 'Política de Privacidad',
    terms: 'Términos de Servicio',
  },
  pt: {
    preview: (discount: number) => `Sentimos Sua Falta! Ganhe ${discount}% de Desconto no AI Royale PRO`,
    title: 'Sentimos Sua Falta!',
    greeting: (name?: string) => name ? `Olá ${name},` : 'Olá Campeão,',
    subtitle: (discount: number) => `Ganhe ${discount}% de Desconto no Primeiro Mês`,
    intro: 'Faz um tempo desde que te vimos na arena. Esperamos que você ainda esteja arrasando no Clash Royale! Adoraríamos ter você de volta com uma oferta especial só para você.',
    whatYouMiss: 'O Que Você Está Perdendo:',
    feature1: '🤖 Coach IA pessoal para conselhos de estratégia',
    feature2: '📊 Análise profunda e otimização de decks',
    feature3: '🎯 Previsões de taxa de vitória e insights de matchup',
    feature4: '⚔️ Assistência para construir counter-decks',
    promoLabel: 'Seu Código Exclusivo:',
    promoExpiry: 'Oferta por tempo limitado',
    cta: 'Resgatar Seu Desconto',
    footer: 'Nos vemos na arena!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Todos os direitos reservados.`,
    unsubscribe: 'Você recebeu este email porque se cadastrou no AI Royale.',
    privacy: 'Política de Privacidade',
    terms: 'Termos de Serviço',
  },
  tr: {
    preview: (discount: number) => `Seni Özledik! AI Royale PRO'da %${discount} İndirim`,
    title: 'Seni Özledik!',
    greeting: (name?: string) => name ? `Merhaba ${name},` : 'Merhaba Şampiyon,',
    subtitle: (discount: number) => `İlk Ayında %${discount} İndirim Kazan`,
    intro: 'Seni arenada görmeyeli uzun zaman oldu. Clash Royale\'de hâlâ harika olduğunu umuyoruz! Sadece sana özel bir teklifle seni geri görmek isteriz.',
    whatYouMiss: 'Kaçırdıklarınız:',
    feature1: '🤖 Strateji tavsiyeleri için kişisel AI Koç',
    feature2: '📊 Derin deste analizi ve optimizasyonu',
    feature3: '🎯 Kazanma oranı tahminleri ve eşleşme içgörüleri',
    feature4: '⚔️ Counter-deste oluşturma yardımı',
    promoLabel: 'Özel Kodunuz:',
    promoExpiry: 'Sınırlı süreli teklif',
    cta: 'İndirimini Al',
    footer: 'Arenada görüşürüz!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Tüm hakları saklıdır.`,
    unsubscribe: 'AI Royale\'e kaydolduğunuz için bu e-postayı aldınız.',
    privacy: 'Gizlilik Politikası',
    terms: 'Hizmet Şartları',
  },
  fr: {
    preview: (discount: number) => `Vous Nous Manquez! Obtenez ${discount}% de Réduction sur AI Royale PRO`,
    title: 'Vous Nous Manquez!',
    greeting: (name?: string) => name ? `Salut ${name},` : 'Salut Champion,',
    subtitle: (discount: number) => `Obtenez ${discount}% de Réduction sur Votre Premier Mois`,
    intro: "Cela fait un moment que nous ne vous avons pas vu dans l'arène. Nous espérons que vous êtes toujours au top sur Clash Royale! Nous serions ravis de vous revoir avec une offre spéciale rien que pour vous.",
    whatYouMiss: 'Ce Que Vous Manquez:',
    feature1: '🤖 Coach IA personnel pour les conseils stratégiques',
    feature2: '📊 Analyse approfondie et optimisation de decks',
    feature3: '🎯 Prédictions de taux de victoire et insights de matchup',
    feature4: '⚔️ Aide à la construction de counter-decks',
    promoLabel: 'Votre Code Exclusif:',
    promoExpiry: 'Offre à durée limitée',
    cta: 'Réclamez Votre Réduction',
    footer: "On se voit dans l'arène!",
    copyright: `© ${new Date().getFullYear()} AI Royale. Tous droits réservés.`,
    unsubscribe: 'Vous avez reçu cet email car vous vous êtes inscrit sur AI Royale.',
    privacy: 'Politique de Confidentialité',
    terms: "Conditions d'Utilisation",
  },
}

export const WinbackPromoEmail = ({
  name,
  language = 'en',
  appUrl,
  promoCode,
  discountPercent,
}: WinbackPromoEmailProps) => {
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <Html>
      <Head />
      <Preview>{t.preview(discountPercent)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Section style={logoContainer}>
              <Text style={logoText}>💝</Text>
            </Section>
            <Heading style={title}>{t.title}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>{t.greeting(name)}</Text>
            <Text style={subtitle}>{t.subtitle(discountPercent)}</Text>
            <Text style={intro}>{t.intro}</Text>

            <Text style={featuresTitle}>{t.whatYouMiss}</Text>

            <Section style={featuresSection}>
              <Section style={featureBox}>
                <Text style={featureText}>{t.feature1}</Text>
              </Section>
              <Section style={featureBox}>
                <Text style={featureText}>{t.feature2}</Text>
              </Section>
              <Section style={featureBox}>
                <Text style={featureText}>{t.feature3}</Text>
              </Section>
              <Section style={featureBox}>
                <Text style={featureText}>{t.feature4}</Text>
              </Section>
            </Section>

            <Section style={promoBox}>
              <Text style={promoLabel}>{t.promoLabel}</Text>
              <Text style={promoCodeStyle}>{promoCode}</Text>
              <Text style={promoExpiry}>{t.promoExpiry}</Text>
            </Section>

            <Section style={ctaSection}>
              <Link style={ctaButton} href={`${appUrl}/auth?promo=${promoCode}`}>
                {t.cta}
              </Link>
            </Section>

            <Text style={footerText}>{t.footer}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={copyright}>{t.copyright}</Text>
            <Text style={unsubscribeText}>{t.unsubscribe}</Text>
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

export default WinbackPromoEmail

// Styles - Arena Theme with special offer emphasis
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
  background: 'linear-gradient(135deg, #2a1a2a 0%, #1a121a 100%)',
  backgroundColor: '#2a1a2a',
  padding: '40px 20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
}

const logoContainer = {
  display: 'inline-block',
  padding: '16px',
  backgroundColor: 'rgba(212, 175, 55, 0.2)',
  borderRadius: '16px',
  border: '2px solid rgba(212, 175, 55, 0.6)',
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
  color: '#22c55e',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0 0 24px',
}

const intro = {
  color: '#a0a0c0',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const featuresTitle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const featuresSection = {
  marginBottom: '24px',
}

const featureBox = {
  backgroundColor: '#1a1a2e',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '8px',
}

const featureText = {
  color: '#a0a0c0',
  fontSize: '15px',
  margin: '0',
}

const promoBox = {
  background: 'linear-gradient(135deg, #1a2a1a 0%, #122a12 100%)',
  backgroundColor: '#1a2a1a',
  border: '3px dashed rgba(34, 197, 94, 0.6)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}

const promoLabel = {
  color: '#a0a0c0',
  fontSize: '14px',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const promoCodeStyle = {
  color: '#22c55e',
  fontSize: '32px',
  fontWeight: '800',
  margin: '0 0 8px',
  letterSpacing: '4px',
  fontFamily: 'monospace',
  textShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
}

const promoExpiry = {
  color: '#d4af37',
  fontSize: '12px',
  margin: '0',
  fontStyle: 'italic',
}

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const ctaButton = {
  backgroundColor: '#22c55e',
  color: '#ffffff',
  padding: '18px 56px',
  borderRadius: '12px',
  fontSize: '18px',
  fontWeight: '700',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
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

const unsubscribeText = {
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
