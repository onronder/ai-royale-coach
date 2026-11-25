// Service notice about the end of AI access. No benefits list, offer or sales call.
// A promotional version would have to go through the campaign consent gate instead.
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from 'https://esm.sh/@react-email/components@0.0.22?deps=react@18.3.1'
import * as React from 'https://esm.sh/react@18.3.1'

interface TrialExpiredEmailProps { name?: string; language?: string; appUrl: string }

export const trialExpiredCopy = {
  en: { preview: 'Your access to AI features on AI Royale has ended', title: 'Your AI access has ended', greeting: (n?: string) => n ? `Hi ${n},` : 'Hi,',
    body: 'You can check your access status in your account settings.',
    link: 'Open your account', why: 'This is a service message about your account status.', privacy: 'Privacy Policy', terms: 'Terms of Service' },
  tr: { preview: 'AI Royale’de yapay zekâ erişimin sona erdi', title: 'Yapay zekâ erişimin sona erdi', greeting: (n?: string) => n ? `Merhaba ${n},` : 'Merhaba,',
    body: 'Erişim durumunu hesap ayarlarından kontrol edebilirsin.',
    link: 'Hesabını aç', why: 'Bu, hesap durumunla ilgili bir hizmet iletisidir.', privacy: 'Gizlilik Politikası', terms: 'Hizmet Şartları' },
  es: { preview: 'Tu acceso a las funciones de IA de AI Royale ha terminado', title: 'Tu acceso a la IA ha terminado', greeting: (n?: string) => n ? `Hola ${n}:` : 'Hola:',
    body: 'Puedes consultar el estado de tu acceso en la configuración de tu cuenta.',
    link: 'Abrir tu cuenta', why: 'Este es un mensaje de servicio sobre el estado de tu cuenta.', privacy: 'Política de Privacidad', terms: 'Términos de Servicio' },
  fr: { preview: 'Votre accès aux fonctionnalités d’IA sur AI Royale a pris fin', title: 'Votre accès à l’IA a pris fin', greeting: (n?: string) => n ? `Bonjour ${n},` : 'Bonjour,',
    body: 'Vous pouvez vérifier vos droits d’accès dans les paramètres de votre compte.',
    link: 'Ouvrir votre compte', why: 'Ceci est un message de service concernant l’état de votre compte.', privacy: 'Politique de confidentialité', terms: 'Conditions d’utilisation' },
  pt: { preview: 'Seu acesso aos recursos de IA do AI Royale terminou', title: 'Seu acesso à IA terminou', greeting: (n?: string) => n ? `Olá, ${n},` : 'Olá,',
    body: 'Você pode consultar o status do seu acesso nas configurações da conta.',
    link: 'Abrir sua conta', why: 'Esta é uma mensagem de serviço sobre o status da sua conta.', privacy: 'Política de Privacidade', terms: 'Termos de Serviço' },
}

export function getAccessEndedCopy(language: string) {
  return trialExpiredCopy[language as keyof typeof trialExpiredCopy] ?? trialExpiredCopy.en
}

export const TrialExpiredEmail = ({ name, language = 'en', appUrl }: TrialExpiredEmailProps) => {
  const t = getAccessEndedCopy(language)
  return (
    <Html lang={language}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={{ backgroundColor: '#0a0a1a', fontFamily: 'Arial, sans-serif', margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', backgroundColor: '#12122a', borderRadius: '12px', padding: '32px' }}>
          <Heading style={{ color: '#ffffff', fontSize: '22px', margin: '0 0 16px' }}>{t.title}</Heading>
          <Text style={text}>{t.greeting(name)}</Text>
          <Text style={text}>{t.body}</Text>
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
