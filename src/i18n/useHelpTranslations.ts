import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ensureHelp } from './index';
export function useHelpTranslations(enabled = true) {
 const { i18n } = useTranslation();
 const language = i18n.resolvedLanguage || 'en';
 const [failed, setFailed] = useState(false);
 const [loaded, setLoaded] = useState('');
 useEffect(() => {
  let active = true;
  if (enabled) {
   setFailed(false);
   void ensureHelp().then(() => { if (active) setLoaded(language); }).catch(() => { if (active) setFailed(true); });
  }
  return () => { active = false; };
 }, [enabled, language]);
 return { t: i18n.getFixedT(null, ['help', 'translation']), ready: loaded === language && i18n.hasResourceBundle(language, 'help'), failed };
}
