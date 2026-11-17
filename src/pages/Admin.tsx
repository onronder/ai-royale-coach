import { FirstValuePanel } from '@/components/admin/FirstValuePanel';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle, Search, LayoutDashboard, Activity, Users, Webhook, Gift, FlaskConical, Wallet } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { FraudOverviewDashboard } from '@/components/admin/FraudOverviewDashboard';
import { FraudCasesList } from '@/components/admin/FraudCasesList';
import { UserLookup } from '@/components/admin/UserLookup';
import { ApiMetricsDashboard } from '@/components/admin/ApiMetricsDashboard';
import { BlockedUsersPanel } from '@/components/admin/BlockedUsersPanel';
import { WebhookEventsPanel } from '@/components/admin/WebhookEventsPanel';
import { WinbackCampaignPanel } from '@/components/admin/WinbackCampaignPanel';
import { TrialAnalyticsPanel } from '@/components/admin/TrialAnalyticsPanel';
import { RevenueOverviewPanel } from '@/components/admin/RevenueOverviewPanel';
import { UserDirectoryPanel } from '@/components/admin/UserDirectoryPanel';
import { UnstartedAudienceCard } from '@/components/admin/UnstartedAudienceCard';
import { PrivacyRequestsPanel } from '@/components/admin/PrivacyRequestsPanel';
import { MarketingReachCard } from '@/components/admin/MarketingReachCard';
import { Navbar } from '@/components/layout/Navbar';

/**
 * Admin dashboard for fraud review and user management.
 * Only accessible to users with admin roles.
 */
export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [oldSubscriptionsOpen, setOldSubscriptionsOpen] = useState(false);
  const { isAdmin, isModerator, isLoading, isAuthenticated, user } = useAdminAccess();

  useEffect(() => {
    // Redirect to auth if not authenticated
    if (!isLoading && !isAuthenticated) {
      navigate('/auth');
      return;
    }
    
    // Redirect to home if authenticated but not admin/moderator
    if (!isLoading && isAuthenticated && !isAdmin && !isModerator) {
      navigate('/');
    }
  }, [isAdmin, isModerator, isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {t('admin.navigation.checking')}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!isAuthenticated || (!isAdmin && !isModerator)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            {t('admin.navigation.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.navigation.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 [&>button]:min-h-11 [&>button]:whitespace-normal [&>button]:text-center [&_svg]:shrink-0">
            <TabsTrigger value="overview" className="flex items-center gap-2"><LayoutDashboard className="h-4 w-4" />{t('admin.navigation.overview')}</TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2"><Users className="h-4 w-4" />{t('admin.navigation.users')}</TabsTrigger>
            <TabsTrigger value="trials" className="flex items-center gap-2"><FlaskConical className="h-4 w-4" />{t('admin.navigation.trials')}</TabsTrigger>
            {isAdmin && <TabsTrigger value="revenue" className="flex items-center gap-2"><Wallet className="h-4 w-4" />{t('admin.navigation.revenue')}</TabsTrigger>}
            <TabsTrigger value="campaigns" className="flex items-center gap-2"><Gift className="h-4 w-4" />{t('admin.navigation.campaigns')}</TabsTrigger>
            <TabsTrigger value="operations" className="flex items-center gap-2"><Activity className="h-4 w-4" />{t('admin.navigation.operations')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {isAdmin ? <div className="space-y-6"><RevenueOverviewPanel section="overview" adminId={user?.id} /><FirstValuePanel /></div> : <FraudOverviewDashboard />}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {isAdmin ? <UserDirectoryPanel /> : <BlockedUsersPanel />}
            <section aria-labelledby="lookup-heading" className="space-y-3">
              <h2 id="lookup-heading" className="text-lg font-semibold flex items-center gap-2"><Search className="h-5 w-5" />{t('admin.userLookup.title')}</h2>
              <UserLookup />
            </section>
          </TabsContent>

          <TabsContent value="trials" className="space-y-6">
            {isAdmin && <RevenueOverviewPanel section="trials" />}
            <TrialAnalyticsPanel />
          </TabsContent>

          {isAdmin && <TabsContent value="revenue"><RevenueOverviewPanel section="revenue" adminId={user?.id} /></TabsContent>}

          <TabsContent value="campaigns" className="space-y-6">
            {isAdmin && <MarketingReachCard />}
            {isAdmin && <UnstartedAudienceCard />}
            <WinbackCampaignPanel />
          </TabsContent>

          <TabsContent value="operations" className="space-y-8">
            {isAdmin && <details onToggle={e => setOldSubscriptionsOpen(e.currentTarget.open)}>
              <summary className="cursor-pointer text-sm font-medium">{t('admin.revenue.legacySubscriptions')}</summary>
              {oldSubscriptionsOpen && <BlockedUsersPanel />}
            </details>}
            {isAdmin && <FraudOverviewDashboard />}
            <section aria-labelledby="cases-heading" className="space-y-3">
              <h2 id="cases-heading" className="text-lg font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5" />{t('admin.fraudCases.title')}</h2>
              <FraudCasesList />
            </section>
            <PrivacyRequestsPanel />
            <section aria-labelledby="webhooks-heading" className="space-y-3">
              <h2 id="webhooks-heading" className="text-lg font-semibold flex items-center gap-2"><Webhook className="h-5 w-5" />{t('admin.navigation.webhooks')}</h2>
              <WebhookEventsPanel />
            </section>
            <section aria-labelledby="metrics-heading" className="space-y-3">
              <h2 id="metrics-heading" className="text-lg font-semibold flex items-center gap-2"><Activity className="h-5 w-5" />{t('admin.apiMetrics.title')}</h2>
              <ApiMetricsDashboard />
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
