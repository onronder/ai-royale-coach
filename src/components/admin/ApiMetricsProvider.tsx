import { useEffect } from 'react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { apiMetrics } from '@/lib/apiMetrics';

/**
 * Provider that enables API metrics logging for admin users.
 * Place this inside the auth-aware portion of the app.
 */
export function ApiMetricsProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin, userId } = useAdminAccess();

  useEffect(() => {
    if (isAdmin && userId) {
      apiMetrics.enable(userId);
      console.log('[ApiMetrics] Enabled for admin user');
    } else {
      apiMetrics.disable();
    }

    return () => {
      apiMetrics.disable();
    };
  }, [isAdmin, userId]);

  return <>{children}</>;
}
