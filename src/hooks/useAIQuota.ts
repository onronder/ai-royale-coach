import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FREE_DAILY_LIMIT = 10;

interface AIUsage {
  id: string;
  user_id: string;
  date: string;
  request_count: number;
}

/**
 * Hook to track and enforce AI request quotas
 * Free tier: 10 AI requests per day
 */
export function useAIQuota() {
  const queryClient = useQueryClient();

  const { data: usage, isLoading } = useQuery({
    queryKey: ['ai-usage', new Date().toISOString().split('T')[0]],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('user_ai_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return data as AIUsage | null;
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const incrementUsage = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Upsert usage record
      const { data, error } = await supabase
        .from('user_ai_usage')
        .upsert(
          {
            user_id: user.id,
            date: today,
            request_count: (usage?.request_count || 0) + 1,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,date',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
    },
  });

  const requestsUsed = usage?.request_count || 0;
  const requestsRemaining = Math.max(0, FREE_DAILY_LIMIT - requestsUsed);
  const hasQuotaRemaining = requestsRemaining > 0;
  const quotaPercentage = Math.min(100, (requestsUsed / FREE_DAILY_LIMIT) * 100);

  return {
    requestsUsed,
    requestsRemaining,
    dailyLimit: FREE_DAILY_LIMIT,
    hasQuotaRemaining,
    quotaPercentage,
    isLoading,
    incrementUsage: incrementUsage.mutateAsync,
    isIncrementing: incrementUsage.isPending,
  };
}

/**
 * Check if user can make an AI request and increment if allowed
 * Returns true if request is allowed, false if quota exceeded
 */
export async function checkAndIncrementAIQuota(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  // Get current usage
  const { data: current } = await supabase
    .from('user_ai_usage')
    .select('request_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const currentCount = current?.request_count || 0;

  if (currentCount >= FREE_DAILY_LIMIT) {
    return false;
  }

  // Increment usage
  await supabase
    .from('user_ai_usage')
    .upsert(
      {
        user_id: userId,
        date: today,
        request_count: currentCount + 1,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,date',
      }
    );

  return true;
}
