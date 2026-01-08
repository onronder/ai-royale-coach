import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

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
 * Uses proper auth state listener to prevent session issues.
 */
export function useAdminAccess() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setSessionLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = user?.id;

  const { data: adminRoles, isLoading: rolesLoading } = useQuery({
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
  const isLoading = sessionLoading || (!!userId && rolesLoading);

  return {
    isAdmin: roles.some(r => r.role === 'admin'),
    isModerator: roles.some(r => r.role === 'moderator' || r.role === 'admin'),
    isSupport: roles.length > 0,
    roles,
    isLoading,
    userId,
    user,
    session,
    isAuthenticated: !!session,
  };
}
