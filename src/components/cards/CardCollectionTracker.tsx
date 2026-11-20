import { nextUpgradeCopies } from '@/lib/upgradeCost';
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { syncCardCollection } from "@/lib/cardCollectionSync";
import { useJourneyMeasurement } from "@/hooks/useJourneyMeasurement";
import { Translation, useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardImage } from "./CardImage";
import { VirtualCardGrid } from "./VirtualCardGrid";
import { Sparkles, ArrowUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCreateNotification } from "@/hooks/useNotifications";
import { useOperationProgress } from "@/hooks/useOperationProgress";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { DataLoader } from "@/components/ui/data-loader";
import { getDisplayLevel } from "@/utils/cardLevelCalculator";

const VIRTUAL_SCROLL_THRESHOLD = 50;

interface CardCollectionItem {
  id: string;
  card_id: number;
  card_name: string;
  card_level: number;
  card_count: number;
  max_level: number;
  rarity: string;
  elixir_cost: number | null;
  icon_url: string | null;
  evolution_level: number | null;
}

interface CardCollectionTrackerProps {
  playerTag: string;
  userId: string;
}

const RARITY_COLORS = {
  common: "bg-gray-500",
  rare: "bg-orange-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500",
  champion: "bg-pink-500"
};

export function CardCollectionTracker({ playerTag, userId }: CardCollectionTrackerProps) {
  const { t } = useTranslation();
  const normalizedTag = playerTag.trim().replace(/^#/, '').toUpperCase();
  const scope = userId + ':' + normalizedTag;
  const currentScope = useRef(scope); currentScope.current = scope;
  const qc = useQueryClient();
  const requestVersion = useRef(0);
  const collectionQuery = useQuery({
    queryKey: ['card-collection-view', userId, normalizedTag],
    queryFn: async () => {
      const { data, error } = await supabase.from('card_collection').select('*')
        .eq('user_id', userId).in('player_tag', [normalizedTag, '#' + normalizedTag])
        .order('updated_at', { ascending: false });
      if (error) throw error;
      // Legacy tag spellings may coexist; display the most recently saved card.
      const unique = new Map<number, CardCollectionItem>();
      for (const card of data ?? []) if (!unique.has(card.card_id)) unique.set(card.card_id, card);
      return [...unique.values()].sort((a, b) => a.rarity.localeCompare(b.rarity) || a.card_name.localeCompare(b.card_name));
    },
    enabled: !!userId && !!normalizedTag,
  });
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
      void qc.invalidateQueries({ queryKey: ['player-context', userId, normalizedTag] });
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
      void qc.invalidateQueries({ queryKey: ['player-context', userId, normalizedTag] });
      void refetchCollection().then(result => result.error ? waiting.measurement.complete('failed') : waiting.measurement.ready(waiting.reuse));
    } else waiting.measurement.complete(syncProgress.status === 'cancelled' ? 'cancelled' : 'failed');
  }, [syncProgress, refetchCollection]);

  const calculateProgress = (card: CardCollectionItem) => {
    if (card.card_level >= card.max_level) {
      return 100;
    }

    const required = nextUpgradeCopies(card);
    return required === null ? 0 : Math.min(card.card_count / required * 100, 100);
  };

  const getNextLevelRequirement = nextUpgradeCopies;

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
          <VirtualCardGrid
            cards={filteredCards}
            calculateProgress={calculateProgress}
            getNextLevelRequirement={getNextLevelRequirement}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredCards.map((card) => {
              const progress = calculateProgress(card);
              const nextLevelReq = getNextLevelRequirement(card);
              const isMaxLevel = card.card_level >= card.max_level;

              return (
                <div key={card.id} className="space-y-2">
                  {card.icon_url && (
                    <CardImage
                      card={{
                        id: card.card_id,
                        name: card.card_name,
                        level: card.card_level,
                        maxLevel: card.max_level,
                        iconUrls: { medium: card.icon_url },
                        elixirCost: card.elixir_cost || undefined,
                        evolutionLevel: card.evolution_level || undefined,
                        rarity: card.rarity,
                      }}
                      size="md"
                      showLevel={true}
                      showElixir={true}
                    />
                  )}
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${RARITY_COLORS[card.rarity.toLowerCase() as keyof typeof RARITY_COLORS]}/10 border-${RARITY_COLORS[card.rarity.toLowerCase() as keyof typeof RARITY_COLORS]}/20`}
                      >
                        {t(`landing.demo.cards.rarities.${card.rarity.toLowerCase()}`, { defaultValue: card.rarity })}
                      </Badge>
                      {!isMaxLevel && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowUp className="w-3 h-3" />
                          <span>{card.card_count}/{nextLevelReq ?? "—"}</span>
                        </div>
                      )}
                    </div>

                    {!isMaxLevel ? (
                      <div className="space-y-1">
                        <Progress value={progress} className="h-1.5" />
                        <p className="text-xs text-center text-muted-foreground">
                          {nextLevelReq === null ? t('correctness.unknownCost') : t('cardCollection.cardsUntilLevel', { count: Math.max(0, nextLevelReq! - card.card_count), level: getDisplayLevel({ level: card.card_level + 1, maxLevel: card.max_level, rarity: card.rarity }) })}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="default" className="w-full justify-center bg-green-500 hover:bg-green-600">
                        {t('cardCollection.max')}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
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
