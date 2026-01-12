import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable, ResponsiveTableSkeleton, ColumnDef } from '@/components/ui/responsive-table';
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
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
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

interface EligibleUser {
  id: string;
  email: string;
  preferred_language: string | null;
  trial_ends_at: string | null;
  trial_used: boolean | null;
  winback_email_sent_at: string | null;
}

interface CampaignHistory {
  id: string;
  target_email: string;
  promo_code: string;
  discount_percent: number;
  sent_at: string;
  polar_discount_id: string | null;
}

/**
 * Admin panel for sending win-back promotional emails to users who cancelled their trial.
 * Allows admins to configure promo codes with Polar discount IDs for automatic checkout application.
 */
export function WinbackCampaignPanel() {
  const queryClient = useQueryClient();
  const [promoCode, setPromoCode] = useState('');
  const [polarDiscountId, setPolarDiscountId] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(20);
  const [sendingToAll, setSendingToAll] = useState(false);
  const [confirmBulkSend, setConfirmBulkSend] = useState(false);

  // Fetch eligible users (cancelled/expired trials)
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

      return (profiles || []).filter(p => !activeUserIds.has(p.id)) as EligibleUser[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch campaign history
  const { data: campaignHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['winback-campaign-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('winback_campaigns')
        .select('id, target_email, promo_code, discount_percent, sent_at, polar_discount_id')
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
        throw new Error('Promo code is required');
      }
      if (!polarDiscountId.trim()) {
        throw new Error('Polar Discount ID is required');
      }
      if (!isValidUUID(polarDiscountId.trim())) {
        throw new Error('Polar Discount ID must be a valid UUID');
      }
      if (discountPercent < 1 || discountPercent > 100) {
        throw new Error('Discount must be between 1 and 100');
      }

      // Send the email
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          email: user.email,
          type: 'winback_promo',
          language: user.preferred_language || 'en',
          promoCode: promoCode.toUpperCase(),
          discountPercent,
        },
      });

      if (emailError) throw emailError;

      // Update the profile to mark email as sent
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ winback_email_sent_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Log the campaign with polar_discount_id
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      
      const { error: logError } = await supabase
        .from('winback_campaigns')
        .insert({
          admin_user_id: adminUser?.id,
          target_user_id: user.id,
          target_email: user.email,
          promo_code: promoCode.toUpperCase(),
          discount_percent: discountPercent,
          polar_discount_id: polarDiscountId.trim() || null,
        });

      if (logError) console.error('Error logging campaign:', logError);

      return user;
    },
    onSuccess: (user) => {
      toast.success(`Email sent to ${user.email}`);
      queryClient.invalidateQueries({ queryKey: ['winback-eligible-users'] });
      queryClient.invalidateQueries({ queryKey: ['winback-campaign-history'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to send email: ${error.message}`);
    },
  });

  // Bulk send emails
  const handleBulkSend = async () => {
    if (!eligibleUsers?.length) return;
    
    setSendingToAll(true);
    setConfirmBulkSend(false);
    
    // Filter users who haven't received email in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const usersToEmail = eligibleUsers.filter(user => {
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
      toast.success(`Sent ${successCount} emails${failCount > 0 ? `, ${failCount} failed` : ''}`);
    } else if (failCount > 0) {
      toast.error(`Failed to send ${failCount} emails`);
    }
  };

  // Check if user can receive email (not sent in last 30 days)
  const canSendToUser = (user: EligibleUser) => {
    if (!user.winback_email_sent_at) return true;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(user.winback_email_sent_at) < thirtyDaysAgo;
  };

  // Count eligible users who can receive email
  const eligibleToSendCount = eligibleUsers?.filter(canSendToUser).length || 0;

  // Check if configuration is complete
  const isConfigValid = promoCode.trim() && 
    polarDiscountId.trim() && 
    isValidUUID(polarDiscountId.trim()) && 
    discountPercent >= 1 && 
    discountPercent <= 100;

  // User columns
  const userColumns: ColumnDef<EligibleUser>[] = [
    {
      key: 'email',
      header: 'Email',
      mobilePrimary: true,
      render: (user) => (
        <span className="font-mono text-sm">{user.email}</span>
      ),
    },
    {
      key: 'language',
      header: 'Language',
      mobileHidden: true,
      render: (user) => (
        <Badge variant="outline" className="uppercase">
          {user.preferred_language || 'en'}
        </Badge>
      ),
    },
    {
      key: 'trial_ended',
      header: 'Trial Ended',
      mobileSecondary: true,
      render: (user) => (
        user.trial_ends_at ? (
          <span className="text-muted-foreground text-sm">
            {formatDistanceToNow(new Date(user.trial_ends_at), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">N/A</span>
        )
      ),
    },
    {
      key: 'last_sent',
      header: 'Last Email Sent',
      render: (user) => (
        user.winback_email_sent_at ? (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(user.winback_email_sent_at), { addSuffix: true })}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Never</span>
        )
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      isAction: true,
      render: (user) => (
        <Button
          size="sm"
          variant={canSendToUser(user) ? 'default' : 'outline'}
          disabled={!isConfigValid || sendEmailMutation.isPending || !canSendToUser(user)}
          onClick={() => sendEmailMutation.mutate(user)}
        >
          <Send className="h-4 w-4 mr-1" />
          {sendEmailMutation.isPending ? 'Sending...' : 'Send'}
        </Button>
      ),
    },
  ];

  // History columns
  const historyColumns: ColumnDef<CampaignHistory>[] = [
    {
      key: 'sent_at',
      header: 'Date',
      mobilePrimary: true,
      render: (item) => (
        <span className="text-sm">
          {format(new Date(item.sent_at), 'MMM d, yyyy HH:mm')}
        </span>
      ),
    },
    {
      key: 'target_email',
      header: 'Recipient',
      mobileSecondary: true,
      render: (item) => (
        <span className="font-mono text-sm">{item.target_email}</span>
      ),
    },
    {
      key: 'promo_code',
      header: 'Promo Code',
      render: (item) => (
        <Badge variant="secondary" className="font-mono">
          {item.promo_code}
        </Badge>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (item) => (
        <span className="text-green-600 font-medium">{item.discount_percent}% off</span>
      ),
    },
    {
      key: 'auto_apply',
      header: 'Auto-Apply',
      render: (item) => (
        item.polar_discount_id ? (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Yes
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Manual
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
              Campaign Configuration
            </CardTitle>
            <CardDescription>
              Configure the promo code and discount for win-back emails.
              Create promo codes in{' '}
              <a 
                href="https://polar.sh/settings/discounts" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Polar Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="promo-code">Promo Code</Label>
                <Input
                  id="promo-code"
                  placeholder="e.g., COMEBACK20"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the exact code you created in Polar
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="polar-discount-id">Polar Discount ID</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>The UUID from Polar Dashboard → Discounts → Click on discount → Copy the ID from the URL or details panel</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="polar-discount-id"
                  placeholder="e.g., 12345678-abcd-1234-efgh-123456789abc"
                  value={polarDiscountId}
                  onChange={(e) => setPolarDiscountId(e.target.value.trim())}
                  className={`font-mono ${polarDiscountId && !isValidUUID(polarDiscountId) ? 'border-destructive' : ''}`}
                />
                <p className="text-xs text-muted-foreground">
                  Required for automatic checkout discount
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount Percentage</Label>
                <Input
                  id="discount"
                  type="number"
                  min={1}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown in the email (must match Polar)
                </p>
              </div>
            </div>

            {!isConfigValid && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {!promoCode.trim() 
                  ? 'Enter a promo code to enable sending emails'
                  : !polarDiscountId.trim()
                  ? 'Enter the Polar Discount ID (UUID) for automatic checkout application'
                  : !isValidUUID(polarDiscountId.trim())
                  ? 'Polar Discount ID must be a valid UUID format (e.g., 12345678-abcd-1234-efgh-123456789abc)'
                  : 'Discount must be between 1 and 100'}
              </div>
            )}

            {isConfigValid && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                Configuration complete! Discount will be automatically applied at checkout when users click the email CTA.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eligible Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Eligible Users
                </CardTitle>
                <CardDescription>
                  Users who cancelled their trial and can receive a win-back email
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 inline mr-1" />
                  {eligibleToSendCount} can receive email
                </div>
                <Button
                  variant="default"
                  disabled={!isConfigValid || eligibleToSendCount === 0 || sendingToAll}
                  onClick={() => setConfirmBulkSend(true)}
                >
                  {sendingToAll ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to All ({eligibleToSendCount})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <ResponsiveTableSkeleton columns={5} rows={5} />
            ) : (
              <ResponsiveTable
                data={eligibleUsers || []}
                columns={userColumns}
                keyExtractor={(user) => user.id}
                emptyState={
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No eligible users found</p>
                    <p className="text-sm">Users will appear here after their trial ends</p>
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
              Campaign History
            </CardTitle>
            <CardDescription>
              Recent win-back emails sent by admins
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <ResponsiveTableSkeleton columns={5} rows={5} />
            ) : (
              <ResponsiveTable
                data={campaignHistory || []}
                columns={historyColumns}
                keyExtractor={(item) => item.id}
                emptyState={
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No campaigns sent yet</p>
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
              <AlertDialogTitle>Send to all eligible users?</AlertDialogTitle>
              <AlertDialogDescription>
                This will send a win-back email with promo code <strong>{promoCode}</strong> ({discountPercent}% off) to{' '}
                <strong>{eligibleToSendCount}</strong> users who haven't received an email in the last 30 days.
                <br /><br />
                <span className="text-emerald-600 dark:text-emerald-400">
                  ✓ Discount will be automatically applied at checkout
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkSend}>
                Send Emails
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
