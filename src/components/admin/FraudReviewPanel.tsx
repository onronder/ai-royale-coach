import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Fingerprint,
  Clock,
  User,
  Tag
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { FraudSignal, UserFraudStatus } from '@/hooks/useFraudStatus';
import { useAdminAccess } from '@/hooks/useAdminAccess';

interface FraudReviewPanelProps {
  userId: string;
  onClose: () => void;
}

/**
 * Detailed view for reviewing and acting on a fraud case.
 */
export function FraudReviewPanel({ userId, onClose }: FraudReviewPanelProps) {
  const queryClient = useQueryClient();
  const { userId: adminId } = useAdminAccess();
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch fraud status
  const { data: fraudStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['fraud-status-admin', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_fraud_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as UserFraudStatus;
    },
  });

  // Fetch fraud signals
  const { data: signals } = useQuery({
    queryKey: ['fraud-signals-admin', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fraud_signals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as FraudSignal[];
    },
  });

  // Fetch device fingerprints
  const { data: fingerprints } = useQuery({
    queryKey: ['fingerprints-admin', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('device_fingerprints')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch player profiles
  const { data: playerProfiles } = useQuery({
    queryKey: ['player-profiles-admin', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_profiles')
        .select('player_tag, created_at, ai_enabled')
        .eq('user_id', userId);

      if (error) throw error;
      return data;
    },
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ newStatus, notes }: { newStatus: string; notes: string }) => {
      const { error } = await supabase
        .from('user_fraud_status')
        .update({
          status: newStatus,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
          fraud_score: newStatus === 'clean' ? 0 : fraudStatus?.fraud_score,
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        admin_id: adminId,
        action: `set_status_${newStatus}`,
        target_user_id: userId,
        details: { notes, previous_status: fraudStatus?.status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-status-admin', userId] });
      queryClient.invalidateQueries({ queryKey: ['fraud-cases'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-red-500/80">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading case details...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cases
        </Button>
        <h2 className="text-lg font-semibold">Case Review</h2>
      </div>

      {/* User Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">User ID</div>
            <div className="font-mono text-xs">{userId}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="mt-1">
              {fraudStatus?.status === 'soft_blocked' ? (
                <Badge variant="destructive">Soft Blocked</Badge>
              ) : fraudStatus?.status === 'warning' ? (
                <Badge className="bg-yellow-500/20 text-yellow-500">Warning</Badge>
              ) : (
                <Badge variant="outline" className="text-green-500">Clean</Badge>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Fraud Score</div>
            <div className={`text-2xl font-bold ${
              (fraudStatus?.fraud_score || 0) >= 70 ? 'text-red-500' :
              (fraudStatus?.fraud_score || 0) >= 40 ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              {fraudStatus?.fraud_score || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Signals</div>
            <div className="text-2xl font-bold">{fraudStatus?.signals_count || 0}</div>
          </div>
        </CardContent>
      </Card>

      {/* Player Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Player Tags ({playerProfiles?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {playerProfiles?.length ? (
            <div className="flex flex-wrap gap-2">
              {playerProfiles.map((profile) => (
                <Badge key={profile.player_tag} variant="outline">
                  #{profile.player_tag}
                  {profile.ai_enabled && <span className="ml-1 text-green-500">✓ AI</span>}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No player tags linked</div>
          )}
        </CardContent>
      </Card>

      {/* Device Fingerprints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Device Fingerprints ({fingerprints?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fingerprints?.length ? (
            <div className="space-y-2">
              {fingerprints.map((fp) => (
                <div key={fp.id} className="p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="font-mono text-xs">{fp.fingerprint_hash.slice(0, 32)}...</div>
                  <div className="text-muted-foreground mt-1">
                    {fp.user_agent?.slice(0, 60)}...
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last seen: {formatDistanceToNow(new Date(fp.last_seen_at), { addSuffix: true })}
                    {' • '}Seen {fp.seen_count} times
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No fingerprints recorded</div>
          )}
        </CardContent>
      </Card>

      {/* Fraud Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Fraud Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signals?.length ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {signals.map((signal) => (
                <div key={signal.id} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {signal.signal_type.replace('_', ' ')}
                      </span>
                      {getSeverityBadge(signal.severity)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(signal.created_at), 'MMM d, HH:mm')}
                    </div>
                  </div>
                  {signal.details && Object.keys(signal.details).length > 0 && (
                    <pre className="text-xs mt-2 text-muted-foreground overflow-x-auto">
                      {JSON.stringify(signal.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No signals recorded</div>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Review notes (optional)..."
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate({ newStatus: 'clean', notes: reviewNotes })}
              disabled={updateStatus.isPending}
              className="text-green-500"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Clear (Mark Clean)
            </Button>
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate({ newStatus: 'warning', notes: reviewNotes })}
              disabled={updateStatus.isPending}
              className="text-yellow-500"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Set Warning
            </Button>
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate({ newStatus: 'soft_blocked', notes: reviewNotes })}
              disabled={updateStatus.isPending}
              className="text-red-500"
            >
              <Shield className="h-4 w-4 mr-2" />
              Soft Block
            </Button>
          </div>

          {fraudStatus?.reviewed_at && (
            <div className="text-sm text-muted-foreground mt-4 p-3 rounded-lg bg-muted/50">
              <div>Last reviewed: {format(new Date(fraudStatus.reviewed_at), 'MMM d, yyyy HH:mm')}</div>
              {fraudStatus.review_notes && (
                <div className="mt-1">Notes: {fraudStatus.review_notes}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
