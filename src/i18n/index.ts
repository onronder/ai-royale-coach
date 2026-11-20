import { baseLanguage } from '../../supabase/functions/_shared/language';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import tr from './locales/tr.json';
import fr from './locales/fr.json';
import { coachingTranslations } from './coaching';
import { firstValueTranslations } from './firstValue';
import { campaignTranslations } from './campaign';

import enHelp from './locales/en.help.json';
import esHelp from './locales/es.help.json';
import ptHelp from './locales/pt.help.json';
import trHelp from './locales/tr.help.json';
import frHelp from './locales/fr.help.json';

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

// Initialize i18n with all translations
const i18nInit = i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { ...en, ...enHelp, coaching: coachingTranslations.en, firstValue: firstValueTranslations.en, campaign: campaignTranslations.en } },
      es: { translation: { ...es, ...esHelp, coaching: coachingTranslations.es, firstValue: firstValueTranslations.es, campaign: campaignTranslations.es } },
      pt: { translation: { ...pt, ...ptHelp, coaching: coachingTranslations.pt, firstValue: firstValueTranslations.pt, campaign: campaignTranslations.pt } },
      tr: { translation: { ...tr, ...trHelp, coaching: coachingTranslations.tr, firstValue: firstValueTranslations.tr, campaign: campaignTranslations.tr } },
      fr: { translation: { ...fr, ...frHelp, coaching: coachingTranslations.fr, firstValue: firstValueTranslations.fr, campaign: campaignTranslations.fr } },
    },
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
