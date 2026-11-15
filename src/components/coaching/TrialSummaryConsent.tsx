import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

interface SummaryState { subscriptionId: string; optedIn: boolean; playerTag: string | null; sent: boolean; trialEndsAt: string }

/** Separate, off-by-default consent for one end-of-trial coaching summary email. */
export function TrialSummaryConsent({ userId, playerTag }: { userId: string; playerTag: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const key = ['trial-summary', userId];
  const { data } = useQuery({ queryKey: key, retry: false, queryFn: async () => {
    const { data, error } = await supabase.rpc('trial_summary_state');
    if (error) throw error;
    return data as unknown as SummaryState | null;
  } });
  const update = useMutation({
    mutationFn: async (on: boolean) => {
      const { data, error } = await supabase.rpc('update_trial_summary', { p_player_tag: playerTag, p_on: on });
      if (error) throw error;
      return data as unknown as SummaryState;
    },
    onSuccess: state => client.setQueryData(key, state),
  });
  if (!data || data.sent) return null;
  const checked = update.isPending ? update.variables : data.optedIn && data.playerTag === playerTag;
  return <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background/50 p-4 text-sm">
    <Checkbox checked={checked} disabled={update.isPending} onCheckedChange={v => update.mutate(v === true)} />
    {t('coaching.summaryConsent')}
  </label>;
}
