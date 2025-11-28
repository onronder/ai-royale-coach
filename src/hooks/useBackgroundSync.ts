import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to manage background sync operations for card collection, mastery, and deck stats
 */
export function useBackgroundSync(userId: string | null, playerTag: string | undefined) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!userId || !playerTag) return;

    const runBackgroundSync = async () => {
      // Check if card collection is empty
      const { count: collectionCount } = await supabase
        .from('card_collection')
        .select('*', { count: 'exact', head: true })
        .eq('player_tag', playerTag);

      if (collectionCount === 0) {
        console.log('Starting background card collection sync...');
        supabase.functions
          .invoke('sync-card-collection', { body: { playerTag } })
          .then(() => {
            toast.success(t('dashboard.sync.collectionSynced'));
          })
          .catch((err) => {
            console.error('Background sync failed:', err);
          });
      }

      // Check if card mastery is empty
      const { count: masteryCount } = await supabase
        .from('card_mastery')
        .select('*', { count: 'exact', head: true })
        .eq('player_tag', playerTag);

      if (masteryCount === 0) {
        console.log('Starting background card mastery calculation...');
        supabase.functions
          .invoke('calculate-card-mastery', { body: { playerTag } })
          .then(() => {
            toast.success(t('dashboard.sync.masteryCalculated'));
          })
          .catch((err) => {
            console.error('Background card mastery failed:', err);
          });
      }

      // Check if deck stats are empty
      const { count: deckStatsCount } = await supabase
        .from('deck_usage_stats')
        .select('*', { count: 'exact', head: true })
        .eq('player_tag', playerTag);

      if (deckStatsCount === 0) {
        console.log('Starting background deck stats tracking...');
        supabase.functions
          .invoke('track-deck-stats', { body: { playerTag } })
          .then(() => {
            toast.success(t('dashboard.sync.deckStatsTracked'));
          })
          .catch((err) => {
            console.error('Background deck stats failed:', err);
          });
      }
    };

    runBackgroundSync();
  }, [userId, playerTag, t]);
}
