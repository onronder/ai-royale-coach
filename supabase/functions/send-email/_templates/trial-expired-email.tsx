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

interface TrialExpiredEmailProps {
  name?: string
  language?: string
  appUrl: string
}

const translations = {
  en: {
    preview: 'Your AI Royale Trial Has Ended',
    title: 'Trial Expired',
    greeting: (name?: string) => name ? `Hey ${name},` : 'Hey Champion,',
    subtitle: 'Your 3-Day Free Trial Has Ended',
    intro: 'We hope you enjoyed your free trial of AI Royale PRO! Your trial period has now ended, but you can continue dominating the arena by subscribing.',
    whatYouMiss: "What You're Missing:",
    feature1: '🤖 Personal AI Coach for strategy advice',
    feature2: '📊 Deep deck analysis and optimization',
    feature3: '🎯 Win rate predictions and matchup insights',
    feature4: '⚔️ Counter-deck building assistance',
    specialOffer: 'Subscribe Now',
    specialOfferDesc: 'Get full access to all AI features and continue improving your game.',
    cta: 'Subscribe to PRO',
    footer: 'We would love to have you back!',
    copyright: `© ${new Date().getFullYear()} AI Royale. All rights reserved.`,
    unsubscribe: 'You received this email because you signed up for AI Royale.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  es: {
    preview: 'Tu Prueba de AI Royale Ha Terminado',
    title: 'Prueba Expirada',
    greeting: (name?: string) => name ? `Hola ${name},` : 'Hola Campeón,',
    subtitle: 'Tu Prueba Gratis de 3 Días Ha Terminado',
    intro: '¡Esperamos que hayas disfrutado tu prueba gratuita de AI Royale PRO! Tu período de prueba ha terminado, pero puedes seguir dominando la arena suscribiéndote.',
    whatYouMiss: 'Lo Que Te Estás Perdiendo:',
    feature1: '🤖 Coach IA personal para consejos de estrategia',
    feature2: '📊 Análisis profundo y optimización de mazos',
    feature3: '🎯 Predicciones de tasa de victoria e insights de emparejamiento',
    feature4: '⚔️ Asistencia para construir mazos counter',
    specialOffer: 'Suscríbete Ahora',
    specialOfferDesc: 'Obtén acceso completo a todas las funciones de IA y sigue mejorando tu juego.',
    cta: 'Suscribirse a PRO',
    footer: '¡Nos encantaría tenerte de vuelta!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Todos los derechos reservados.`,
    unsubscribe: 'Recibiste este email porque te registraste en AI Royale.',
    privacy: 'Política de Privacidad',
    terms: 'Términos de Servicio',
  },
  pt: {
    preview: 'Seu Teste do AI Royale Terminou',
    title: 'Teste Expirado',
    greeting: (name?: string) => name ? `Olá ${name},` : 'Olá Campeão,',
    subtitle: 'Seu Teste Grátis de 3 Dias Terminou',
    intro: 'Esperamos que você tenha aproveitado seu teste gratuito do AI Royale PRO! Seu período de teste terminou, mas você pode continuar dominando a arena assinando.',
    whatYouMiss: 'O Que Você Está Perdendo:',
    feature1: '🤖 Coach IA pessoal para conselhos de estratégia',
    feature2: '📊 Análise profunda e otimização de decks',
    feature3: '🎯 Previsões de taxa de vitória e insights de matchup',
    feature4: '⚔️ Assistência para construir counter-decks',
    specialOffer: 'Assine Agora',
    specialOfferDesc: 'Obtenha acesso total a todos os recursos de IA e continue melhorando seu jogo.',
    cta: 'Assinar PRO',
    footer: 'Adoraríamos ter você de volta!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Todos os direitos reservados.`,
    unsubscribe: 'Você recebeu este email porque se cadastrou no AI Royale.',
    privacy: 'Política de Privacidade',
    terms: 'Termos de Serviço',
  },
  tr: {
    preview: 'AI Royale Denemeniz Sona Erdi',
    title: 'Deneme Süresi Doldu',
    greeting: (name?: string) => name ? `Merhaba ${name},` : 'Merhaba Şampiyon,',
    subtitle: '3 Günlük Ücretsiz Denemeniz Sona Erdi',
    intro: 'AI Royale PRO ücretsiz denemenizden keyif aldığınızı umuyoruz! Deneme süreniz sona erdi, ancak abone olarak arenada hakimiyetinizi sürdürebilirsiniz.',
    whatYouMiss: 'Kaçırdıklarınız:',
    feature1: '🤖 Strateji tavsiyeleri için kişisel AI Koç',
    feature2: '📊 Derin deste analizi ve optimizasyonu',
    feature3: '🎯 Kazanma oranı tahminleri ve eşleşme içgörüleri',
    feature4: '⚔️ Counter-deste oluşturma yardımı',
    specialOffer: 'Şimdi Abone Ol',
    specialOfferDesc: 'Tüm AI özelliklerine tam erişim sağlayın ve oyununuzu geliştirmeye devam edin.',
    cta: 'PRO\'ya Abone Ol',
    footer: 'Sizi geri görmek isteriz!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Tüm hakları saklıdır.`,
    unsubscribe: 'AI Royale\'e kaydolduğunuz için bu e-postayı aldınız.',
    privacy: 'Gizlilik Politikası',
    terms: 'Hizmet Şartları',
  },
  fr: {
    preview: 'Votre Essai AI Royale a Expiré',
    title: 'Essai Expiré',
    greeting: (name?: string) => name ? `Salut ${name},` : 'Salut Champion,',
    subtitle: 'Votre Essai Gratuit de 3 Jours est Terminé',
    intro: 'Nous espérons que vous avez apprécié votre essai gratuit d\'AI Royale PRO! Votre période d\'essai est maintenant terminée, mais vous pouvez continuer à dominer l\'arène en vous abonnant.',
    whatYouMiss: 'Ce Que Vous Manquez:',
    feature1: '🤖 Coach IA personnel pour les conseils stratégiques',
    feature2: '📊 Analyse approfondie et optimisation de decks',
    feature3: '🎯 Prédictions de taux de victoire et insights de matchup',
    feature4: '⚔️ Aide à la construction de counter-decks',
    specialOffer: 'Abonnez-vous Maintenant',
    specialOfferDesc: 'Obtenez un accès complet à toutes les fonctionnalités IA et continuez à améliorer votre jeu.',
    cta: 'S\'abonner à PRO',
    footer: 'Nous serions ravis de vous revoir!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Tous droits réservés.`,
    unsubscribe: 'Vous avez reçu cet email car vous vous êtes inscrit sur AI Royale.',
    privacy: 'Politique de Confidentialité',
    terms: "Conditions d'Utilisation",
  },
}

export const TrialExpiredEmail = ({
  name,
  language = 'en',
  appUrl,
}: TrialExpiredEmailProps) => {
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Section style={logoContainer}>
              <Text style={logoText}>⏰</Text>
            </Section>
            <Heading style={title}>{t.title}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>{t.greeting(name)}</Text>
            <Text style={subtitle}>{t.subtitle}</Text>
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

            <Section style={offerBox}>
              <Text style={offerTitle}>{t.specialOffer}</Text>
              <Text style={offerDesc}>{t.specialOfferDesc}</Text>
            </Section>

            <Section style={ctaSection}>
              <Link style={ctaButton} href={`${appUrl}/auth`}>
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

export default TrialExpiredEmail

// Styles - Arena Theme with urgency
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
  border: '1px solid rgba(239, 68, 68, 0.3)',
  overflow: 'hidden',
}

const header = {
  background: 'linear-gradient(135deg, #2a1a1a 0%, #1a1212 100%)',
  backgroundColor: '#2a1a1a',
  padding: '40px 20px',
  textAlign: 'center' as const,
  borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
}

const logoContainer = {
  display: 'inline-block',
  padding: '16px',
  backgroundColor: 'rgba(239, 68, 68, 0.2)',
  borderRadius: '16px',
  border: '2px solid rgba(239, 68, 68, 0.6)',
  marginBottom: '16px',
}

const logoText = {
  fontSize: '48px',
  margin: '0',
  lineHeight: '1',
}

const title = {
  color: '#ef4444',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
  textShadow: '0 0 20px rgba(239, 68, 68, 0.5)',
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
  color: '#ef4444',
  fontSize: '18px',
  fontWeight: '500',
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

const offerBox = {
  backgroundColor: '#1a2a1a',
  border: '2px solid rgba(34, 197, 94, 0.4)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}

const offerTitle = {
  color: '#22c55e',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0 0 8px',
}

const offerDesc = {
  color: '#a0a0c0',
  fontSize: '14px',
  margin: '0',
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
