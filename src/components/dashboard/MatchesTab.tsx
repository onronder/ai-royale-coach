import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords } from "lucide-react";
import { PageTransition } from "@/components/ui/loading-states";
import { DataLoader } from "@/components/ui/data-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchCard } from "@/components/matches/MatchCard";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";

interface MatchesTabProps {
  playerTag: string;
  battles: ClashRoyaleBattle[] | null;
  battlesLoading: boolean;
  battlesError: Error | null;
  onMatchClick: (battle: ClashRoyaleBattle) => void;
}

export function MatchesTab({
  playerTag,
  battles,
  battlesLoading,
  battlesError,
  onMatchClick,
}: MatchesTabProps) {
  const { t } = useTranslation();

  return (
    <PageTransition delay={100}>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.matchHistory')}</CardTitle>
            <CardDescription>{t('dashboard.matchHistoryDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {battlesLoading ? (
              <DataLoader context="battles" variant="inline" />
            ) : battlesError ? (
              <EmptyState
                icon={Swords}
                title={t('dashboard.failedLoadBattles')}
                description={t('dashboard.failedLoadBattlesDesc')}
                variant="compact"
              />
            ) : battles && battles.length > 0 ? (
              <div className="space-y-3">
                {battles.slice(0, 15).map((battle, idx) => (
                  <div
                    key={idx}
                    className="animate-slide-up"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <MatchCard
                      battle={battle}
                      playerTag={playerTag}
                      onClick={() => onMatchClick(battle)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Swords}
                title={t('dashboard.noBattles')}
                description={t('dashboard.noBattlesDesc')}
                variant="compact"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
