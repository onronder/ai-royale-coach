import i18n from '@/i18n';
import { productLanguage } from '../../supabase/functions/_shared/language';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Save explicit choices in order if the player switches twice before a write finishes.
let pendingSave = Promise.resolve();
let selectionVersion = 0;

export function restoreAccountLanguage(userId: string) {
  let active = true;
  const version = selectionVersion;
  void supabase.from('profiles').select('preferred_language, language_selected_at')
    .eq('id', userId).maybeSingle().then(({ data }) => {
      if (active && version === selectionVersion && data?.language_selected_at && data.preferred_language) {
        void i18n.changeLanguage(productLanguage(data.preferred_language));
      }
    });
  return () => { active = false; };
}

export async function changeLanguage(language: string) {
  selectionVersion++;
  await i18n.changeLanguage(language);
  const session = supabase.auth.getSession();
  pendingSave = pendingSave.then(async () => {
    const { data, error: sessionError } = await session;
    if (sessionError) throw sessionError;
    if (!data.session) return;
    const { error } = await supabase.from('profiles')
      .update({ preferred_language: language, language_selected_at: new Date().toISOString() }).eq('id', data.session.user.id).select('id').single();
    if (error) throw error;
  }).catch(() => {
    if (i18n.resolvedLanguage === language) toast.error(i18n.t('settings.preferences.languageSaveFailed'));
  });
  await pendingSave;
}
