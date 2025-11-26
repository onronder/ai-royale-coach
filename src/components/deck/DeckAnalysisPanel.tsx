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
    <div className="space-y-6">
      {/* Archetype Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Deck Archetype</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ArchetypeTag 
            playstyle={analysis.archetype.playstyle} 
            name={analysis.archetype.name}
            size="lg"
          />
          <p className="text-sm text-muted-foreground">{analysis.archetype.tips}</p>
        </CardContent>
      </Card>

      {/* Win Rate Chart */}
      {analysis.archetypeWinRates.length > 0 && (
        <WinRateChart data={analysis.archetypeWinRates} />
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-500">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="text-sm flex gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Weaknesses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.weaknesses.map((weakness, idx) => (
                <li key={idx} className="text-sm flex gap-2">
                  <span className="text-red-500">✗</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex gap-2">
                  <span className="text-primary">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
