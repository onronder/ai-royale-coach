import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import tr from './locales/tr.json';
import fr from './locales/fr.json';

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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: { ...en, ...enHelp } },
      es: { translation: { ...es, ...esHelp } },
      pt: { translation: { ...pt, ...ptHelp } },
      tr: { translation: { ...tr, ...trHelp } },
      fr: { translation: { ...fr, ...frHelp } },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
