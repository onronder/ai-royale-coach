import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getMarketingConsent, marketingConsentKey, newRequestKey, setMarketingConsent, type MarketingState } from '@/lib/marketingConsent';

const KINDS = ['access', 'rectification', 'erasure', 'portability', 'objection', 'restriction'] as const;
type PrivacyRequest = { id: string; kind: string; status: string; received_at: string; due_at: string; responded_at: string | null; outcome: string | null };

/** Open to every signed-in account, including ones whose subscription has ended. */
export default function EmailPreferences() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [userId, setUserId] = useState<string | null | undefined>();
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null)); }, []);
  useEffect(() => { if (userId === null) navigate('/auth?returnTo=/settings/email'); }, [userId, navigate]);

  const key = marketingConsentKey(userId ?? '', 'prefs');
  // Read-only key: never shares a cached answer with the Coach invite, which must send its own claiming request.
  const coachKey = marketingConsentKey(userId ?? '', 'coach');
  const consent = useQuery({ queryKey: key, queryFn: () => getMarketingConsent(false), enabled: !!userId, retry: 1 });
  const [requestKey, setRequestKey] = useState(newRequestKey);
  const change = useMutation({
    mutationFn: ({ action, expected }: { action: 'grant' | 'withdraw'; expected: MarketingState }) =>
      setMarketingConsent(action, 'preferences', expected, i18n.language, requestKey),
    onSuccess: r => { client.setQueryData(key, { ...consent.data!, state: r.state, invite: false }); client.invalidateQueries({ queryKey: coachKey, exact: true }); if (r.status === 'ok') setRequestKey(newRequestKey()); },
  });

  const requests = useQuery({ queryKey: ['privacy-requests', userId], enabled: !!userId, queryFn: async () => {
    const { data, error } = await supabase.rpc('my_privacy_requests' as never);
    if (error) throw error;
    return (data ?? []) as unknown as PrivacyRequest[];
  } });
  const [kind, setKind] = useState<string>('access');
  const [details, setDetails] = useState('');
  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('submit_privacy_request' as never, { p_kind: kind, p_details: details.trim() } as never);
      if (error) throw error;
    },
    onSuccess: () => { setDetails(''); requests.refetch(); },
  });
  const date = (d: string | null) => d ? new Date(d).toLocaleDateString(i18n.language) : '—';

  const state = consent.data?.state;
  const on = state === 'granted';
  const failedOff = change.isError && change.variables?.action === 'withdraw';
  const withdrawnOk = !change.isPending && change.data?.status === 'ok' && change.variables?.action === 'withdraw';
  const grantedOk = !change.isPending && change.data?.status === 'ok' && change.variables?.action === 'grant';
  const collectionOpen = consent.data?.collectionOpen ?? false;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>{t('marketing.prefsTitle')} · AI Royale</title><meta name="robots" content="noindex" /></Helmet>
      <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:py-10">
        <Button variant="ghost" size="sm" asChild className="-ml-2"><Link to="/select-player"><ArrowLeft className="mr-1 h-4 w-4" />{t('marketing.back')}</Link></Button>
        <h1 className="text-2xl font-bold">{t('marketing.prefsTitle')}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Mail className="h-5 w-5 text-primary" aria-hidden />{t('marketing.campaignTitle')}</CardTitle>
            <CardDescription>{t('marketing.text')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!userId || consent.isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-label={t('marketing.loading')} />
            : consent.isError ? (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <span>{t('marketing.loadError')}</span>
                <Button size="sm" variant="outline" onClick={() => consent.refetch()}>{t('marketing.retry')}</Button>
              </div>
            ) : (<>
              <p className="text-sm" role="status"><span className="font-medium">{t('marketing.statusLabel')}:</span> {t('marketing.state.' + state)}</p>
              {!consent.data!.verified && !on && <p className="text-sm text-muted-foreground">{t('marketing.unverified')}</p>}
              {!on && !collectionOpen && <p className="text-sm text-muted-foreground">{t('marketing.collectionPaused')}</p>}
              {consent.data!.blocked && <p className="text-sm text-muted-foreground">{t('marketing.blockedNote')}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                {on
                  ? <Button variant="outline" disabled={change.isPending} onClick={() => change.mutate({ action: 'withdraw', expected: 'granted' })}>{t('marketing.withdrawButton')}</Button>
                  : <Button disabled={change.isPending || !consent.data!.verified || !collectionOpen} onClick={() => change.mutate({ action: 'grant', expected: state! })}>{t('marketing.optInButton')}</Button>}
                {state === 'pending' && <Button variant="outline" disabled={change.isPending} onClick={() => change.mutate({ action: 'withdraw', expected: 'pending' })}>{t('marketing.cancelPending')}</Button>}
              </div>
              {change.isPending && <p className="text-sm text-muted-foreground" role="status">{t('marketing.saving')}</p>}
              {withdrawnOk && <p role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{t('marketing.withdrawnOk')}</p>}
              {grantedOk && <p role="status" className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{t('marketing.savedOn')}</p>}
              {change.data?.status === 'conflict' && <p role="alert" className="text-sm">{t('marketing.conflict')}</p>}
              {change.data?.status === 'collection_paused' && <p role="alert" className="text-sm">{t('marketing.collectionPaused')}</p>}
              {change.isError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <span>{failedOff ? t('marketing.stillOn') : t('marketing.saveError')}</span>
                  <Button size="sm" variant="outline" onClick={() => change.mutate(change.variables!)}>{t('marketing.retry')}</Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t('marketing.serviceNote')}</p>
            </>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" aria-hidden />{t('marketing.rightsTitle')}</CardTitle>
            <CardDescription>{t('marketing.rightsBody')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); submit.mutate(); }}>
              <div className="space-y-1.5">
                <Label htmlFor="privacy-kind">{t('marketing.requestType')}</Label>
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger id="privacy-kind"><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map(k => <SelectItem key={k} value={k}>{t('marketing.kind.' + k)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="privacy-details">{t('marketing.requestDetails')}</Label>
                <Textarea id="privacy-details" maxLength={2000} value={details} onChange={e => setDetails(e.target.value)} />
              </div>
              <Button type="submit" disabled={submit.isPending || !userId}>{t('marketing.requestSubmit')}</Button>
              {submit.isSuccess && <p role="status" className="text-sm">{t('marketing.requestSent')}</p>}
              {submit.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <span>{t('marketing.requestError')}</span><Button size="sm" variant="outline" type="submit">{t('marketing.retry')}</Button></div>}
            </form>
            {requests.isError ? <Button size="sm" variant="outline" onClick={() => requests.refetch()}>{t('marketing.retry')}</Button>
              : !!requests.data?.length && <ul className="divide-y rounded-lg border text-sm">
                {requests.data.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span>{t('marketing.kind.' + r.kind)} · {date(r.received_at)}</span>
                  <span className="flex items-center gap-2"><Badge variant="outline">{t('marketing.requestStatus.' + r.status)}</Badge>
                    <span className="text-xs text-muted-foreground">{r.responded_at ? date(r.responded_at) : t('marketing.dueBy', { date: date(r.due_at) })}</span></span>
                </li>)}
              </ul>}
            <p className="text-xs text-muted-foreground">{t('marketing.noAccessNote')} <Link to="/privacy" className="text-primary underline">{t('legal.privacyPolicy')}</Link></p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
