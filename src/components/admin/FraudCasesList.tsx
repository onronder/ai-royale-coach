import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsiveTable, ColumnDef } from '@/components/ui/responsive-table';
import { 
  AlertTriangle, 
  Shield, 
  Eye,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { FraudReviewPanel } from './FraudReviewPanel';
import { UserFraudStatus } from '@/hooks/useFraudStatus';
import { formatDistanceToNow } from 'date-fns';

const PAGE_SIZE = 10;

/**
 * List of fraud cases pending review.
 */
export function FraudCasesList() {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['fraud-cases', page, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('user_fraud_status')
        .select('*', { count: 'exact' })
        .order('fraud_score', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      } else {
        query = query.in('status', ['warning', 'soft_blocked']);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Failed to fetch fraud cases:', error);
        return { cases: [], total: 0 };
      }

      return { 
        cases: data as UserFraudStatus[], 
        total: count || 0 
      };
    },
  });

  const cases = data?.cases || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'soft_blocked':
        return <Badge variant="destructive">{t('admin.fraudCases.statuses.softBlocked')}</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">{t('admin.fraudCases.statuses.warning')}</Badge>;
      case 'clean':
        return <Badge variant="outline">{t('admin.fraudCases.statuses.clean')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getScoreDisplay = (score: number) => (
    <span className={
      score >= 70 ? 'text-destructive font-bold' :
      score >= 40 ? 'text-yellow-500' :
      'text-green-500'
    }>
      {score}
    </span>
  );

  const columns: ColumnDef<UserFraudStatus>[] = [
    {
      key: 'user_id',
      header: t('admin.fraudCases.columns.userId'),
      render: (item) => (
        <span className="font-mono text-xs">
          {item.user_id.slice(0, 8)}...
        </span>
      ),
      mobilePrimary: true,
    },
    {
      key: 'status',
      header: t('admin.fraudCases.columns.status'),
      render: (item) => getStatusBadge(item.status),
      mobilePrimary: true,
    },
    {
      key: 'score',
      header: t('admin.fraudCases.columns.score'),
      render: (item) => getScoreDisplay(item.fraud_score),
      mobileSecondary: true,
    },
    {
      key: 'signals',
      header: t('admin.fraudCases.columns.signals'),
      render: (item) => item.signals_count,
      mobileSecondary: true,
    },
    {
      key: 'last_signal',
      header: t('admin.fraudCases.columns.lastSignal'),
      render: (item) => (
        <span className="text-sm text-muted-foreground">
          {item.last_signal_at 
            ? formatDistanceToNow(new Date(item.last_signal_at), { addSuffix: true })
            : '-'}
        </span>
      ),
      mobileHidden: true,
    },
    {
      key: 'reviewed',
      header: t('admin.fraudCases.columns.reviewed'),
      render: (item) => (
        item.reviewed_at ? (
          <Badge variant="outline" className="text-green-500">
            {t('admin.fraudCases.reviewed')}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-yellow-500">
            {t('admin.fraudCases.pending')}
          </Badge>
        )
      ),
      mobileSecondary: true,
    },
    {
      key: 'actions',
      header: '',
      render: (item) => (
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px]"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUserId(item.user_id);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          <span className="md:hidden">{t('admin.fraudCases.review')}</span>
        </Button>
      ),
      isAction: true,
    },
  ];

  if (selectedUserId) {
    return (
      <FraudReviewPanel 
        userId={selectedUserId} 
        onClose={() => {
          setSelectedUserId(null);
          refetch();
        }} 
      />
    );
  }

  const emptyState = (
    <div className="text-center py-8 text-muted-foreground">
      <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
      {t('admin.fraudCases.noCasesPending')}
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {t('admin.fraudCases.title')}
        </CardTitle>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className="min-h-[44px] md:min-h-0"
            onClick={() => setStatusFilter('all')}
          >
            {t('common.all')}
          </Button>
          <Button
            variant={statusFilter === 'soft_blocked' ? 'default' : 'outline'}
            size="sm"
            className="min-h-[44px] md:min-h-0"
            onClick={() => setStatusFilter('soft_blocked')}
          >
            <Shield className="h-4 w-4 mr-1" />
            {t('admin.fraudCases.blocked')}
          </Button>
          <Button
            variant={statusFilter === 'warning' ? 'default' : 'outline'}
            size="sm"
            className="min-h-[44px] md:min-h-0"
            onClick={() => setStatusFilter('warning')}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            {t('admin.fraudCases.warning')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveTable
          data={cases}
          columns={columns}
          keyExtractor={(item) => item.user_id}
          emptyState={emptyState}
          isLoading={isLoading}
          onRowClick={(item) => setSelectedUserId(item.user_id)}
        />

        {/* Pagination */}
        {cases.length > 0 && (
          <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">
              {t('pagination.showing', { 
                start: page * PAGE_SIZE + 1, 
                end: Math.min((page + 1) * PAGE_SIZE, data?.total || 0), 
                total: data?.total || 0 
              })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] md:min-h-0"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] md:min-h-0"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
