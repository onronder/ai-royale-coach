import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/ui/loading-states";
import { DataLoader } from "@/components/ui/data-loader";
import { DeckGrid } from "@/components/cards/DeckGrid";
import { DeckAnalysisPanel } from "@/components/deck/DeckAnalysisPanel";
import { ClashRoyalePlayer, ClashRoyaleBattle } from "@/services/clashRoyaleApi";

interface DeckTabProps {
  player: ClashRoyalePlayer | null;
  battles: ClashRoyaleBattle[] | null;
  playerLoading: boolean;
  playerError: Error | null;
}

export function DeckTab({
  player,
  battles,
  playerLoading,
  playerError,
}: DeckTabProps) {
  const { t } = useTranslation();

  return (
    <PageTransition delay={100}>
      <div className="space-y-6">
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
          <DeckAnalysisPanel player={player} battles={battles} />
        )}
      </div>
    </PageTransition>
  );
}
