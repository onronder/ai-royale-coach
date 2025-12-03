import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionStatus {
  hasAccess: boolean;
  subscription: {
    status: string;
    accountSlots: number;
    currentPeriodEnd: string | null;
    needsAISelection: boolean;
  } | null;
  trial: {
    isActive: boolean;
    daysRemaining: number;
    hasUsedTrial: boolean;
    endsAt: string | null;
  };
  accountSlots: number;
}

const defaultStatus: SubscriptionStatus = {
  hasAccess: false,
  subscription: null,
  trial: { isActive: false, daysRemaining: 0, hasUsedTrial: false, endsAt: null },
  accountSlots: 0,
};

export function useSubscription() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async (): Promise<SubscriptionStatus> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return defaultStatus;
      }

      const { data, error } = await supabase.functions.invoke('get-subscription-status');
      
      if (error) {
        console.error('Error fetching subscription status:', error);
        return defaultStatus;
      }
      
      return data || defaultStatus;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('profiles')
        .update({
          trial_started_at: now.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  interface CheckoutParams {
    accountSlots?: number;
    successUrl?: string;
    cancelUrl?: string;
  }

  const createCheckoutMutation = useMutation({
    mutationFn: async ({ accountSlots = 1, successUrl, cancelUrl }: CheckoutParams) => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { accountSlots, successUrl, cancelUrl },
      });
      
      if (error) throw error;
      return data.checkoutUrl;
    },
  });

  return {
    status: data,
    isLoading,
    error,
    refetch,
    hasAccess: data?.hasAccess ?? false,
    isTrialActive: data?.trial?.isActive ?? false,
    trialDaysRemaining: data?.trial?.daysRemaining ?? 0,
    hasUsedTrial: data?.trial?.hasUsedTrial ?? false,
    accountSlots: data?.accountSlots ?? 0,
    subscriptionStatus: data?.subscription?.status ?? null,
    needsAISelection: data?.subscription?.needsAISelection ?? false,
    startTrial: startTrialMutation.mutateAsync,
    isStartingTrial: startTrialMutation.isPending,
    createCheckout: createCheckoutMutation.mutateAsync,
    isCreatingCheckout: createCheckoutMutation.isPending,
  };
}
