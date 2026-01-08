import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, AlertTriangle, Search, LayoutDashboard } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { FraudOverviewDashboard } from '@/components/admin/FraudOverviewDashboard';
import { FraudCasesList } from '@/components/admin/FraudCasesList';
import { UserLookup } from '@/components/admin/UserLookup';
import { Navbar } from '@/components/layout/Navbar';

/**
 * Admin dashboard for fraud review and user management.
 * Only accessible to users with admin roles.
 */
export default function Admin() {
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
              Checking admin access...
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
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Fraud detection and user management
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Fraud Cases
            </TabsTrigger>
            <TabsTrigger value="lookup" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              User Lookup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FraudOverviewDashboard />
          </TabsContent>

          <TabsContent value="cases">
            <FraudCasesList />
          </TabsContent>

          <TabsContent value="lookup">
            <UserLookup />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
