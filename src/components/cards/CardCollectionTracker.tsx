import { useCardCollection } from '@/hooks/useCardCollection';
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { syncCardCollection } from "@/lib/cardCollectionSync";
import { useJourneyMeasurement } from "@/hooks/useJourneyMeasurement";
import { Translation, useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionCard } from "./CollectionCard";
import { VirtualCardGrid } from "./VirtualCardGrid";
import { Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCreateNotification } from "@/hooks/useNotifications";
import { useOperationProgress } from "@/hooks/useOperationProgress";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { DataLoader } from "@/components/ui/data-loader";

const VIRTUAL_SCROLL_THRESHOLD = 50;

interface CardCollectionTrackerProps {
  playerTag: string;
  userId: string;
}

export function CardCollectionTracker({ playerTag, userId }: CardCollectionTrackerProps) {
  const { t } = useTranslation();
  const normalizedTag = playerTag.trim().replace(/^#/, '').toUpperCase();
  const scope = userId + ':' + normalizedTag;
  const currentScope = useRef(scope); currentScope.current = scope;
  const qc = useQueryClient();
  const requestVersion = useRef(0);
  const collectionQuery = useCardCollection(playerTag, userId);
  const collection = collectionQuery.data ?? [], isLoading = collectionQuery.isLoading;
  const begin = useJourneyMeasurement('card_sync', scope, !!collectionQuery.data && !collectionQuery.isFetching, collectionQuery.isError);
  const pending = useRef<{ run: string; measurement: ReturnType<typeof begin>; reuse: 'joined' | 'unknown' }>();
  const [syncState, setSyncState] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const { mutate: createNotification } = useCreateNotification();
  const { progress: syncProgress } = useOperationProgress({ playerTag, operationType: 'card_collection_sync' });
  const refetchCollection = collectionQuery.refetch;
  const syncCollection = useCallback(async (force = false) => {
    const version = ++requestVersion.current;
    const isCurrent = () => currentScope.current === scope && requestVersion.current === version;
    const measurement = begin(force ? 'manual' : 'automatic');
    setSyncState('running');
    try {
      const result = await syncCardCollection(userId, normalizedTag, force);
      if (!isCurrent()) return;
      void qc.invalidateQueries({ queryKey: ['operation-progress', userId] });
      void qc.invalidateQueries({ queryKey: ['operations', userId] });
      setSyncState(result.status);
      if (result.status === 'running') {
        pending.current = { run: result.run_id, measurement, reuse: 'joined' };
        return;
      }
      if (result.status !== 'completed' || !result.success) {
        measurement.complete(result.status === 'cancelled' ? 'cancelled' : 'failed');
        return;
      }
      void qc.invalidateQueries({ queryKey: ['player-context', userId, normalizedTag], refetchType: 'none' });
      const refreshed = await refetchCollection();
      if (!isCurrent()) return;
      if (refreshed.error) { measurement.complete('failed'); return; }
      measurement.ready(result.joined ? 'joined' : result.reused ? 'fresh' : 'generated');
      if (result.claimed && !result.joined) {
        if (force) toast.success(t('cardCollection.syncSuccess'));
        createNotification({ player_tag: playerTag, type: 'sync', title: t('cardCollection.syncedTitle'),
          message: t('cardCollection.syncedMessage'), icon_name: 'sparkles' });
      }
    } catch {
      measurement.complete('failed');
      if (isCurrent()) setSyncState('failed');
    }
  }, [begin, userId, normalizedTag, scope, qc, refetchCollection, createNotification, playerTag, t]);
  useEffect(() => {
    currentScope.current = scope;
    pending.current = undefined;
    void syncCollection();
    return () => { requestVersion.current++; currentScope.current = ''; pending.current = undefined; };
  }, [syncCollection]);
  useEffect(() => {
    const waiting = pending.current;
    if (!waiting || syncProgress?.run_id !== waiting.run || syncProgress.status === 'running') return;
    pending.current = undefined;
    setSyncState(syncProgress.status);
    if (syncProgress.status === 'completed') {
      void qc.invalidateQueries({ queryKey: ['player-context', userId, normalizedTag], refetchType: 'none' });
      void refetchCollection().then(result => result.error ? waiting.measurement.complete('failed') : waiting.measurement.ready(waiting.reuse));
    } else waiting.measurement.complete(syncProgress.status === 'cancelled' ? 'cancelled' : 'failed');
  }, [syncProgress, refetchCollection]);

  const filteredCards = selectedRarity === "all" 
    ? collection 
    : collection.filter(c => c.rarity.toLowerCase() === selectedRarity);

  const rarityStats = {
    common: collection.filter(c => c.rarity.toLowerCase() === 'common').length,
    rare: collection.filter(c => c.rarity.toLowerCase() === 'rare').length,
    epic: collection.filter(c => c.rarity.toLowerCase() === 'epic').length,
    legendary: collection.filter(c => c.rarity.toLowerCase() === 'legendary').length,
    champion: collection.filter(c => c.rarity.toLowerCase() === 'champion').length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('cardCollection.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataLoader context="collection" variant="inline" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            {t('cardCollection.title')} ({collection.length} {t('cardCollection.cards')})
          </CardTitle>
          <Button size="sm" variant="outline" className="min-h-11" disabled={syncState === 'running'} onClick={() => void syncCollection(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />{t('cardCollection.refresh')}
          </Button>
          {syncProgress?.status === 'running' && (
            <Badge variant="secondary" className="animate-pulse">
              {<Translation>{translate => translate('cardCollection.syncing')}</Translation>} {Math.round((syncProgress.progress / syncProgress.total) * 100)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("correctness.copyCostOnly")}</p>
        <p role={syncState === 'failed' || collectionQuery.isError ? 'alert' : 'status'} className="text-xs text-muted-foreground">
          {collectionQuery.isError ? t('cardCollection.loadFailed') :
            syncState === 'failed' ? t('cardCollection.refreshFailed') :
            syncState === 'cancelled' ? t('operations.cancelled') :
            syncState === 'running' ? t('cardCollection.syncing') : t('cardCollection.freshness')}
        </p>
        {/* Progress Indicator */}
        {syncProgress && (
          <ProgressIndicator
            progress={syncProgress.progress}
            total={syncProgress.total}
            currentStep={syncProgress.current_step || undefined}
            status={syncProgress.status}
            startedAt={syncProgress.started_at}
            variant="compact"
          />
        )}

        {/* Rarity Filter Tabs */}
        <Tabs value={selectedRarity} onValueChange={setSelectedRarity}>
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:grid-cols-6 [&>button]:min-h-11">
            <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="common">
              {t('cardCollection.common')} ({rarityStats.common})
            </TabsTrigger>
            <TabsTrigger value="rare">
              {t('cardCollection.rare')} ({rarityStats.rare})
            </TabsTrigger>
            <TabsTrigger value="epic">
              {t('cardCollection.epic')} ({rarityStats.epic})
            </TabsTrigger>
            <TabsTrigger value="legendary">
              {t('cardCollection.legendary')} ({rarityStats.legendary})
            </TabsTrigger>
            <TabsTrigger value="champion">
              {t('cardCollection.champion')} ({rarityStats.champion})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Cards Grid - Use virtual scrolling for large collections */}
        {filteredCards.length > VIRTUAL_SCROLL_THRESHOLD ? (
          <VirtualCardGrid cards={filteredCards} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredCards.map(card => <CollectionCard key={card.id} card={card} />)}
          </div>
        )}

        {filteredCards.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {t('cardCollection.noCardsFound')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
