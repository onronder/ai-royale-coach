import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/loading-states";
import { DataLoader } from "@/components/ui/data-loader";
import { DeckGrid } from "@/components/cards/DeckGrid";
import { DeckAnalysisPanel } from "@/components/deck/DeckAnalysisPanel";
import { RecommendedDecksPanel } from "@/components/deck/RecommendedDecksPanel";
import { ClashRoyalePlayer, ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";

interface DeckTabProps {
  player: ClashRoyalePlayer | null;
  battles: ClashRoyaleBattle[] | null;
  playerLoading: boolean;
  playerError: Error | null;
  playerTag: string;
}

export function DeckTab({
  player,
  battles,
  playerLoading,
  playerError,
  playerTag,
}: DeckTabProps) {
  const { t } = useTranslation();

  const handleImportDeck = (cards: string[]) => {
    // Navigate to deck builder with the selected deck
    const deckParam = encodeURIComponent(cards.join(','));
    window.location.href = `/player/${playerTag}?tab=builder&deck=${deckParam}`;
  };

  return (
    <PageTransition delay={100}>
      <div className="space-y-6">
        {/* Personalized Recommendations - Subscription Gated */}
        {player && (
          <SubscriptionGate feature={t('subscription.features.deckRecommendations')}>
            <RecommendedDecksPanel
              playerTag={playerTag}
              trophies={player.trophies || 0}
              onImportDeck={handleImportDeck}
            />
          </SubscriptionGate>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.currentDeck')}</CardTitle>
            <CardDescription>{t('dashboard.currentDeckDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {playerLoading ? (
              <DataLoader context="deck" variant="inline" />
            ) : playerError ? (
              <p className="text-muted-foreground">{t('dashboard.failedLoadDeck')}</p>
            ) : player?.currentDeck && player.currentDeck.length > 0 ? (
              <DeckGrid cards={player.currentDeck} showElixir={true} size="md" />
            ) : (
              <p className="text-muted-foreground">{t('common.noData')}</p>
            )}
          </CardContent>
        </Card>

        {player && battles && battles.length > 0 && (
          <SubscriptionGate feature={t('subscription.features.deckAnalysis')}>
            <DeckAnalysisPanel player={player} battles={battles} />
          </SubscriptionGate>
        )}
      </div>
    </PageTransition>
  );
}
