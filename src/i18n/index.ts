import { baseLanguage } from '../../supabase/functions/_shared/language';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import type { BackendModule } from 'i18next';
import { coachingTranslations } from './coaching';
import { firstValueTranslations } from './firstValue';
import { campaignTranslations } from './campaign';

const translations = {
  en: () => import('./locales/en.json'), es: () => import('./locales/es.json'),
  pt: () => import('./locales/pt.json'), tr: () => import('./locales/tr.json'), fr: () => import('./locales/fr.json'),
};
const help = {
  en: () => import('./locales/en.help.json'), es: () => import('./locales/es.help.json'),
  pt: () => import('./locales/pt.help.json'), tr: () => import('./locales/tr.help.json'), fr: () => import('./locales/fr.help.json'),
};
const backend: BackendModule = {
  type: 'backend', init() {},
  read(language, namespace, done) {
    const lng = baseLanguage(language) as keyof typeof translations;
    const source = namespace === 'help' ? help : translations;
    source[lng]().then(({default: data}) => done(null, namespace === 'help' ? data : {
      ...data, coaching: coachingTranslations[lng], firstValue: firstValueTranslations[lng], campaign: campaignTranslations[lng],
    })).catch(error => done(error, false));
  },
};

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

// Load only the selected language and English fallback; help is requested separately.
const i18nInit = i18n
  .use(backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    ns: ['translation'],
    defaultNS: 'translation',
    supportedLngs: languages.map(language => language.code),
    load: 'languageOnly',
    fallbackLng: 'en',
    debug: false, // Set to true for debugging
    interpolation: {
      escapeValue: false,
    },
    detection: {
      convertDetectedLanguage: baseLanguage,
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  });

const syncDocumentLanguage = () => {
  if (typeof document !== 'undefined') document.documentElement.lang = i18n.resolvedLanguage || 'en';
};
i18n.on('languageChanged', syncDocumentLanguage);
void i18nInit.then(syncDocumentLanguage);

export { i18nInit };
export default i18n;

export async function ensureHelp() {
  await i18n.loadNamespaces('help');
  const language = i18n.resolvedLanguage || 'en';
  if (!i18n.hasResourceBundle(language, 'help')) throw new Error('Help content unavailable');
}
