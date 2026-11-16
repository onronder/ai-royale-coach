// Service notice only: trial end, current access and the account step. No benefits list, offer or sales call.
// A promotional version would have to go through the campaign consent gate instead.
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
import * as React from 'https://esm.sh/react@18.3.1'

interface TrialExpiredEmailProps { name?: string; language?: string; appUrl: string }

export const trialExpiredCopy = {
  en: { preview: 'Your AI Royale trial has ended', title: 'Your trial has ended', greeting: (n?: string) => n ? `Hi ${n},` : 'Hi,',
    body: 'Your 3-day AI Royale trial has ended. AI features are no longer available on your account. Saved coaching results stay readable.',
    action: 'To keep using AI features, choose a plan from your account. If you do nothing, no charge is made.',
    link: 'Open your account', why: 'This is a service message about your account status.', privacy: 'Privacy Policy', terms: 'Terms of Service' },
  tr: { preview: 'AI Royale deneme süren sona erdi', title: 'Deneme süren sona erdi', greeting: (n?: string) => n ? `Merhaba ${n},` : 'Merhaba,',
    body: '3 günlük AI Royale deneme süren sona erdi. Hesabında AI özellikleri artık kullanılamıyor. Kayıtlı koçluk sonuçların okunabilir kalır.',
    action: 'AI özelliklerini kullanmaya devam etmek için hesabından bir plan seçebilirsin. Bir işlem yapmazsan ücret alınmaz.',
    link: 'Hesabını aç', why: 'Bu, hesap durumunla ilgili bir hizmet iletisidir.', privacy: 'Gizlilik Politikası', terms: 'Hizmet Şartları' },
  es: { preview: 'Tu prueba de AI Royale ha terminado', title: 'Tu prueba ha terminado', greeting: (n?: string) => n ? `Hola ${n}:` : 'Hola:',
    body: 'Tu prueba de 3 días de AI Royale ha terminado. Las funciones de IA ya no están disponibles en tu cuenta. Tus resultados de coaching guardados siguen visibles.',
    action: 'Para seguir usando las funciones de IA, elige un plan desde tu cuenta. Si no haces nada, no se realiza ningún cargo.',
    link: 'Abrir tu cuenta', why: 'Este es un mensaje de servicio sobre el estado de tu cuenta.', privacy: 'Política de Privacidad', terms: 'Términos de Servicio' },
  fr: { preview: 'Votre essai AI Royale est terminé', title: 'Votre essai est terminé', greeting: (n?: string) => n ? `Bonjour ${n},` : 'Bonjour,',
    body: 'Votre essai AI Royale de 3 jours est terminé. Les fonctions IA ne sont plus disponibles sur votre compte. Vos résultats de coaching enregistrés restent consultables.',
    action: 'Pour continuer à utiliser les fonctions IA, choisissez une formule depuis votre compte. Sans action de votre part, rien ne vous est facturé.',
    link: 'Ouvrir votre compte', why: 'Ceci est un message de service concernant l’état de votre compte.', privacy: 'Politique de confidentialité', terms: 'Conditions d’utilisation' },
  pt: { preview: 'Seu teste do AI Royale terminou', title: 'Seu teste terminou', greeting: (n?: string) => n ? `Olá, ${n},` : 'Olá,',
    body: 'Seu teste de 3 dias do AI Royale terminou. Os recursos de IA não estão mais disponíveis na sua conta. Seus resultados de coaching salvos continuam visíveis.',
    action: 'Para continuar usando os recursos de IA, escolha um plano na sua conta. Se você não fizer nada, nenhuma cobrança é feita.',
    link: 'Abrir sua conta', why: 'Esta é uma mensagem de serviço sobre o status da sua conta.', privacy: 'Política de Privacidade', terms: 'Termos de Serviço' },
}

export const TrialExpiredEmail = ({ name, language = 'en', appUrl }: TrialExpiredEmailProps) => {
  const t = trialExpiredCopy[language as keyof typeof trialExpiredCopy] ?? trialExpiredCopy.en
  return (
    <Html lang={language}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={{ backgroundColor: '#0a0a1a', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: '#12122a', borderRadius: '12px', padding: '32px' }}>
          <Heading style={{ color: '#ffffff', fontSize: '22px', margin: '0 0 16px' }}>{t.title}</Heading>
          <Text style={text}>{t.greeting(name)}</Text>
          <Text style={text}>{t.body}</Text>
          <Text style={text}>{t.action}</Text>
          <Text style={text}><Link href={`${appUrl}/settings`} style={link}>{t.link}</Link></Text>
          <Hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '24px 0' }} />
          <Section>
            <Text style={small}>{t.why}</Text>
            <Text style={small}><Link href={`${appUrl}/privacy`} style={link}>{t.privacy}</Link>{' - '}<Link href={`${appUrl}/terms`} style={link}>{t.terms}</Link></Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
export default TrialExpiredEmail

const text = { color: '#d0d0e0', fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const small = { color: '#8080a0', fontSize: '12px', margin: '0 0 8px' }
const link = { color: '#00d4ff', textDecoration: 'none' }
