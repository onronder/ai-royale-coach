import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
        return <Badge variant="destructive">Soft Blocked</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">Warning</Badge>;
      case 'clean':
        return <Badge variant="outline">Clean</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Fraud Cases
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'soft_blocked' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('soft_blocked')}
          >
            <Shield className="h-4 w-4 mr-1" />
            Blocked
          </Button>
          <Button
            variant={statusFilter === 'warning' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('warning')}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            Warning
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading cases...
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
            No fraud cases pending review
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Signals</TableHead>
                  <TableHead>Last Signal</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((fraudCase) => (
                  <TableRow key={fraudCase.user_id}>
                    <TableCell className="font-mono text-xs">
                      {fraudCase.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{getStatusBadge(fraudCase.status)}</TableCell>
                    <TableCell>
                      <span className={
                        fraudCase.fraud_score >= 70 ? 'text-red-500 font-bold' :
                        fraudCase.fraud_score >= 40 ? 'text-yellow-500' :
                        'text-green-500'
                      }>
                        {fraudCase.fraud_score}
                      </span>
                    </TableCell>
                    <TableCell>{fraudCase.signals_count}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fraudCase.last_signal_at 
                        ? formatDistanceToNow(new Date(fraudCase.last_signal_at), { addSuffix: true })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {fraudCase.reviewed_at ? (
                        <Badge variant="outline" className="text-green-500">
                          Reviewed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-500">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUserId(fraudCase.user_id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, data?.total || 0)} of {data?.total || 0}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
