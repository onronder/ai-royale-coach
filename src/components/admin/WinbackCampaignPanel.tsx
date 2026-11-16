import { getDateLocale } from '@/i18n/dateLocale';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ResponsiveTable, ResponsiveTableSkeleton, ColumnDef } from '@/components/ui/responsive-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Gift, 
  Send, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Mail,
  Clock,
  History,
  HelpCircle,
  Activity,
  TrendingUp,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ActivityMetrics {
  activity_score: number;
  ai_requests: number;
  ai_active_days: number;
  chat_messages: number;
  battles_tracked: number;
  linked_accounts: number;
  is_active: boolean;
}

interface EligibleUser {
  id: string;
  email: string;
  preferred_language: string | null;
  trial_ends_at: string | null;
  trial_used: boolean | null;
  winback_email_sent_at: string | null;
  // Activity metrics
  activity_score: number;
  ai_requests: number;
  ai_active_days: number;
  chat_messages: number;
  battles_tracked: number;
  linked_accounts: number;
  is_active: boolean;
}

interface CampaignHistory {
  id: string;
  target_email: string;
  promo_code: string;
  discount_percent: number;
  sent_at: string;
  polar_discount_id: string | null;
  target_user_activity_score: number | null;
  target_user_ai_requests: number | null;
  target_user_chat_messages: number | null;
  target_user_battles_tracked: number | null;
  target_user_linked_accounts: number | null;
  target_user_active_days: number | null;
}

type SortOption = 'activity_score' | 'ai_requests' | 'battles_tracked' | 'chat_messages' | 'linked_accounts' | 'ai_active_days';

// Activity badge based on score
const getActivityBadge = (score: number) => {
  if (score >= 70) return { label: 'admin.winback.high', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', icon: TrendingUp };
  if (score >= 40) return { label: 'admin.blocked.active', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30', icon: Activity };
  if (score > 0) return { label: 'admin.winback.low', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: Activity };
  return { label: 'admin.winback.noActivity', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: AlertCircle };
};

// Calculate individual point contributions based on the rebalanced formula
const calculatePointBreakdown = (metrics: {
  ai_requests?: number;
  chat_messages?: number;
  battles_tracked?: number;
  linked_accounts?: number;
  ai_active_days?: number;
  target_user_ai_requests?: number | null;
  target_user_chat_messages?: number | null;
  target_user_battles_tracked?: number | null;
  target_user_linked_accounts?: number | null;
  target_user_active_days?: number | null;
}) => {
  // Handle both EligibleUser and CampaignHistory data shapes
  const aiRequests = 'ai_requests' in metrics ? metrics.ai_requests || 0 : metrics.target_user_ai_requests || 0;
  const chatMessages = 'chat_messages' in metrics ? metrics.chat_messages || 0 : metrics.target_user_chat_messages || 0;
  const battlesTracked = 'battles_tracked' in metrics ? metrics.battles_tracked || 0 : metrics.target_user_battles_tracked || 0;
  const linkedAccounts = 'linked_accounts' in metrics ? metrics.linked_accounts || 0 : metrics.target_user_linked_accounts || 0;
  const activeDays = 'ai_active_days' in metrics ? metrics.ai_active_days || 0 : metrics.target_user_active_days || 0;

  return {
    aiPoints: Math.floor(Math.min(aiRequests, 20) * 1.5),       // max 30
    chatPoints: Math.min(chatMessages, 15) * 1,                  // max 15
    battlePoints: Math.min(Math.floor(battlesTracked / 10), 25), // max 25
    accountPoints: Math.min(linkedAccounts, 3) * 5,              // max 15
    dayPoints: Math.min(activeDays, 5) * 3,                      // max 15
    raw: { aiRequests, chatMessages, battlesTracked, linkedAccounts, activeDays }
  };
};

/**
 * Admin panel for sending win-back promotional emails to users who cancelled their trial.
 * Allows admins to configure promo codes with Polar discount IDs for automatic checkout application.
 * Shows real user activity metrics to help target engaged users.
 */
export function WinbackCampaignPanel() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [promoCode, setPromoCode] = useState('');
  const [polarDiscountId, setPolarDiscountId] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(20);
  const [sendingToAll, setSendingToAll] = useState(false);
  const [confirmBulkSend, setConfirmBulkSend] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('activity_score');

  // Fetch eligible users with activity metrics
  const { data: eligibleUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['winback-eligible-users'],
    queryFn: async () => {
      // Get users who:
      // 1. Have trial_used = true (trial ended)
      // 2. Don't have an active subscription
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, preferred_language, trial_ends_at, trial_used, winback_email_sent_at')
        .eq('trial_used', true)
        .not('email', 'is', null);

      if (error) throw error;

      // Filter out users with active subscriptions
      const { data: activeSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .in('status', ['active', 'trialing']);

      const activeUserIds = new Set(activeSubscriptions?.map(s => s.user_id) || []);
      const eligibleProfiles = (profiles || []).filter(p => !activeUserIds.has(p.id));

      // Fetch activity metrics for each user using RPC
      const usersWithActivity = await Promise.all(
        eligibleProfiles.map(async (profile) => {
          const { data: metrics } = await supabase.rpc('get_user_activity_metrics', {
            p_user_id: profile.id
          });
          
          const activityMetrics = metrics as unknown as ActivityMetrics | null;
          
          return {
            ...profile,
            activity_score: activityMetrics?.activity_score || 0,
            ai_requests: activityMetrics?.ai_requests || 0,
            ai_active_days: activityMetrics?.ai_active_days || 0,
            chat_messages: activityMetrics?.chat_messages || 0,
            battles_tracked: activityMetrics?.battles_tracked || 0,
            linked_accounts: activityMetrics?.linked_accounts || 0,
            is_active: activityMetrics?.is_active || false,
          } as EligibleUser;
        })
      );

      // Sort by activity score descending (most active first)
      return usersWithActivity.sort((a, b) => b.activity_score - a.activity_score);
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Filter and sort users based on activity toggle and sort option
  const displayedUsers = eligibleUsers
    ?.filter(user => !showActiveOnly || user.is_active)
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0)) || [];

  // Count active users
  const activeUsersCount = eligibleUsers?.filter(u => u.is_active).length || 0;

  // Fetch campaign history
  const { data: campaignHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['winback-campaign-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winback_campaigns')
        .select('id, target_email, promo_code, discount_percent, sent_at, polar_discount_id, target_user_activity_score, target_user_ai_requests, target_user_chat_messages, target_user_battles_tracked, target_user_linked_accounts, target_user_active_days')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as CampaignHistory[];
    },
    staleTime: 30 * 1000,
  });

  // Validate UUID format (supports UUID v1-v5 and v7)
  const isValidUUID = (str: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Send single email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (user: EligibleUser) => {
      if (!promoCode.trim()) {
        throw new Error(t('admin.winback.needCode'));
      }
      if (!polarDiscountId.trim()) {
        throw new Error(t('admin.winback.needId'));
      }
      if (!isValidUUID(polarDiscountId.trim())) {
        throw new Error(t('admin.winback.invalidId'));
      }
      if (discountPercent < 1 || discountPercent > 100) {
        throw new Error(t('admin.winback.invalidPercent'));
      }

      // The server checks admin rights, current consent, blocks and the campaign switch, logs the campaign, and sends at most once.
      const { data, error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'winback_promo',
          userId: user.id,
          promoCode: promoCode.toUpperCase(),
          discountPercent,
          polarDiscountId: polarDiscountId.trim(),
        },
      });
      if (emailError) throw emailError;
      const result = data as { status: 'sent' | 'blocked' | 'uncertain'; reason?: string };
      // Only a confirmed provider acceptance counts as sent.
      if (result?.status !== 'sent') throw new Error(result?.status === 'blocked' ? t('marketing.reason.' + (result.reason ?? 'unknown'), { defaultValue: result.reason }) : result?.status === 'uncertain' ? t('marketing.uncertainResult') : t('marketing.saveError'));
      return user;
    },
    onSuccess: (user) => {
      toast.success(t('admin.winback.sentOne', { email: user.email }));
      queryClient.invalidateQueries({ queryKey: ['winback-eligible-users'] });
      queryClient.invalidateQueries({ queryKey: ['winback-campaign-history'] });
    },
    onError: (error: Error) => {
      toast.error(t('admin.winback.failedOne', { error: error.message }));
    },
  });

  // Bulk send emails
  const handleBulkSend = async () => {
    if (!displayedUsers?.length) return;
    
    setSendingToAll(true);
    setConfirmBulkSend(false);
    
    // Filter users who haven't received email in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const usersToEmail = displayedUsers.filter(user => {
      if (!user.winback_email_sent_at) return true;
      return new Date(user.winback_email_sent_at) < thirtyDaysAgo;
    });

    let successCount = 0;
    let failCount = 0;

    for (const user of usersToEmail) {
      try {
        await sendEmailMutation.mutateAsync(user);
        successCount++;
      } catch {
        failCount++;
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setSendingToAll(false);
    
    if (successCount > 0) {
      toast.success(t('admin.winback.sentSummary', { sent: successCount, failed: failCount }));
    } else if (failCount > 0) {
      toast.error(t('admin.winback.sentSummary', { sent: 0, failed: failCount }));
    }
  };

  // Check if user can receive email (not sent in last 30 days)
  const canSendToUser = (user: EligibleUser) => {
    if (!user.winback_email_sent_at) return true;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(user.winback_email_sent_at) < thirtyDaysAgo;
  };

  // Count eligible users who can receive email (based on current filter)
  const eligibleToSendCount = displayedUsers?.filter(canSendToUser).length || 0;

  // Check if configuration is complete
  const isConfigValid = promoCode.trim() && 
    polarDiscountId.trim() && 
    isValidUUID(polarDiscountId.trim()) && 
    discountPercent >= 1 && 
    discountPercent <= 100;

  // User columns with activity
  const userColumns: ColumnDef<EligibleUser>[] = [
    {
      key: 'email',
      header: t('auth.email'),
      mobilePrimary: true,
      render: (user) => (
        <span className="font-mono text-sm">{user.email}</span>
      ),
    },
    {
      key: 'activity',
      header: t('admin.winback.activityScore'),
      className: 'min-w-[160px] text-center',
      render: (user) => {
        const badge = getActivityBadge(user.activity_score);
        const Icon = badge.icon;
        const breakdown = calculatePointBreakdown(user);
        return (
          <div className="flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`${badge.color} cursor-help whitespace-nowrap`}>
                  <Icon className="h-3 w-3 mr-1" />
                  {t(badge.label)} ({user.activity_score})
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2 text-xs">
                  <p className="font-medium border-b pb-1 mb-2">{t('admin.winback.breakdown')}</p>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 items-center">
                    <span>🤖 {t('admin.winback.ai')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.aiRequests}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.aiPoints}{t('achievements.pts')}</span>
                    
                    <span>⚔️ {t('admin.winback.battles')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.battlesTracked}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.battlePoints}{t('achievements.pts')}</span>
                    
                    <span>💬 {t('admin.winback.messages')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.chatMessages}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.chatPoints}{t('achievements.pts')}</span>
                    
                    <span>👤 {t('admin.winback.linked')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.linkedAccounts}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.accountPoints}{t('achievements.pts')}</span>
                    
                    <span>📅 {t('admin.winback.days')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.activeDays}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.dayPoints}{t('achievements.pts')}</span>
                  </div>
                  <div className="border-t pt-1 mt-1 flex justify-between font-medium">
                    <span>{t('admin.winback.totalScore')}</span>
                    <span className="text-primary">{user.activity_score}/100</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
    {
      key: 'language',
      header: t('settings.preferences.language'),
      mobileHidden: true,
      render: (user) => (
        <Badge variant="outline" className="uppercase">
          {user.preferred_language || 'en'}
        </Badge>
      ),
    },
    {
      key: 'trial_ended',
      header: t('admin.winback.trialEnded'),
      mobileSecondary: true,
      render: (user) => (
        user.trial_ends_at ? (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(new Date(user.trial_ends_at), { addSuffix: true, locale: getDateLocale(i18n.language) })}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )
      ),
    },
    {
      key: 'last_sent',
      header: t('admin.winback.lastSent'),
      render: (user) => (
        user.winback_email_sent_at ? (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(user.winback_email_sent_at), { addSuffix: true, locale: getDateLocale(i18n.language) })}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">{t('admin.winback.never')}</span>
        )
      ),
    },
    {
      key: 'actions',
      header: t('admin.winback.actions'),
      isAction: true,
      render: (user) => (
        <Button
          size="sm"
          variant={canSendToUser(user) ? 'default' : 'outline'}
          disabled={!isConfigValid || sendEmailMutation.isPending || !canSendToUser(user)}
          onClick={() => sendEmailMutation.mutate(user)}
        >
          <Send className="h-4 w-4 mr-1" />
          {sendEmailMutation.isPending ? t('admin.winback.sending') : t('admin.winback.send')}
        </Button>
      ),
    },
  ];

  // History columns with activity score
  const historyColumns: ColumnDef<CampaignHistory>[] = [
    {
      key: 'sent_at',
      header: t('admin.winback.date'),
      mobilePrimary: true,
      render: (item) => (
        <span className="text-sm">
          {new Date(item.sent_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
      ),
    },
    {
      key: 'target_email',
      header: t('admin.winback.recipient'),
      mobileSecondary: true,
      render: (item) => (
        <span className="font-mono text-sm">{item.target_email}</span>
      ),
    },
    {
      key: 'activity_at_send',
      header: t('admin.trials.activity'),
      className: 'min-w-[80px] text-center',
      render: (item) => {
        const score = item.target_user_activity_score || 0;
        const badge = getActivityBadge(score);
        const breakdown = calculatePointBreakdown(item);
        return (
          <div className="flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`${badge.color} cursor-help`}>
                  {score}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2 text-xs">
                  <p className="font-medium border-b pb-1 mb-2">{t('admin.winback.whenSent')}</p>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 items-center">
                    <span>🤖 {t('admin.winback.ai')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.aiRequests}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.aiPoints}{t('achievements.pts')}</span>
                    
                    <span>⚔️ {t('admin.winback.battles')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.battlesTracked}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.battlePoints}{t('achievements.pts')}</span>
                    
                    <span>💬 {t('admin.winback.messages')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.chatMessages}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.chatPoints}{t('achievements.pts')}</span>
                    
                    <span>👤 {t('admin.winback.linked')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.linkedAccounts}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.accountPoints}{t('achievements.pts')}</span>
                    
                    <span>📅 {t('admin.winback.days')}</span>
                    <span className="text-muted-foreground text-right">{breakdown.raw.activeDays}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400 text-right">+{breakdown.dayPoints}{t('achievements.pts')}</span>
                  </div>
                  <div className="border-t pt-1 mt-1 flex justify-between font-medium">
                    <span>{t('admin.winback.totalScore')}</span>
                    <span className="text-primary">{score}/100</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
    {
      key: 'promo_code',
      header: t('admin.winback.code'),
      render: (item) => (
        <Badge variant="secondary" className="font-mono">
          {item.promo_code}
        </Badge>
      ),
    },
    {
      key: 'discount',
      header: t('admin.winback.discount'),
      render: (item) => (
        <span className="text-green-600 font-medium">{t('admin.winback.off', { percent: item.discount_percent })}</span>
      ),
    },
    {
      key: 'auto_apply',
      header: t('admin.winback.autoApply'),
      render: (item) => (
        item.polar_discount_id ? (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('common.yes')}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {t('admin.winback.manual')}
          </Badge>
        )
      ),
    },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Campaign Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              {t('admin.winback.configuration')}
            </CardTitle>
            <CardDescription>
              {t('admin.winback.setup')}{' '}
              <a 
                href="https://polar.sh/settings/discounts" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                {t('admin.winback.polar')} <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="promo-code">{t('admin.winback.code')}</Label>
                <Input
                  id="promo-code"
                  placeholder="COMEBACK20"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.winback.codeHint')}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="polar-discount-id">{t('admin.winback.discountId')}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{t('admin.winback.idHint')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="polar-discount-id"
                  placeholder="12345678-abcd-1234-efgh-123456789abc"
                  value={polarDiscountId}
                  onChange={(e) => setPolarDiscountId(e.target.value.trim())}
                  className={`font-mono ${polarDiscountId && !isValidUUID(polarDiscountId) ? 'border-destructive' : ''}`}
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.winback.required')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">{t('admin.winback.percent')}</Label>
                <Input
                  id="discount"
                  type="number"
                  min={1}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.winback.shown')}
                </p>
              </div>
            </div>

            {!isConfigValid && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {!promoCode.trim() 
                  ? t('admin.winback.needCode')
                  : !polarDiscountId.trim()
                  ? t('admin.winback.needId')
                  : !isValidUUID(polarDiscountId.trim())
                  ? t('admin.winback.invalidId')
                  : t('admin.winback.invalidPercent')}
              </div>
            )}

            {isConfigValid && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                {t('admin.winback.configured')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eligible Users */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('admin.winback.eligible')}
                </CardTitle>
                <CardDescription>
                  {t('admin.winback.eligibleHint')}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* Sort by dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="sort-by" className="text-sm whitespace-nowrap">{t('admin.winback.sort')}</Label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                    <SelectTrigger id="sort-by" className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activity_score">{t('admin.winback.activityScore')}</SelectItem>
                      <SelectItem value="battles_tracked">{t('admin.winback.battles')}</SelectItem>
                      <SelectItem value="ai_requests">{t('admin.winback.ai')}</SelectItem>
                      <SelectItem value="chat_messages">{t('admin.winback.messages')}</SelectItem>
                      <SelectItem value="linked_accounts">{t('admin.winback.linked')}</SelectItem>
                      <SelectItem value="ai_active_days">{t('admin.winback.days')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Activity filter toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="active-only"
                    checked={showActiveOnly}
                    onCheckedChange={setShowActiveOnly}
                  />
                  <Label htmlFor="active-only" className="text-sm cursor-pointer">
                    {t('admin.winback.activeOnly')}
                  </Label>
                </div>
                
                {/* Stats badges */}
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <Activity className="h-3 w-3 mr-1" />
                    {t('admin.blocked.active')}: {activeUsersCount}
                  </Badge>
                  <Badge variant="outline">
                    {t('admin.blocked.total')}: {eligibleUsers?.length || 0}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 inline mr-1" />
                  {t('admin.winback.canReceive', { count: eligibleToSendCount })}
                </div>
                <Button
                  variant="default"
                  disabled={!isConfigValid || eligibleToSendCount === 0 || sendingToAll}
                  onClick={() => setConfirmBulkSend(true)}
                >
                  {sendingToAll ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      {t('admin.winback.sending')}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t(showActiveOnly ? 'admin.winback.sendActive' : 'admin.winback.sendAll', { count: eligibleToSendCount })}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <ResponsiveTableSkeleton columns={6} rows={5} />
            ) : (
              <ResponsiveTable
                data={displayedUsers}
                columns={userColumns}
                keyExtractor={(user) => user.id}
                emptyState={
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    {showActiveOnly ? (
                      <>
                        <p>{t('admin.winback.noActive')}</p>
                        <p className="text-sm">{t('admin.winback.noActiveHint')}</p>
                      </>
                    ) : (
                      <>
                        <p>{t('admin.winback.noEligible')}</p>
                        <p className="text-sm">{t('admin.winback.noEligibleHint')}</p>
                      </>
                    )}
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Campaign History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('admin.winback.history')}
            </CardTitle>
            <CardDescription>
              {t('admin.winback.historyHint')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <ResponsiveTableSkeleton columns={6} rows={5} />
            ) : (
              <ResponsiveTable
                data={campaignHistory || []}
                columns={historyColumns}
                keyExtractor={(item) => item.id}
                emptyState={
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('admin.winback.emptyHistory')}</p>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Bulk Send Confirmation Dialog */}
        <AlertDialog open={confirmBulkSend} onOpenChange={setConfirmBulkSend}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('admin.winback.confirm', { count: eligibleToSendCount })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.winback.bulkDetails', { count: eligibleToSendCount, code: promoCode, percent: discountPercent })}
                {showActiveOnly && (
                  <>
                    <br /><br />
                    <span className="text-blue-600 dark:text-blue-400">
                      ℹ️ {t('admin.winback.onlyActivity')}
                    </span>
                  </>
                )}
                <br /><br />
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✓ {t('admin.winback.autoDiscount')}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkSend}>
                {t('admin.winback.sendEmails')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
