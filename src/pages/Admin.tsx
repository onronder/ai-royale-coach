import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle, Search, LayoutDashboard, Activity, Users, Webhook, Gift, FlaskConical } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { FraudOverviewDashboard } from '@/components/admin/FraudOverviewDashboard';
import { FraudCasesList } from '@/components/admin/FraudCasesList';
import { UserLookup } from '@/components/admin/UserLookup';
import { ApiMetricsDashboard } from '@/components/admin/ApiMetricsDashboard';
import { BlockedUsersPanel } from '@/components/admin/BlockedUsersPanel';
import { WebhookEventsPanel } from '@/components/admin/WebhookEventsPanel';
import { WinbackCampaignPanel } from '@/components/admin/WinbackCampaignPanel';
import { TrialAnalyticsPanel } from '@/components/admin/TrialAnalyticsPanel';
import { Navbar } from '@/components/layout/Navbar';

/**
 * Admin dashboard for fraud review and user management.
 * Only accessible to users with admin roles.
 */
export default function Admin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8 [&>button]:min-h-11 [&>button]:whitespace-normal [&>button]:text-center [&_svg]:shrink-0">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              {t('dashboard.subtabs.overview')}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('admin.navigation.users')}
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {t('admin.fraudCases.title')}
            </TabsTrigger>
            <TabsTrigger value="lookup" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              {t('admin.userLookup.title')}
            </TabsTrigger>
            <TabsTrigger value="trials" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              {t('admin.navigation.trials')}
            </TabsTrigger>
            <TabsTrigger value="winback" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              {t('admin.navigation.winback')}
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              {t('admin.navigation.webhooks')}
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t('admin.apiMetrics.title')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FraudOverviewDashboard />
          </TabsContent>

          <TabsContent value="users">
            <BlockedUsersPanel />
          </TabsContent>

          <TabsContent value="cases">
            <FraudCasesList />
          </TabsContent>

          <TabsContent value="lookup">
            <UserLookup />
          </TabsContent>

          <TabsContent value="trials">
            <TrialAnalyticsPanel />
          </TabsContent>

          <TabsContent value="winback">
            <WinbackCampaignPanel />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhookEventsPanel />
          </TabsContent>

          <TabsContent value="metrics">
            <ApiMetricsDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
