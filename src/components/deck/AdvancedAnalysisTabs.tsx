import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ElixirAnalysisCard } from "./ElixirAnalysisCard";
import { SynergyMatrix } from "./SynergyMatrix";
import { MatchupPredictions } from "./MatchupPredictions";
import { Zap, GitMerge, Swords, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AdvancedAnalysis {
  elixirAnalysis: {
    avgElixir: number;
    cycleSpeed: 'fast' | 'medium' | 'slow';
    defensiveCost: number;
    offensiveCost: number;
    elixirDistribution: { cost: number; count: number }[];
    tradeScenarios: any[];
  };
  composition?: {
    winConditions: string[];
    defenseCards: string[];
    cycleCards: string[];
    spells: string[];
    missingRoles: string[];
    balanceNotes: string;
  };
  synergyMatrix: any | null;
  matchupPredictions: any[] | null;
}

interface BasicAnalysis {
  synergy_score: number | null;
  meta_score: number | null;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  avg_elixir: number;
}

interface AdvancedAnalysisTabsProps {
  advancedAnalysis: AdvancedAnalysis | null;
  basicAnalysis: BasicAnalysis | null;
  cardNames: string[];
}

export function AdvancedAnalysisTabs({ advancedAnalysis, basicAnalysis, cardNames }: AdvancedAnalysisTabsProps) {
  const { t } = useTranslation();

  if (!advancedAnalysis && !basicAnalysis) return null;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span className="hidden sm:inline">{t('deckAnalysis.overview')}</span>
        </TabsTrigger>
        <TabsTrigger value="elixir" className="flex items-center gap-2" disabled={!advancedAnalysis}>
          <Zap className="w-4 h-4" />
          <span className="hidden sm:inline">{t('deckAnalysis.elixir')}</span>
        </TabsTrigger>
        <TabsTrigger value="synergies" className="flex items-center gap-2" disabled={!advancedAnalysis?.synergyMatrix}>
          <GitMerge className="w-4 h-4" />
          <span className="hidden sm:inline">{t('deckAnalysis.synergies')}</span>
        </TabsTrigger>
        <TabsTrigger value="matchups" className="flex items-center gap-2" disabled={!advancedAnalysis?.matchupPredictions}>
          <Swords className="w-4 h-4" />
          <span className="hidden sm:inline">{t('deckAnalysis.matchups')}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-4">
        {/* Data Source Legend */}
        <div className="flex flex-wrap gap-2 text-xs pb-2 border-b border-border">
          <span className="px-2 py-0.5 rounded bg-success/20 text-success border border-success/30">
            {t('deckAnalysis.calculatedLabel')}
          </span>
          <span className="px-2 py-0.5 rounded bg-warning/20 text-warning border border-warning/30">
            {t('deckAnalysis.aiLabel')}
          </span>
        </div>

        {basicAnalysis && (
          <>
            {basicAnalysis.synergy_score !== null && basicAnalysis.meta_score !== null ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{basicAnalysis.synergy_score}/100</p>
                  <p className="text-sm text-muted-foreground">{t('deckAnalysis.synergyScore')}</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{basicAnalysis.meta_score}/100</p>
                  <p className="text-sm text-muted-foreground">{t('deckAnalysis.metaScore')}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground text-center">
                  📊 <span className="font-semibold">{t('deckAnalysis.synergyScore')}</span> {t('deckAnalysis.scoresRequireBattles')}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-success">{t('deckAnalysis.strengths')}</h4>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning">AI</span>
                </div>
                <ul className="space-y-1">
                  {basicAnalysis.strengths.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-success">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-destructive">{t('deckAnalysis.weaknesses')}</h4>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning">AI</span>
                </div>
                <ul className="space-y-1">
                  {basicAnalysis.weaknesses.map((w, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-destructive">✗</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-primary">{t('deckAnalysis.recommendations')}</h4>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-warning/20 text-warning">AI</span>
                </div>
                <ul className="space-y-1">
                  {basicAnalysis.recommendations.map((r, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </TabsContent>

      <TabsContent value="elixir" className="mt-4">
        {advancedAnalysis && (
          <ElixirAnalysisCard analysis={advancedAnalysis.elixirAnalysis} />
        )}
      </TabsContent>

      <TabsContent value="synergies" className="mt-4">
        {advancedAnalysis && (
          <SynergyMatrix 
            analysis={advancedAnalysis.synergyMatrix} 
            cardNames={cardNames}
          />
        )}
      </TabsContent>

      <TabsContent value="matchups" className="mt-4">
        {advancedAnalysis && (
          <MatchupPredictions predictions={advancedAnalysis.matchupPredictions} />
        )}
      </TabsContent>
    </Tabs>
  );
}