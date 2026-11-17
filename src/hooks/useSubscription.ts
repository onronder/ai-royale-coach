import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionStatus {
  hasAccess: boolean;
  subscription: {
    status: string;
    accountSlots: number;
    currentPeriodEnd: string | null;
    needsAISelection: boolean;
    cancelAtPeriodEnd?: boolean;
    endsAt?: string | null;
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

// Undefined until Supabase has restored the initial session; null is a guest.
export const SubscriptionUserContext = createContext<string | null | undefined>(undefined);

export function useSubscription() {
  const accountId = useContext(SubscriptionUserContext);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription-status', accountId],
    enabled: !!accountId,
    queryFn: async (): Promise<SubscriptionStatus> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== accountId) {
        return defaultStatus;
      }

      const { data, error } = await supabase.functions.invoke('get-subscription-status', {
        headers: { Authorization: 'Bearer ' + session.access_token },
      });
      
      if (error) {
        console.error('Error fetching subscription status:', error);
        return defaultStatus;
      }
      
      return data || defaultStatus;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });


  interface CheckoutParams {
    recovery?: boolean;
    accountSlots?: number;
    successUrl?: string;
    cancelUrl?: string;
    discountId?: string; // Polar discount UUID for pre-applying promo codes
  }

  const createCheckoutMutation = useMutation({
    mutationFn: async ({ accountSlots = 1, successUrl, cancelUrl, discountId, recovery }: CheckoutParams) => {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { accountSlots, successUrl, cancelUrl, discountId, recovery },
      });
      
      if (error) throw error;
      if (recovery && data?.kind !== 'recovery') throw new Error('Billing portal unavailable');
      return data.checkoutUrl;
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (action: 'cancel' | 'resume' = 'cancel') => {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', { body: { action } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
    },
  });

  return {
    status: data,
    isLoading: accountId === undefined || isLoading,
    error,
    refetch,
    hasAccess: data?.hasAccess ?? false,
    isTrialActive: data?.trial?.isActive ?? false,
    trialDaysRemaining: data?.trial?.daysRemaining ?? 0,
    hasUsedTrial: data?.trial?.hasUsedTrial ?? false,
    accountSlots: data?.accountSlots ?? 0,
    subscriptionStatus: data?.subscription?.status ?? null,
    needsAISelection: data?.subscription?.needsAISelection ?? false,
    createCheckout: createCheckoutMutation.mutateAsync,
    isCreatingCheckout: createCheckoutMutation.isPending,
    cancelSubscription: () => cancelSubscriptionMutation.mutateAsync('cancel'),
    resumeSubscription: () => cancelSubscriptionMutation.mutateAsync('resume'),
    cancelAtPeriodEnd: data?.subscription?.cancelAtPeriodEnd ?? false,
    accessEndsAt: data?.subscription?.endsAt ?? data?.subscription?.currentPeriodEnd ?? null,
    isCancelling: cancelSubscriptionMutation.isPending,
  };
}
