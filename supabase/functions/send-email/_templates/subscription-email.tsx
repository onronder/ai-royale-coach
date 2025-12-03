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

interface SubscriptionEmailProps {
  name?: string
  language?: string
  appUrl: string
  accountSlots: number
  renewalDate?: string
}

const translations = {
  en: {
    preview: 'Your AI Royale PRO is Active!',
    title: 'PRO Activated!',
    greeting: (name?: string) => name ? `Congratulations ${name}!` : 'Congratulations Champion!',
    subtitle: 'Your AI Coach is Now Unlocked',
    intro: 'Thank you for subscribing to AI Royale PRO. Your personal AI Coach is ready to help you dominate the arena!',
    planLabel: 'Your Plan',
    accountsLabel: (slots: number) => `${slots} ${slots === 1 ? 'Account' : 'Accounts'}`,
    renewalLabel: 'Next Renewal',
    featuresTitle: "What's Now Available:",
    feature1Title: '🤖 Unlimited AI Coach',
    feature1Desc: 'Get personalized strategy advice anytime you need it.',
    feature2Title: '📊 Advanced Deck Analysis',
    feature2Desc: 'Deep insights into your deck synergies and matchups.',
    feature3Title: '🎯 Personalized Recommendations',
    feature3Desc: 'Deck suggestions tailored to your playstyle and card collection.',
    feature4Title: '📈 Match Breakdowns',
    feature4Desc: 'Detailed analysis of your battles with improvement tips.',
    feature5Title: '🃏 Card Mastery Insights',
    feature5Desc: 'Learn optimal usage for every card in your collection.',
    feature6Title: '⚔️ Counter-Deck Builder',
    feature6Desc: 'Build decks specifically designed to counter your opponents.',
    cta: 'Enter the Arena',
    footer: 'Time to climb to the top!',
    copyright: '© 2024 AI Royale. All rights reserved.',
    manage: 'Manage your subscription in Settings.',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  es: {
    preview: '¡Tu AI Royale PRO está Activo!',
    title: '¡PRO Activado!',
    greeting: (name?: string) => name ? `¡Felicidades ${name}!` : '¡Felicidades Campeón!',
    subtitle: 'Tu Coach IA Está Desbloqueado',
    intro: 'Gracias por suscribirte a AI Royale PRO. ¡Tu Coach IA personal está listo para ayudarte a dominar la arena!',
    planLabel: 'Tu Plan',
    accountsLabel: (slots: number) => `${slots} ${slots === 1 ? 'Cuenta' : 'Cuentas'}`,
    renewalLabel: 'Próxima Renovación',
    featuresTitle: 'Ahora Disponible:',
    feature1Title: '🤖 Coach IA Ilimitado',
    feature1Desc: 'Obtén consejos estratégicos personalizados cuando los necesites.',
    feature2Title: '📊 Análisis Avanzado de Mazos',
    feature2Desc: 'Insights profundos sobre sinergias y emparejamientos de tu mazo.',
    feature3Title: '🎯 Recomendaciones Personalizadas',
    feature3Desc: 'Sugerencias de mazos adaptadas a tu estilo y colección.',
    feature4Title: '📈 Desglose de Partidas',
    feature4Desc: 'Análisis detallado de tus batallas con consejos de mejora.',
    feature5Title: '🃏 Maestría de Cartas',
    feature5Desc: 'Aprende el uso óptimo de cada carta en tu colección.',
    feature6Title: '⚔️ Constructor Counter-Deck',
    feature6Desc: 'Construye mazos diseñados para contrarrestar a tus oponentes.',
    cta: 'Entrar a la Arena',
    footer: '¡Es hora de escalar a la cima!',
    copyright: '© 2024 AI Royale. Todos los derechos reservados.',
    manage: 'Administra tu suscripción en Configuración.',
    privacy: 'Política de Privacidad',
    terms: 'Términos de Servicio',
  },
  pt: {
    preview: 'Seu AI Royale PRO está Ativo!',
    title: 'PRO Ativado!',
    greeting: (name?: string) => name ? `Parabéns ${name}!` : 'Parabéns Campeão!',
    subtitle: 'Seu Coach IA Está Desbloqueado',
    intro: 'Obrigado por assinar o AI Royale PRO. Seu Coach IA pessoal está pronto para ajudá-lo a dominar a arena!',
    planLabel: 'Seu Plano',
    accountsLabel: (slots: number) => `${slots} ${slots === 1 ? 'Conta' : 'Contas'}`,
    renewalLabel: 'Próxima Renovação',
    featuresTitle: 'Agora Disponível:',
    feature1Title: '🤖 Coach IA Ilimitado',
    feature1Desc: 'Obtenha conselhos estratégicos personalizados quando precisar.',
    feature2Title: '📊 Análise Avançada de Decks',
    feature2Desc: 'Insights profundos sobre sinergias e matchups do seu deck.',
    feature3Title: '🎯 Recomendações Personalizadas',
    feature3Desc: 'Sugestões de decks adaptadas ao seu estilo e coleção.',
    feature4Title: '📈 Análise de Partidas',
    feature4Desc: 'Análise detalhada das suas batalhas com dicas de melhoria.',
    feature5Title: '🃏 Maestria de Cartas',
    feature5Desc: 'Aprenda o uso ideal de cada carta na sua coleção.',
    feature6Title: '⚔️ Construtor Counter-Deck',
    feature6Desc: 'Construa decks projetados para countar seus oponentes.',
    cta: 'Entrar na Arena',
    footer: 'Hora de subir ao topo!',
    copyright: '© 2024 AI Royale. Todos os direitos reservados.',
    manage: 'Gerencie sua assinatura em Configurações.',
    privacy: 'Política de Privacidade',
    terms: 'Termos de Serviço',
  },
  tr: {
    preview: 'AI Royale PRO Aktif!',
    title: 'PRO Aktifleştirildi!',
    greeting: (name?: string) => name ? `Tebrikler ${name}!` : 'Tebrikler Şampiyon!',
    subtitle: 'AI Koçunuz Açıldı',
    intro: 'AI Royale PRO\'ya abone olduğunuz için teşekkürler. Kişisel AI Koçunuz arenada hakimiyet kurmanıza yardımcı olmaya hazır!',
    planLabel: 'Planınız',
    accountsLabel: (slots: number) => `${slots} Hesap`,
    renewalLabel: 'Sonraki Yenileme',
    featuresTitle: 'Şimdi Kullanılabilir:',
    feature1Title: '🤖 Sınırsız AI Koç',
    feature1Desc: 'İhtiyacınız olduğunda kişiselleştirilmiş strateji tavsiyeleri alın.',
    feature2Title: '📊 Gelişmiş Deste Analizi',
    feature2Desc: 'Destenizin sinerjileri ve eşleşmeleri hakkında derin içgörüler.',
    feature3Title: '🎯 Kişiselleştirilmiş Öneriler',
    feature3Desc: 'Oyun tarzınıza ve koleksiyonunuza göre deste önerileri.',
    feature4Title: '📈 Maç Analizleri',
    feature4Desc: 'Savaşlarınızın gelişim ipuçlarıyla detaylı analizi.',
    feature5Title: '🃏 Kart Ustalığı İçgörüleri',
    feature5Desc: 'Koleksiyonunuzdaki her kart için optimal kullanımı öğrenin.',
    feature6Title: '⚔️ Counter-Deck Oluşturucu',
    feature6Desc: 'Rakiplerinizi yenmek için özel tasarlanmış desteler oluşturun.',
    cta: 'Arenaya Gir',
    footer: 'Zirveye çıkma zamanı!',
    copyright: '© 2024 AI Royale. Tüm hakları saklıdır.',
    manage: 'Aboneliğinizi Ayarlar\'dan yönetin.',
    privacy: 'Gizlilik Politikası',
    terms: 'Hizmet Şartları',
  },
  fr: {
    preview: 'Votre AI Royale PRO est Actif!',
    title: 'PRO Activé!',
    greeting: (name?: string) => name ? `Félicitations ${name}!` : 'Félicitations Champion!',
    subtitle: 'Votre Coach IA est Débloqué',
    intro: 'Merci de vous être abonné à AI Royale PRO. Votre Coach IA personnel est prêt à vous aider à dominer l\'arène!',
    planLabel: 'Votre Plan',
    accountsLabel: (slots: number) => `${slots} ${slots === 1 ? 'Compte' : 'Comptes'}`,
    renewalLabel: 'Prochain Renouvellement',
    featuresTitle: 'Maintenant Disponible:',
    feature1Title: '🤖 Coach IA Illimité',
    feature1Desc: 'Obtenez des conseils stratégiques personnalisés quand vous en avez besoin.',
    feature2Title: '📊 Analyse de Deck Avancée',
    feature2Desc: 'Insights approfondis sur les synergies et matchups de votre deck.',
    feature3Title: '🎯 Recommandations Personnalisées',
    feature3Desc: 'Suggestions de decks adaptées à votre style et collection.',
    feature4Title: '📈 Analyses de Matchs',
    feature4Desc: 'Analyse détaillée de vos batailles avec conseils d\'amélioration.',
    feature5Title: '🃏 Maîtrise des Cartes',
    feature5Desc: 'Apprenez l\'utilisation optimale de chaque carte de votre collection.',
    feature6Title: '⚔️ Constructeur Counter-Deck',
    feature6Desc: 'Construisez des decks conçus pour contrer vos adversaires.',
    cta: "Entrer dans l'Arène",
    footer: 'C\'est l\'heure de grimper au sommet!',
    copyright: '© 2024 AI Royale. Tous droits réservés.',
    manage: 'Gérez votre abonnement dans les Paramètres.',
    privacy: 'Politique de Confidentialité',
    terms: "Conditions d'Utilisation",
  },
}

function formatDate(dateString?: string, language?: string): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    const locales: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
      tr: 'tr-TR',
      fr: 'fr-FR',
    }
    return date.toLocaleDateString(locales[language || 'en'] || 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateString
  }
}

export const SubscriptionEmail = ({
  name,
  language = 'en',
  appUrl,
  accountSlots,
  renewalDate,
}: SubscriptionEmailProps) => {
  const t = translations[language as keyof typeof translations] || translations.en

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Section style={logoContainer}>
              <Text style={logoText}>👑</Text>
            </Section>
            <Heading style={title}>{t.title}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>{t.greeting(name)}</Text>
            <Text style={subtitle}>{t.subtitle}</Text>
            <Text style={intro}>{t.intro}</Text>

            {/* Plan Details Box */}
            <Section style={planBox}>
              <Section style={planRow}>
                <Text style={planLabel}>{t.planLabel}</Text>
                <Text style={planValue}>{t.accountsLabel(accountSlots)}</Text>
              </Section>
              <Section style={planRow}>
                <Text style={planLabel}>{t.renewalLabel}</Text>
                <Text style={planValue}>{formatDate(renewalDate, language)}</Text>
              </Section>
            </Section>

            <Text style={featuresTitle}>{t.featuresTitle}</Text>

            <Section style={featuresSection}>
              <Section style={featureBox}>
                <Text style={featureTitle}>{t.feature1Title}</Text>
                <Text style={featureDesc}>{t.feature1Desc}</Text>
              </Section>
              <Section style={featureBox}>
                <Text style={featureTitle}>{t.feature2Title}</Text>
                <Text style={featureDesc}>{t.feature2Desc}</Text>
              </Section>
              <Section style={featureBox}>
                <Text style={featureTitle}>{t.feature3Title}</Text>
                <Text style={featureDesc}>{t.feature3Desc}</Text>
              </Section>
              <Section style={featureBox}>
                <Text style={featureTitle}>{t.feature4Title}</Text>
                <Text style={featureDesc}>{t.feature4Desc}</Text>
              </Section>
              <Section style={featureBox}>
                <Text style={featureTitle}>{t.feature5Title}</Text>
                <Text style={featureDesc}>{t.feature5Desc}</Text>
              </Section>
              <Section style={featureBox}>
                <Text style={featureTitle}>{t.feature6Title}</Text>
                <Text style={featureDesc}>{t.feature6Desc}</Text>
              </Section>
            </Section>

            <Section style={ctaSection}>
              <Link style={ctaButton} href={`${appUrl}/dashboard`}>
                {t.cta}
              </Link>
            </Section>

            <Text style={footerText}>{t.footer}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={copyright}>{t.copyright}</Text>
            <Text style={manage}>{t.manage}</Text>
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

export default SubscriptionEmail

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
  color: '#00d4ff',
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

const planBox = {
  backgroundColor: '#1a1a3e',
  border: '2px solid rgba(212, 175, 55, 0.4)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
}

const planRow = {
  marginBottom: '8px',
}

const planLabel = {
  color: '#a0a0c0',
  fontSize: '14px',
  margin: '0 0 4px',
}

const planValue = {
  color: '#d4af37',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0',
}

const featuresTitle = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const featuresSection = {
  marginBottom: '32px',
}

const featureBox = {
  backgroundColor: '#1a1a2e',
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

const manage = {
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
