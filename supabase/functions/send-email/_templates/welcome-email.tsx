import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface WelcomeEmailProps {
  name?: string
  language?: string
  appUrl: string
}

const translations = {
  en: {
    preview: 'Welcome to AI Royale - Your AI Coach Awaits!',
    title: 'Welcome to AI Royale!',
    greeting: (name?: string) => name ? `Hey ${name}, Champion!` : 'Hey Champion!',
    subtitle: 'Your Personal AI Coach is Ready',
    intro: "You've just joined the arena! AI Royale is your ultimate companion for dominating Clash Royale with AI-powered insights.",
    feature1Title: '🤖 Personal AI Coach',
    feature1Desc: 'Get real-time strategy advice and deck analysis tailored to your playstyle.',
    feature2Title: '📊 Advanced Analytics',
    feature2Desc: 'Track your win rates, trophy progression, and performance trends.',
    feature3Title: '🃏 Card Mastery',
    feature3Desc: 'Master every card with personalized tips and optimal deck combinations.',
    feature4Title: '🏆 Smart Recommendations',
    feature4Desc: 'Receive deck suggestions based on your card collection and skill level.',
    cta: 'Enter the Arena',
    footer: "Let's climb the ladder together!",
    copyright: '© 2024 AI Royale. All rights reserved.',
    unsubscribe: "You're receiving this because you signed up for AI Royale.",
  },
  es: {
    preview: 'Bienvenido a AI Royale - ¡Tu Coach IA te espera!',
    title: '¡Bienvenido a AI Royale!',
    greeting: (name?: string) => name ? `¡Hola ${name}, Campeón!` : '¡Hola Campeón!',
    subtitle: 'Tu Coach IA Personal Está Listo',
    intro: '¡Acabas de unirte a la arena! AI Royale es tu compañero definitivo para dominar Clash Royale con insights potenciados por IA.',
    feature1Title: '🤖 Coach IA Personal',
    feature1Desc: 'Obtén consejos de estrategia en tiempo real y análisis de mazos adaptados a tu estilo.',
    feature2Title: '📊 Analíticas Avanzadas',
    feature2Desc: 'Rastrea tus tasas de victoria, progresión de trofeos y tendencias de rendimiento.',
    feature3Title: '🃏 Maestría de Cartas',
    feature3Desc: 'Domina cada carta con consejos personalizados y combinaciones óptimas.',
    feature4Title: '🏆 Recomendaciones Inteligentes',
    feature4Desc: 'Recibe sugerencias de mazos basadas en tu colección y nivel.',
    cta: 'Entrar a la Arena',
    footer: '¡Subamos juntos en la escalera!',
    copyright: '© 2024 AI Royale. Todos los derechos reservados.',
    unsubscribe: 'Recibes esto porque te registraste en AI Royale.',
  },
  pt: {
    preview: 'Bem-vindo ao AI Royale - Seu Coach IA está esperando!',
    title: 'Bem-vindo ao AI Royale!',
    greeting: (name?: string) => name ? `Olá ${name}, Campeão!` : 'Olá Campeão!',
    subtitle: 'Seu Coach IA Pessoal Está Pronto',
    intro: 'Você acabou de entrar na arena! AI Royale é seu companheiro definitivo para dominar Clash Royale com insights de IA.',
    feature1Title: '🤖 Coach IA Pessoal',
    feature1Desc: 'Receba conselhos estratégicos em tempo real e análises de decks personalizadas.',
    feature2Title: '📊 Análises Avançadas',
    feature2Desc: 'Acompanhe suas taxas de vitória, progressão de troféus e tendências.',
    feature3Title: '🃏 Maestria de Cartas',
    feature3Desc: 'Domine cada carta com dicas personalizadas e combinações ideais.',
    feature4Title: '🏆 Recomendações Inteligentes',
    feature4Desc: 'Receba sugestões de decks baseadas na sua coleção e nível.',
    cta: 'Entrar na Arena',
    footer: 'Vamos subir juntos na ladder!',
    copyright: '© 2024 AI Royale. Todos os direitos reservados.',
    unsubscribe: 'Você recebeu isso porque se cadastrou no AI Royale.',
  },
  tr: {
    preview: "AI Royale'e Hoş Geldiniz - AI Koçunuz Hazır!",
    title: "AI Royale'e Hoş Geldiniz!",
    greeting: (name?: string) => name ? `Merhaba ${name}, Şampiyon!` : 'Merhaba Şampiyon!',
    subtitle: 'Kişisel AI Koçunuz Hazır',
    intro: "Arenaya katıldınız! AI Royale, yapay zeka destekli içgörülerle Clash Royale'de hakimiyet kurmanız için nihai arkadaşınız.",
    feature1Title: '🤖 Kişisel AI Koç',
    feature1Desc: 'Oyun tarzınıza özel gerçek zamanlı strateji tavsiyeleri ve deste analizi alın.',
    feature2Title: '📊 Gelişmiş Analizler',
    feature2Desc: 'Kazanma oranlarınızı, kupa ilerlemelerinizi ve performans trendlerinizi takip edin.',
    feature3Title: '🃏 Kart Ustalığı',
    feature3Desc: 'Her kartı kişiselleştirilmiş ipuçları ve optimal deste kombinasyonlarıyla ustalıkla kullanın.',
    feature4Title: '🏆 Akıllı Öneriler',
    feature4Desc: 'Kart koleksiyonunuza ve seviyenize göre deste önerileri alın.',
    cta: 'Arenaya Gir',
    footer: 'Birlikte zirveye çıkalım!',
    copyright: '© 2024 AI Royale. Tüm hakları saklıdır.',
    unsubscribe: "Bu e-postayı AI Royale'e kaydolduğunuz için alıyorsunuz.",
  },
  fr: {
    preview: 'Bienvenue sur AI Royale - Votre Coach IA vous attend!',
    title: 'Bienvenue sur AI Royale!',
    greeting: (name?: string) => name ? `Salut ${name}, Champion!` : 'Salut Champion!',
    subtitle: 'Votre Coach IA Personnel est Prêt',
    intro: "Vous venez de rejoindre l'arène! AI Royale est votre compagnon ultime pour dominer Clash Royale avec des insights IA.",
    feature1Title: '🤖 Coach IA Personnel',
    feature1Desc: 'Obtenez des conseils stratégiques en temps réel et des analyses de decks personnalisées.',
    feature2Title: '📊 Analyses Avancées',
    feature2Desc: 'Suivez vos taux de victoire, progression de trophées et tendances de performance.',
    feature3Title: '🃏 Maîtrise des Cartes',
    feature3Desc: 'Maîtrisez chaque carte avec des conseils personnalisés et des combinaisons optimales.',
    feature4Title: '🏆 Recommandations Intelligentes',
    feature4Desc: 'Recevez des suggestions de decks basées sur votre collection et niveau.',
    cta: "Entrer dans l'Arène",
    footer: 'Grimpons ensemble dans le classement!',
    copyright: '© 2024 AI Royale. Tous droits réservés.',
    unsubscribe: 'Vous recevez ceci car vous vous êtes inscrit sur AI Royale.',
  },
}

export const WelcomeEmail = ({
  name,
  language = 'en',
  appUrl,
}: WelcomeEmailProps) => {
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={header}>
            <div style={logoContainer}>
              <Text style={logoText}>👑</Text>
            </div>
            <Heading style={title}>{t.title}</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>{t.greeting(name)}</Text>
            <Text style={subtitle}>{t.subtitle}</Text>
            <Text style={intro}>{t.intro}</Text>

            {/* Features Grid */}
            <Section style={featuresSection}>
              <div style={featureBox}>
                <Text style={featureTitle}>{t.feature1Title}</Text>
                <Text style={featureDesc}>{t.feature1Desc}</Text>
              </div>
              <div style={featureBox}>
                <Text style={featureTitle}>{t.feature2Title}</Text>
                <Text style={featureDesc}>{t.feature2Desc}</Text>
              </div>
              <div style={featureBox}>
                <Text style={featureTitle}>{t.feature3Title}</Text>
                <Text style={featureDesc}>{t.feature3Desc}</Text>
              </div>
              <div style={featureBox}>
                <Text style={featureTitle}>{t.feature4Title}</Text>
                <Text style={featureDesc}>{t.feature4Desc}</Text>
              </div>
            </Section>

            {/* CTA Button */}
            <Section style={ctaSection}>
              <Button style={ctaButton} href={`${appUrl}/select-player`}>
                {t.cta}
              </Button>
            </Section>

            <Text style={footerText}>{t.footer}</Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={copyright}>{t.copyright}</Text>
            <Text style={unsubscribe}>{t.unsubscribe}</Text>
            <Link href={`${appUrl}/privacy`} style={footerLink}>
              Privacy Policy
            </Link>
            {' • '}
            <Link href={`${appUrl}/terms`} style={footerLink}>
              Terms of Service
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default WelcomeEmail

// Styles - Arena Vibrant Theme
const main = {
  backgroundColor: '#0a0a1a',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
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

const featuresSection = {
  marginBottom: '32px',
}

const featureBox = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '12px',
}

const featureTitle = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const featureDesc = {
  color: '#a0a0c0',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
}

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const ctaButton = {
  background: 'linear-gradient(135deg, #d4af37 0%, #b8960c 100%)',
  color: '#0a0a1a',
  padding: '16px 48px',
  borderRadius: '12px',
  fontSize: '18px',
  fontWeight: '700',
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 24px rgba(212, 175, 55, 0.4)',
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

const footerLink = {
  color: '#00d4ff',
  fontSize: '12px',
  textDecoration: 'none',
}
