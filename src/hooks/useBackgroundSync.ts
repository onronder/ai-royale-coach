import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Lock to prevent duplicate sync executions
let syncLock = false;

/**
 * Hook to manage background sync operations for card collection, mastery, and deck stats
 * Implements staggered execution to avoid API rate limits and database saturation
 */
export function useBackgroundSync(userId: string | null, playerTag: string | undefined) {
  const { t } = useTranslation();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!userId || !playerTag) return;
    
    // Prevent duplicate runs in the same session
    if (hasRunRef.current) return;

    const runBackgroundSync = async () => {
      // Check lock to prevent concurrent executions
      if (syncLock) {
        return;
      }
      
      syncLock = true;
      hasRunRef.current = true;
      
      try {
        // Check if card collection is empty
        const { count: collectionCount } = await supabase
          .from('card_collection')
          .select('*', { count: 'exact', head: true })
          .eq('player_tag', playerTag);

        if (collectionCount === 0) {
          try {
            await supabase.functions.invoke('sync-card-collection', { body: { playerTag } });
            toast.success(t('dashboard.sync.collectionSynced'));
          } catch (err) {
            console.error('Background sync failed:', err);
          }
          
          // Stagger: wait 2 seconds before next operation
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Check if card mastery is empty
        const { count: masteryCount } = await supabase
          .from('card_mastery')
          .select('*', { count: 'exact', head: true })
          .eq('player_tag', playerTag);

        if (masteryCount === 0) {
          try {
            await supabase.functions.invoke('calculate-card-mastery', { body: { playerTag } });
            toast.success(t('dashboard.sync.masteryCalculated'));
          } catch (err) {
            console.error('Background card mastery failed:', err);
          }
          
          // Stagger: wait 2 seconds before next operation
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Check if deck stats are empty
        const { count: deckStatsCount } = await supabase
          .from('deck_usage_stats')
          .select('*', { count: 'exact', head: true })
          .eq('player_tag', playerTag);

        if (deckStatsCount === 0) {
          try {
            await supabase.functions.invoke('track-deck-stats', { body: { playerTag } });
            toast.success(t('dashboard.sync.deckStatsTracked'));
          } catch (err) {
            console.error('Background deck stats failed:', err);
          }
        }
      } finally {
        // Release lock after all operations complete
        syncLock = false;
      }
    };

    runBackgroundSync();
  }, [userId, playerTag, t]);
}
