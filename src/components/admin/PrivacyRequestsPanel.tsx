import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

type Req = { id: string; contact_email: string; kind: string; details: string | null; status: string; assignee: string | null;
  outcome: string | null; received_at: string; due_at: string; responded_at: string | null };
const STATUSES = ['received', 'in_progress', 'completed', 'rejected'];

/** Simple tracker for data-rights requests: received, owner, deadline, outcome and response date. */
export function PrivacyRequestsPanel() {
  const { t, i18n } = useTranslation();
  const q = useQuery({ queryKey: ['admin-privacy-requests'], queryFn: async () => {
    const { data, error } = await supabase.rpc('admin_privacy_requests' as never);
    if (error) throw error;
    return (data ?? []) as unknown as Req[];
  } });
  const [edits, setEdits] = useState<Record<string, Partial<Req>>>({});
  const [failed, setFailed] = useState<string | null>(null);
  const save = async (r: Req) => {
    const e = { ...r, ...edits[r.id] };
    const { error } = await supabase.rpc('admin_update_privacy_request' as never, { p_id: r.id, p_status: e.status, p_assignee: e.assignee ?? '', p_outcome: e.outcome ?? '' } as never);
    setFailed(error ? r.id : null);
    if (!error) q.refetch();
  };
  const d = (v: string | null) => v ? new Date(v).toLocaleDateString(i18n.language) : '—';
  return (
    <Card>
      <CardHeader><CardTitle>{t('marketing.admin.privacyTitle')}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        {q.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : q.isError ? <Button variant="outline" onClick={() => q.refetch()}>{t('marketing.retry')}</Button>
        : !q.data?.length ? <p className="text-sm text-muted-foreground">{t('marketing.admin.privacyEmpty')}</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr>
              {['received', 'type', 'contact', 'due', 'status', 'owner', 'outcome', 'responded', ''].map(h => <th key={h} className="p-2 whitespace-nowrap">{h && t('marketing.admin.col.' + h)}</th>)}
            </tr></thead>
            <tbody>{q.data.map(r => { const e = { ...r, ...edits[r.id] }; const late = !r.responded_at && Date.parse(r.due_at) < Date.now();
              return <tr key={r.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap">{d(r.received_at)}</td>
                <td className="p-2">{t('marketing.kind.' + r.kind)}</td>
                <td className="p-2">{r.contact_email}</td>
                <td className="p-2 whitespace-nowrap">{late ? <Badge variant="destructive">{d(r.due_at)}</Badge> : d(r.due_at)}</td>
                <td className="p-2"><select aria-label={t('marketing.admin.col.status')} className="rounded border bg-background p-1" value={e.status}
                  onChange={ev => setEdits(x => ({ ...x, [r.id]: { ...x[r.id], status: ev.target.value } }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{t('marketing.requestStatus.' + s)}</option>)}</select></td>
                <td className="p-2"><Input aria-label={t('marketing.admin.col.owner')} value={e.assignee ?? ''} onChange={ev => setEdits(x => ({ ...x, [r.id]: { ...x[r.id], assignee: ev.target.value } }))} /></td>
                <td className="p-2"><Input aria-label={t('marketing.admin.col.outcome')} value={e.outcome ?? ''} onChange={ev => setEdits(x => ({ ...x, [r.id]: { ...x[r.id], outcome: ev.target.value } }))} /></td>
                <td className="p-2 whitespace-nowrap">{d(r.responded_at)}</td>
                <td className="p-2"><Button size="sm" onClick={() => save(r)}>{t('marketing.admin.save')}</Button>
                  {failed === r.id && <p role="alert" className="text-xs text-destructive">{t('marketing.saveError')}</p>}</td>
              </tr>; })}</tbody>
          </table>)}
      </CardContent>
    </Card>
  );
}
