import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AdminRole = 'admin' | 'moderator' | 'support';

export interface AdminRoleRecord {
  id: string;
  user_id: string;
  role: AdminRole;
  granted_by: string | null;
  granted_at: string;
}

/**
 * Hook to check if the current user has admin access.
 */
export function useAdminAccess() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const userId = session?.user?.id;

  const { data: adminRoles, isLoading } = useQuery({
    queryKey: ['admin-roles', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to fetch admin roles:', error);
        return [];
      }

      return data as AdminRoleRecord[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const roles = adminRoles || [];

  return {
    isAdmin: roles.some(r => r.role === 'admin'),
    isModerator: roles.some(r => r.role === 'moderator' || r.role === 'admin'),
    isSupport: roles.length > 0,
    roles,
    isLoading,
    userId,
  };
}
