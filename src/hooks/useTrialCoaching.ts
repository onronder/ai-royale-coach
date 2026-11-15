import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TrialCoachingState {
  subscriptionId: string;
  playerTag: string | null;
  dayTwo: boolean;
  beforeSendCutoff: boolean;
  renewalOff: boolean;
  answered: boolean;
  optedIn: boolean;
  returned: boolean;
  sent: boolean;
}

export function useTrialCoaching(userId: string | undefined, enabled: boolean, renewalOff = false) {
  const client = useQueryClient();
  const key = ['trial-coaching', userId, renewalOff];
  const query = useQuery({
    queryKey: key,
    enabled: !!userId && enabled,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('trial_coaching_state');
      if (error) throw error;
      return data as unknown as TrialCoachingState | null;
    },
  });
  const update = useMutation({
    mutationFn: async ({ action, value }: { action: 'reason' | 'on' | 'off' | 'return'; value?: string }) => {
      const { data, error } = await supabase.rpc('update_trial_coaching', {
        p_subscription: query.data!.subscriptionId, p_action: action, p_value: value,
      });
      if (error) throw error;
      return data as unknown as TrialCoachingState;
    },
    onSuccess: state => {
      client.setQueriesData({ queryKey: ['trial-coaching', userId] }, state);
    },
  });
  return { ...query, update };
}
