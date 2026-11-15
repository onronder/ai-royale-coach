import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTrialCoaching } from '@/hooks/useTrialCoaching';

const reasons = ['avoid_charge', 'value', 'price', 'technical', 'other', 'skip'] as const;

export function TrialFollowup({ userId, playerTag, renewalOff = false }: {
  userId: string; playerTag?: string; renewalOff?: boolean;
}) {
  const { t } = useTranslation();
  const { data, update, isError, refetch } = useTrialCoaching(userId, true, renewalOff);
  const recorded = useRef<string>();
  const currentTask = !!playerTag && playerTag === data?.playerTag;
  const { mutate } = update;
  useEffect(() => {
    if (!currentTask || !data?.dayTwo || data.returned || recorded.current === data.subscriptionId) return;
    recorded.current = data.subscriptionId;
    mutate({ action: 'return', value: playerTag });
  }, [currentTask, data?.dayTwo, data?.returned, data?.subscriptionId, mutate, playerTag]);

  if (isError) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
    <span>{t('trialFollowup.loadError')}</span>
    <Button size="sm" variant="outline" onClick={() => void refetch()}>{t('trialFollowup.tryAgain')}</Button>
  </div>;
  if (!data || (playerTag && !currentTask)) return null;
  const survey = !playerTag && renewalOff && data.renewalOff && !data.answered;
  const consent = !!data.playerTag && !data.sent && !data.returned && data.beforeSendCutoff && !(currentTask && data.dayTwo);
  const pendingChoice = update.isPending ? update.variables?.action : undefined;
  const checked = pendingChoice === 'on' || (pendingChoice !== 'off' && data.optedIn);
  const resume = !playerTag && data.dayTwo && data.playerTag;
  if (!survey && !consent && !resume && !update.isError) return null;

  return <div className="space-y-3 rounded-lg border border-border bg-background/50 p-4">
    {survey && <fieldset disabled={update.isPending} className="space-y-2">
      <legend className="text-sm font-semibold">{t('trialFollowup.survey')}</legend>
      <div className="flex flex-wrap gap-2">{reasons.map(reason =>
        <Button key={reason} type="button" size="sm" variant={reason === 'skip' ? 'ghost' : 'outline'}
          className="h-auto min-h-11 whitespace-normal text-start" onClick={() => mutate({ action: 'reason', value: reason })}>
          {t('trialFollowup.' + reason)}
        </Button>)}</div>
    </fieldset>}
    {resume && <Button asChild variant="outline" className="min-h-11"><Link to={'/player/' + data.playerTag}>{t('trialFollowup.resume')}</Link></Button>}
    {consent && <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <Checkbox checked={checked} disabled={update.isPending}
        onCheckedChange={checked => mutate({ action: checked === true ? 'on' : 'off', value: data.playerTag ?? undefined })} />
      {t('trialFollowup.consent')}
    </label>}
    {update.isError && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
      {update.variables?.action === 'off' && data.optedIn ? t('trialFollowup.stillOn') : t('trialFollowup.error')}
      {update.variables && <Button size="sm" variant="outline" onClick={() => mutate(update.variables!)}>{t('trialFollowup.tryAgain')}</Button>}
    </div>}
  </div>;
}
