import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ElixirAnalysisCard } from "./ElixirAnalysisCard";
import { SynergyMatrix } from "./SynergyMatrix";
import { MatchupPredictions } from "./MatchupPredictions";
import { Zap, GitMerge, Swords, TrendingUp } from "lucide-react";

interface AdvancedAnalysis {
  elixirAnalysis: {
    avgElixir: number;
    cycleSpeed: 'fast' | 'medium' | 'slow';
    defensiveCost: number;
    offensiveCost: number;
    elixirDistribution: { cost: number; count: number }[];
    tradeScenarios: any[];
  };
  synergyMatrix: {
    pairs: any[];
    overallScore: number;
    topSynergies: string[];
    antiSynergies: string[];
  };
  matchupPredictions: any[];
}

interface BasicAnalysis {
  synergy_score: number;
  meta_score: number;
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
  if (!advancedAnalysis && !basicAnalysis) return null;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="elixir" className="flex items-center gap-2" disabled={!advancedAnalysis}>
          <Zap className="w-4 h-4" />
          <span className="hidden sm:inline">Elixir</span>
        </TabsTrigger>
        <TabsTrigger value="synergies" className="flex items-center gap-2" disabled={!advancedAnalysis}>
          <GitMerge className="w-4 h-4" />
          <span className="hidden sm:inline">Synergies</span>
        </TabsTrigger>
        <TabsTrigger value="matchups" className="flex items-center gap-2" disabled={!advancedAnalysis}>
          <Swords className="w-4 h-4" />
          <span className="hidden sm:inline">Matchups</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 mt-4">
        {basicAnalysis && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-primary">{basicAnalysis.synergy_score}/100</p>
                <p className="text-sm text-muted-foreground">Synergy Score</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-primary">{basicAnalysis.meta_score}/100</p>
                <p className="text-sm text-muted-foreground">Meta Score</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-success mb-2">Strengths</h4>
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
                <h4 className="font-semibold text-destructive mb-2">Weaknesses</h4>
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
                <h4 className="font-semibold text-primary mb-2">Recommendations</h4>
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
