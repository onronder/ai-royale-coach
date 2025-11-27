import { useState } from "react";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeckGrid } from "@/components/cards/DeckGrid";
import { Badge } from "@/components/ui/badge";
import { DataLoader } from "@/components/ui/data-loader";
import { Trophy, Crown, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface MatchDetailViewProps {
  battle: ClashRoyaleBattle | null;
  playerTag: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MatchAnalysis {
  analysis: string;
  deckMatchup: string;
  recommendations: string[];
}

export function MatchDetailView({ battle, playerTag, open, onOpenChange }: MatchDetailViewProps) {
  if (!battle) return null;

  const playerTeam = battle.team.find(p => p.tag === playerTag);
  const opponent = battle.opponent[0];
  
  if (!playerTeam || !opponent) return null;

  const isWin = playerTeam.crowns > opponent.crowns;
  const trophyChange = playerTeam.trophyChange || 0;

  const { data: analysis, isLoading } = useQuery({
    queryKey: ['match-analysis', battle.battleTime, playerTag],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<MatchAnalysis>('analyze-match', {
        body: { battle, playerTag }
      });
      if (error) throw error;
      return data;
    },
    enabled: open,
    staleTime: 24 * 60 * 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Badge variant={isWin ? "default" : "destructive"} className="text-base">
              {isWin ? "Victory" : "Defeat"}
            </Badge>
            <span className="text-muted-foreground">{battle.gameMode.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Battle Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="text-center">
              <Crown className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{playerTeam.crowns} - {opponent.crowns}</p>
              <p className="text-xs text-muted-foreground">Crowns</p>
            </div>
            {trophyChange !== 0 && (
              <div className="text-center">
                <Trophy className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className={cn(
                  "text-2xl font-bold",
                  trophyChange > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {trophyChange > 0 ? '+' : ''}{trophyChange}
                </p>
                <p className="text-xs text-muted-foreground">Trophies</p>
              </div>
            )}
            <div className="text-center">
              <Swords className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-sm font-medium">{battle.arena.name}</p>
              <p className="text-xs text-muted-foreground">Arena</p>
            </div>
          </div>

          {/* Decks Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-green-500">●</span> Your Deck
              </h3>
              <DeckGrid cards={playerTeam.cards} size="sm" />
            </div>
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="text-red-500">●</span> {opponent.name}'s Deck
              </h3>
              <DeckGrid cards={opponent.cards} size="sm" />
            </div>
          </div>

          {/* AI Analysis */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Match Analysis</h3>
            {isLoading ? (
              <DataLoader context="match-analysis" variant="inline" />
            ) : analysis ? (
              <div className="space-y-4">
                <div className="p-4 bg-card rounded-lg border">
                  <h4 className="font-medium mb-2 text-primary">Deck Matchup</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.deckMatchup}</p>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <h4 className="font-medium mb-2 text-primary">Analysis</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{analysis.analysis}</p>
                </div>
                {analysis.recommendations.length > 0 && (
                  <div className="p-4 bg-card rounded-lg border">
                    <h4 className="font-medium mb-2 text-primary">Recommendations</h4>
                    <ul className="space-y-1">
                      {analysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
