import { useState, useEffect } from "react";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeckGrid } from "@/components/cards/DeckGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataLoader } from "@/components/ui/data-loader";
import { Trophy, Crown, Swords, Sparkles, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useMatchDiscussion } from "@/contexts/MatchDiscussionContext";

interface MatchDetailViewProps {
  battle: ClashRoyaleBattle | null;
  playerTag: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCoach?: () => void;
}

interface MatchAnalysis {
  analysis: string;
  deckMatchup: string;
  recommendations: string[];
}

// Trophy celebration component
function TrophyCelebration({ trophyChange }: { trophyChange: number }) {
  if (trophyChange <= 0) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-trophy-float"
          style={{
            left: `${15 + i * 18}%`,
            animationDelay: `${i * 0.15}s`,
          }}
        >
          <Trophy className="w-5 h-5 text-gold drop-shadow-lg" />
        </div>
      ))}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Sparkles className="w-8 h-8 text-gold animate-pulse" />
      </div>
    </div>
  );
}

// Confetti burst for 3-crown victories
function ConfettiBurst() {
  const colors = ['#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80', '#A855F7', '#F97316'];
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-10px',
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${1.5 + Math.random() * 1}s`,
          }}
        >
          <div 
            className="w-2 h-2 rounded-sm"
            style={{ 
              backgroundColor: colors[i % colors.length],
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        </div>
      ))}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 animate-crown-burst">
        <Crown className="w-12 h-12 text-gold drop-shadow-[0_0_15px_rgba(255,215,0,0.8)]" />
      </div>
    </div>
  );
}

export function MatchDetailView({ battle, playerTag, open, onOpenChange, onOpenCoach }: MatchDetailViewProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { setMatchContext } = useMatchDiscussion();
  
  // Normalize player tag
  const normalizedPlayerTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
  
  // Compute player/opponent data early (before hooks)
  const playerTeam = battle?.team.find(p => p.tag === normalizedPlayerTag);
  const opponent = battle?.opponent[0];
  const isWin = playerTeam && opponent ? playerTeam.crowns > opponent.crowns : false;
  const trophyChange = playerTeam?.trophyChange || 0;

  // IMPORTANT: useQuery MUST be called unconditionally (before any returns)
  const { data: analysis, isLoading } = useQuery({
    queryKey: ['match-analysis', battle?.battleTime, playerTag],
    queryFn: async () => {
      if (!battle) throw new Error('No battle data');
      const { data, error } = await supabase.functions.invoke<MatchAnalysis>('analyze-match', {
        body: { battle, playerTag }
      });
      if (error) throw error;
      return data;
    },
    enabled: open && !!battle,
    staleTime: 24 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (open && battle && playerTeam) {
      const crowns = playerTeam.crowns;
      const opponentCrowns = opponent?.crowns || 0;
      const matchIsWin = crowns > opponentCrowns;
      
      if (matchIsWin && crowns === 3) {
        setShowConfetti(true);
        const timer = setTimeout(() => setShowConfetti(false), 3000);
        return () => clearTimeout(timer);
      } else if ((playerTeam.trophyChange || 0) > 0) {
        setShowCelebration(true);
        const timer = setTimeout(() => setShowCelebration(false), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [open, battle, playerTeam, opponent]);

  // Handle "Discuss with Coach" click
  const handleDiscussWithCoach = () => {
    if (!battle || !playerTeam || !opponent) return;
    
    setMatchContext({
      battle,
      playerTag: normalizedPlayerTag,
      analysis: analysis || undefined,
      isWin,
      playerCrowns: playerTeam.crowns,
      opponentCrowns: opponent.crowns,
      trophyChange,
    });
    
    onOpenChange(false);
    onOpenCoach?.();
  };

  // Early returns AFTER all hooks
  if (!battle) return null;
  if (!playerTeam || !opponent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto relative">
        {showConfetti && <ConfettiBurst />}
        {showCelebration && <TrophyCelebration trophyChange={trophyChange} />}
        
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
          <div className={cn(
            "grid grid-cols-3 gap-4 p-4 rounded-lg relative overflow-hidden transition-all",
            isWin ? "bg-success/10 border border-success/20" : "bg-muted"
          )}>
            <div className="text-center">
              <Crown className={cn("w-6 h-6 mx-auto mb-1", isWin ? "text-gold" : "text-primary")} />
              <p className="text-2xl font-bold font-rajdhani">{playerTeam.crowns} - {opponent.crowns}</p>
              <p className="text-xs text-muted-foreground">Crowns</p>
            </div>
            {trophyChange !== 0 && (
              <div className="text-center">
                <Trophy className={cn(
                  "w-6 h-6 mx-auto mb-1",
                  trophyChange > 0 ? "text-gold trophy-shimmer" : "text-destructive"
                )} />
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

          {/* Discuss with Coach Button */}
          <div className="pt-4 border-t border-border">
            <Button 
              onClick={handleDiscussWithCoach}
              className="w-full bg-gradient-to-r from-primary to-accent hover:shadow-glow transition-all"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Discuss with AI Coach
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Ask follow-up questions about this match and get personalized tips
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
