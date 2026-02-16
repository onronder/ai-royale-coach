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

interface CancellationEmailProps {
  name?: string
  language?: string
  appUrl: string
  accessEndDate?: string
  wasTrial?: boolean
}

const translations = {
  en: {
    preview: 'Your AI Royale Subscription Has Been Cancelled',
    title: 'Subscription Cancelled',
    greeting: (name?: string) => name ? `Hi ${name},` : 'Hi Champion,',
    trialSubtitle: 'Your trial has been cancelled',
    activeSubtitle: 'Your subscription has been cancelled',
    trialBody: 'Your trial cancellation has been confirmed. You will not be charged when the trial period ends.',
    activeBody: 'Your subscription cancellation has been confirmed. You will not be charged again.',
    accessLabel: 'Access Until',
    accessNote: (date: string) => `You will continue to have full access to all PRO features until ${date}.`,
    noAccessDate: 'Your access to PRO features has ended.',
    whatHappens: 'What happens next:',
    bullet1: 'All your data (decks, stats, match history) will be retained.',
    bullet2: 'AI Coach and advanced analysis features will be disabled after your access period ends.',
    bullet3: 'You can resubscribe at any time from Settings to regain full access.',
    gdprTitle: 'Your Data Rights',
    gdprBody: 'Your data is retained in accordance with our privacy policy. You can request a complete export or deletion of your data at any time by contacting us.',
    resubscribe: 'Resubscribe Anytime',
    footer: 'We hope to see you back in the arena!',
    copyright: `© ${new Date().getFullYear()} AI Royale. All rights reserved.`,
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
  },
  es: {
    preview: 'Tu suscripción a AI Royale ha sido cancelada',
    title: 'Suscripción Cancelada',
    greeting: (name?: string) => name ? `Hola ${name},` : 'Hola Campeón,',
    trialSubtitle: 'Tu periodo de prueba ha sido cancelado',
    activeSubtitle: 'Tu suscripción ha sido cancelada',
    trialBody: 'La cancelación de tu prueba ha sido confirmada. No se te cobrará al finalizar el periodo de prueba.',
    activeBody: 'La cancelación de tu suscripción ha sido confirmada. No se te volverá a cobrar.',
    accessLabel: 'Acceso Hasta',
    accessNote: (date: string) => `Seguirás teniendo acceso completo a todas las funciones PRO hasta el ${date}.`,
    noAccessDate: 'Tu acceso a las funciones PRO ha finalizado.',
    whatHappens: 'Qué sucede a continuación:',
    bullet1: 'Todos tus datos (mazos, estadísticas, historial de partidas) se conservarán.',
    bullet2: 'El Coach IA y las funciones de análisis avanzado se desactivarán después de que termine tu periodo de acceso.',
    bullet3: 'Puedes volver a suscribirte en cualquier momento desde Configuración para recuperar el acceso completo.',
    gdprTitle: 'Tus Derechos sobre los Datos',
    gdprBody: 'Tus datos se conservan de acuerdo con nuestra política de privacidad. Puedes solicitar una exportación o eliminación completa de tus datos en cualquier momento contactándonos.',
    resubscribe: 'Vuelve a Suscribirte',
    footer: '¡Esperamos verte de vuelta en la arena!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Todos los derechos reservados.`,
    privacy: 'Política de Privacidad',
    terms: 'Términos de Servicio',
  },
  pt: {
    preview: 'Sua assinatura do AI Royale foi cancelada',
    title: 'Assinatura Cancelada',
    greeting: (name?: string) => name ? `Olá ${name},` : 'Olá Campeão,',
    trialSubtitle: 'Seu período de teste foi cancelado',
    activeSubtitle: 'Sua assinatura foi cancelada',
    trialBody: 'O cancelamento do seu teste foi confirmado. Você não será cobrado ao final do período de teste.',
    activeBody: 'O cancelamento da sua assinatura foi confirmado. Você não será cobrado novamente.',
    accessLabel: 'Acesso Até',
    accessNote: (date: string) => `Você continuará tendo acesso completo a todos os recursos PRO até ${date}.`,
    noAccessDate: 'Seu acesso aos recursos PRO terminou.',
    whatHappens: 'O que acontece agora:',
    bullet1: 'Todos os seus dados (decks, estatísticas, histórico de partidas) serão mantidos.',
    bullet2: 'O Coach IA e os recursos de análise avançada serão desativados após o término do seu período de acesso.',
    bullet3: 'Você pode assinar novamente a qualquer momento em Configurações para recuperar o acesso completo.',
    gdprTitle: 'Seus Direitos sobre os Dados',
    gdprBody: 'Seus dados são mantidos de acordo com nossa política de privacidade. Você pode solicitar uma exportação ou exclusão completa dos seus dados a qualquer momento entrando em contato conosco.',
    resubscribe: 'Assine Novamente',
    footer: 'Esperamos vê-lo de volta na arena!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Todos os direitos reservados.`,
    privacy: 'Política de Privacidade',
    terms: 'Termos de Serviço',
  },
  tr: {
    preview: 'AI Royale Aboneliğiniz İptal Edildi',
    title: 'Abonelik İptal Edildi',
    greeting: (name?: string) => name ? `Merhaba ${name},` : 'Merhaba Şampiyon,',
    trialSubtitle: 'Deneme süreniz iptal edildi',
    activeSubtitle: 'Aboneliğiniz iptal edildi',
    trialBody: 'Deneme iptali onaylandı. Deneme süresi sona erdiğinde sizden ücret alınmayacaktır.',
    activeBody: 'Abonelik iptali onaylandı. Tekrar ücret alınmayacaktır.',
    accessLabel: 'Erişim Bitiş Tarihi',
    accessNote: (date: string) => `${date} tarihine kadar tüm PRO özelliklerine tam erişiminiz devam edecektir.`,
    noAccessDate: 'PRO özelliklerine erişiminiz sona erdi.',
    whatHappens: 'Bundan sonra ne olacak:',
    bullet1: 'Tüm verileriniz (desteler, istatistikler, maç geçmişi) korunacaktır.',
    bullet2: 'AI Koç ve gelişmiş analiz özellikleri erişim süreniz sona erdikten sonra devre dışı bırakılacaktır.',
    bullet3: 'Tam erişimi yeniden kazanmak için istediğiniz zaman Ayarlar\'dan tekrar abone olabilirsiniz.',
    gdprTitle: 'Veri Haklarınız',
    gdprBody: 'Verileriniz gizlilik politikamıza uygun olarak saklanmaktadır. İstediğiniz zaman bizimle iletişime geçerek verilerinizin tam dışa aktarımını veya silinmesini talep edebilirsiniz.',
    resubscribe: 'Tekrar Abone Ol',
    footer: 'Sizi tekrar arenada görmeyi umuyoruz!',
    copyright: `© ${new Date().getFullYear()} AI Royale. Tüm hakları saklıdır.`,
    privacy: 'Gizlilik Politikası',
    terms: 'Hizmet Şartları',
  },
  fr: {
    preview: 'Votre abonnement AI Royale a été annulé',
    title: 'Abonnement Annulé',
    greeting: (name?: string) => name ? `Bonjour ${name},` : 'Bonjour Champion,',
    trialSubtitle: 'Votre essai a été annulé',
    activeSubtitle: 'Votre abonnement a été annulé',
    trialBody: 'L\'annulation de votre essai a été confirmée. Vous ne serez pas facturé à la fin de la période d\'essai.',
    activeBody: 'L\'annulation de votre abonnement a été confirmée. Vous ne serez plus facturé.',
    accessLabel: 'Accès Jusqu\'au',
    accessNote: (date: string) => `Vous continuerez à avoir un accès complet à toutes les fonctionnalités PRO jusqu'au ${date}.`,
    noAccessDate: 'Votre accès aux fonctionnalités PRO a pris fin.',
    whatHappens: 'Ce qui se passe ensuite :',
    bullet1: 'Toutes vos données (decks, statistiques, historique des matchs) seront conservées.',
    bullet2: 'Le Coach IA et les fonctionnalités d\'analyse avancée seront désactivés après la fin de votre période d\'accès.',
    bullet3: 'Vous pouvez vous réabonner à tout moment depuis les Paramètres pour retrouver un accès complet.',
    gdprTitle: 'Vos Droits sur les Données',
    gdprBody: 'Vos données sont conservées conformément à notre politique de confidentialité. Vous pouvez demander une exportation ou une suppression complète de vos données à tout moment en nous contactant.',
    resubscribe: 'Se Réabonner',
    footer: 'Nous espérons vous revoir dans l\'arène !',
    copyright: `© ${new Date().getFullYear()} AI Royale. Tous droits réservés.`,
    privacy: 'Politique de Confidentialité',
    terms: 'Conditions d\'Utilisation',
  },
}

function formatDate(dateString?: string, language?: string): string {
  if (!dateString) return ''
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

export const CancellationEmail = ({
  name,
  language = 'en',
  appUrl,
  accessEndDate,
  wasTrial = false,
}: CancellationEmailProps) => {
  const t = translations[language as keyof typeof translations] || translations.en
  const formattedDate = formatDate(accessEndDate, language)

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Section style={logoContainer}>
              <Text style={logoText}>👋</Text>
            </Section>
            <Heading style={title}>{t.title}</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>{t.greeting(name)}</Text>
            <Text style={subtitleStyle}>{wasTrial ? t.trialSubtitle : t.activeSubtitle}</Text>
            <Text style={bodyText}>{wasTrial ? t.trialBody : t.activeBody}</Text>

            {/* Access End Date Box */}
            {formattedDate ? (
              <Section style={accessBox}>
                <Text style={accessLabel}>{t.accessLabel}</Text>
                <Text style={accessDate}>{formattedDate}</Text>
                <Text style={accessNote}>{t.accessNote(formattedDate)}</Text>
              </Section>
            ) : (
              <Section style={accessBox}>
                <Text style={accessNote}>{t.noAccessDate}</Text>
              </Section>
            )}

            {/* What happens next */}
            <Text style={sectionTitle}>{t.whatHappens}</Text>
            <Section style={bulletSection}>
              <Text style={bulletItem}>✅ {t.bullet1}</Text>
              <Text style={bulletItem}>⏸️ {t.bullet2}</Text>
              <Text style={bulletItem}>🔄 {t.bullet3}</Text>
            </Section>

            {/* GDPR Notice */}
            <Section style={gdprBox}>
              <Text style={gdprTitle}>{t.gdprTitle}</Text>
              <Text style={gdprBody}>{t.gdprBody}</Text>
            </Section>

            <Section style={ctaSection}>
              <Link style={ctaButton} href={`${appUrl}/settings`}>
                {t.resubscribe}
              </Link>
            </Section>

            <Text style={footerText}>{t.footer}</Text>
          </Section>

          <Hr style={hr} />

          <Section style={footerSection}>
            <Text style={copyright}>{t.copyright}</Text>
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

export default CancellationEmail

// Styles - Arena Vibrant Theme (matching existing emails)
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
  fontSize: '28px',
  fontWeight: '700',
  margin: '0',
}

const content = {
  padding: '32px 24px',
  backgroundColor: '#12122a',
}

const greeting = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const subtitleStyle = {
  color: '#a0a0c0',
  fontSize: '16px',
  margin: '0 0 16px',
}

const bodyText = {
  color: '#a0a0c0',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px',
}

const accessBox = {
  backgroundColor: '#1a1a3e',
  border: '2px solid rgba(212, 175, 55, 0.4)',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}

const accessLabel = {
  color: '#a0a0c0',
  fontSize: '14px',
  margin: '0 0 4px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
}

const accessDate = {
  color: '#d4af37',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 12px',
}

const accessNote = {
  color: '#a0a0c0',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
}

const sectionTitle = {
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px',
}

const bulletSection = {
  marginBottom: '24px',
}

const bulletItem = {
  color: '#a0a0c0',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 8px',
  paddingLeft: '4px',
}

const gdprBox = {
  backgroundColor: '#1a1a2e',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '24px',
}

const gdprTitle = {
  color: '#00d4ff',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const gdprBody = {
  color: '#a0a0c0',
  fontSize: '13px',
  lineHeight: '1.6',
  margin: '0',
}

const ctaSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
}

const ctaButton = {
  backgroundColor: '#d4af37',
  color: '#0a0a1a',
  padding: '14px 40px',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  display: 'inline-block',
}

const footerText = {
  color: '#a0a0c0',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
}

const hr = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '0',
}

const footerSection = {
  padding: '24px',
  textAlign: 'center' as const,
  backgroundColor: '#12122a',
}

const copyright = {
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
