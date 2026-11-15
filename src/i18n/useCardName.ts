import { useTranslation } from 'react-i18next';
import { localizedCardName } from '../../supabase/functions/_shared/card-names';

export function useCardName() {
  const { i18n } = useTranslation();
  return (name: string) => localizedCardName(name, i18n.resolvedLanguage ?? 'en');
}
