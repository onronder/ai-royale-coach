import { ClashRoyalePlayer, ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArchetypeTag } from "./ArchetypeTag";
import { WinRateChart } from "./WinRateChart";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

interface DeckAnalysisResult {
  archetype: {
    name: string;
    playstyle: string;
    tips: string;
  };
  archetypeWinRates: Array<{
    archetype: string;
    wins: number;
    losses: number;
    winRate: number;
  }>;
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}

interface DeckAnalysisPanelProps {
  player: ClashRoyalePlayer;
  battles: ClashRoyaleBattle[];
}

export function DeckAnalysisPanel({ player, battles }: DeckAnalysisPanelProps) {
  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ['deck-analysis', player.tag],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<DeckAnalysisResult>('analyze-deck', {
        body: { playerData: player, battles }
      });
      if (error) throw error;
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p>Failed to analyze deck. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Archetype Detection */}
      <Card className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur border-primary/20 shadow-glow">
        <CardHeader>
          <CardTitle className="font-rajdhani text-xl">Deck Archetype</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ArchetypeTag 
            playstyle={analysis.archetype.playstyle} 
            name={analysis.archetype.name}
            size="lg"
          />
          <p className="text-sm text-muted-foreground leading-relaxed">{analysis.archetype.tips}</p>
        </CardContent>
      </Card>

      {/* Win Rate Chart */}
      {analysis.archetypeWinRates.length > 0 && (
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <WinRateChart data={analysis.archetypeWinRates} />
        </div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
        <Card className="bg-card/50 backdrop-blur border-chart-1/30 hover:border-chart-1/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-rajdhani">
              <span className="text-chart-1">✓</span>
              <span className="bg-gradient-to-r from-chart-1 to-chart-1/70 bg-clip-text text-transparent">
                Strengths
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="text-sm flex gap-3 items-start group">
                  <span className="text-chart-1 text-lg flex-shrink-0 group-hover:scale-110 transition-transform">✓</span>
                  <span className="text-foreground/90 leading-relaxed">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-chart-3/30 hover:border-chart-3/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-rajdhani">
              <span className="text-chart-3">✗</span>
              <span className="bg-gradient-to-r from-chart-3 to-chart-3/70 bg-clip-text text-transparent">
                Weaknesses
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.weaknesses.map((weakness, idx) => (
                <li key={idx} className="text-sm flex gap-3 items-start group">
                  <span className="text-chart-3 text-lg flex-shrink-0 group-hover:scale-110 transition-transform">✗</span>
                  <span className="text-foreground/90 leading-relaxed">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur border-accent/30 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-rajdhani">
              <span className="text-accent text-xl">💡</span>
              <span className="bg-gradient-accent bg-clip-text text-transparent">
                AI Recommendations
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex gap-3 items-start group">
                  <span className="text-accent font-bold flex-shrink-0 group-hover:scale-110 transition-transform">→</span>
                  <span className="text-foreground/90 leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
