import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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

  // Update status mutation via edge function for server-side validation
  const updateStatus = useMutation({
    mutationFn: async ({ newStatus, notes }: { newStatus: string; notes: string }) => {
      // Map status to action
      const actionMap: Record<string, string> = {
        clean: 'clear_signals',
        warning: 'set_warning',
        soft_blocked: 'soft_block',
      };
      
      const { data, error } = await supabase.functions.invoke('admin-fraud-action', {
        body: {
          action: actionMap[newStatus] || newStatus,
          targetUserId: userId,
          notes,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-status-admin', userId] });
      queryClient.invalidateQueries({ queryKey: ['fraud-signals-admin', userId] });
      queryClient.invalidateQueries({ queryKey: ['fraud-cases'] });
      toast.success(t('admin.fraudReview.statusUpdated'));
    },
    onError: (error) => {
      toast.error(t('admin.fraudReview.updateFailed') + ': ' + error.message);
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">{t('admin.fraudReview.severity.critical')}</Badge>;
      case 'high':
        return <Badge variant="destructive" className="bg-red-500/80">{t('admin.fraudReview.severity.high')}</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500">{t('admin.fraudReview.severity.medium')}</Badge>;
      case 'low':
        return <Badge variant="outline">{t('admin.fraudReview.severity.low')}</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('admin.fraudReview.loadingDetails')}
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
          {t('admin.fraudReview.backToCases')}
        </Button>
        <h2 className="text-lg font-semibold">{t('admin.fraudReview.caseReview')}</h2>
      </div>

      {/* User Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('admin.fraudReview.userDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{t('admin.fraudReview.userId')}</div>
            <div className="font-mono text-xs">{userId}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('admin.fraudReview.status')}</div>
            <div className="mt-1">
              {fraudStatus?.status === 'soft_blocked' ? (
                <Badge variant="destructive">{t('admin.fraudReview.statuses.softBlocked')}</Badge>
              ) : fraudStatus?.status === 'warning' ? (
                <Badge className="bg-yellow-500/20 text-yellow-500">{t('admin.fraudReview.statuses.warning')}</Badge>
              ) : (
                <Badge variant="outline" className="text-green-500">{t('admin.fraudReview.statuses.clean')}</Badge>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('admin.fraudReview.fraudScore')}</div>
            <div className={`text-2xl font-bold ${
              (fraudStatus?.fraud_score || 0) >= 70 ? 'text-red-500' :
              (fraudStatus?.fraud_score || 0) >= 40 ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              {fraudStatus?.fraud_score || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t('admin.fraudReview.totalSignals')}</div>
            <div className="text-2xl font-bold">{fraudStatus?.signals_count || 0}</div>
          </div>
        </CardContent>
      </Card>

      {/* Player Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            {t('admin.fraudReview.playerTags')} ({playerProfiles?.length || 0})
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
            <div className="text-muted-foreground">{t('admin.fraudReview.noPlayerTags')}</div>
          )}
        </CardContent>
      </Card>

      {/* Device Fingerprints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            {t('admin.fraudReview.deviceFingerprints')} ({fingerprints?.length || 0})
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
                    {t('admin.fraudReview.lastSeen')}: {formatDistanceToNow(new Date(fp.last_seen_at), { addSuffix: true })}
                    {' • '}{t('admin.fraudReview.seenTimes', { count: fp.seen_count })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">{t('admin.fraudReview.noFingerprints')}</div>
          )}
        </CardContent>
      </Card>

      {/* Fraud Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('admin.fraudReview.fraudSignals')}
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
            <div className="text-muted-foreground">{t('admin.fraudReview.noSignals')}</div>
          )}
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.fraudReview.adminActions')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={t('admin.fraudReview.reviewNotesPlaceholder')}
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
              {t('admin.fraudReview.actions.clearMarkClean')}
            </Button>
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate({ newStatus: 'warning', notes: reviewNotes })}
              disabled={updateStatus.isPending}
              className="text-yellow-500"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {t('admin.fraudReview.actions.setWarning')}
            </Button>
            <Button
              variant="outline"
              onClick={() => updateStatus.mutate({ newStatus: 'soft_blocked', notes: reviewNotes })}
              disabled={updateStatus.isPending}
              className="text-red-500"
            >
              <Shield className="h-4 w-4 mr-2" />
              {t('admin.fraudReview.actions.softBlock')}
            </Button>
          </div>

          {fraudStatus?.reviewed_at && (
            <div className="text-sm text-muted-foreground mt-4 p-3 rounded-lg bg-muted/50">
              <div>{t('admin.fraudReview.lastReviewed')}: {format(new Date(fraudStatus.reviewed_at), 'MMM d, yyyy HH:mm')}</div>
              {fraudStatus.review_notes && (
                <div className="mt-1">{t('admin.fraudReview.notes')}: {fraudStatus.review_notes}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
