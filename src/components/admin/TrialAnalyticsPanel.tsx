import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type Row = {
  user_id: string; email: string | null; status: string; trial_start: string; trial_end: string | null;
  canceled_at: string | null; hours_to_cancel: number | null; linked_tags: number; ai_uses: number;
  chat_messages: number; active_days: number; last_seen: string | null; converted: boolean;
};

function reason(r: Row): string {
  if (r.converted) return 'Paid';
  if (r.hours_to_cancel !== null && r.hours_to_cancel <= 1) return 'Canceled immediately';
  if (r.ai_uses === 0 && r.chat_messages === 0) return 'Never used';
  if (r.ai_uses <= 1 && r.canceled_at) return 'One analysis, then canceled';
  if (r.status === 'trialing') return 'In trial';
  return 'Used but did not pay';
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : '—');

export function TrialAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['trial-funnel', days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trial_funnel' as never, { p_days: days } as never);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const total = data.length;
  const steps = [
    { label: 'Started trial', n: total },
    { label: 'Linked player tag', n: data.filter(r => r.linked_tags > 0).length },
    { label: 'Ran first AI analysis', n: data.filter(r => r.ai_uses > 0).length },
    { label: 'Came back 2+ days', n: data.filter(r => r.active_days >= 2).length },
    { label: 'Converted to paid', n: data.filter(r => r.converted).length },
  ];
  const canceled = data.filter(r => r.hours_to_cancel !== null);
  const within1h = canceled.filter(r => (r.hours_to_cancel ?? 99) <= 1).length;
  const avgCancel = canceled.length ? canceled.reduce((a, r) => a + Number(r.hours_to_cancel), 0) / canceled.length : null;
  const reasons = data.reduce<Record<string, number>>((acc, r) => { const k = reason(r); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[7, 30, 90].map(d => (
          <Button key={d} size="sm" variant={d === days ? 'default' : 'outline'} onClick={() => setDays(d)}>{d} days</Button>
        ))}
      </div>
      {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : error ? (
        <p className="text-destructive">{(error as Error).message}</p>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Trial funnel</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {steps.map(s => (
                <div key={s.label} className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-2xl font-bold">{s.n}</div>
                  <div className="text-xs text-muted-foreground">{total ? Math.round((s.n / total) * 100) : 0}%</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Cancellation timing</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div>Canceled during trial: <b>{canceled.length}</b> / {total}</div>
                <div>Canceled within 1 hour: <b>{within1h}</b></div>
                <div>Average hours to cancel: <b>{avgCancel === null ? '—' : avgCancel.toFixed(1)}</b></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Why they left</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(reasons).map(([k, v]) => <Badge key={k} variant="secondary">{k}: {v}</Badge>)}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Trial users</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>{['Email','Status','Started','Ends','Canceled','Hrs','Tags','AI','Chat','Days','Last seen','Reason'].map(h => <th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {data.map(r => (
                    <tr key={r.user_id + r.trial_start} className="border-t">
                      <td className="p-2">{r.email}</td>
                      <td className="p-2"><Badge variant="outline">{r.status}</Badge></td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.trial_start)}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.trial_end)}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.canceled_at)}</td>
                      <td className="p-2">{r.hours_to_cancel ?? '—'}</td>
                      <td className="p-2">{r.linked_tags}</td>
                      <td className="p-2">{r.ai_uses}</td>
                      <td className="p-2">{r.chat_messages}</td>
                      <td className="p-2">{r.active_days}</td>
                      <td className="p-2 whitespace-nowrap">{fmt(r.last_seen)}</td>
                      <td className="p-2 whitespace-nowrap">{reason(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
