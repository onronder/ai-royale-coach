import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { summaryChecked, type SummaryState } from '@/lib/trialSummaryChoice';

/** Separate, off-by-default consent for one end-of-trial coaching summary email. */
export function TrialSummaryConsent({ userId, playerTag, taskId }: { userId: string; playerTag: string; taskId: string }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const key = ['trial-summary', userId];
  const state = useQuery({ queryKey: key, retry: false, queryFn: async () => {
    const { data, error } = await supabase.rpc('trial_summary_state');
    if (error) throw error;
    return data as unknown as SummaryState | null;
  } });
  const update = useMutation({
    mutationFn: async (on: boolean) => {
      // The server only removes the choice when it is still this player's task, so a stale tab cannot clear another player.
      const { data, error } = await supabase.rpc('update_trial_summary', { p_player_tag: playerTag, p_task: taskId, p_on: on });
      if (error) throw error;
      return data as unknown as SummaryState;
    },
    onSuccess: s => client.setQueryData(key, s),
    onError: () => client.invalidateQueries({ queryKey: key }),
  });
  if (state.isError) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
    <span>{t('coaching.summaryLoadError')}</span>
    <Button size="sm" variant="outline" onClick={() => state.refetch()}>{t('coaching.summaryRetry')}</Button>
  </div>;
  const data = state.data;
  if (!data || data.sent) return null;
  const saved = summaryChecked(data, playerTag, taskId);
  const checked = update.isPending ? update.variables : saved;
  const failedOff = update.isError && update.variables === false && saved;
  return <div className="space-y-2">
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background/50 p-4 text-sm">
      <Checkbox checked={checked} disabled={update.isPending} onCheckedChange={v => update.mutate(v === true)} />
      {t('coaching.summaryConsent')}
    </label>
    {update.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <span>{failedOff ? t('coaching.summaryStillOn') : t('coaching.summarySaveError')}</span>
      <Button size="sm" variant="outline" onClick={() => update.mutate(update.variables!)}>{t('coaching.summaryRetry')}</Button>
    </div>}
  </div>;
}
