import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Swords } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { parseClashRoyaleDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  battle: ClashRoyaleBattle;
  playerTag: string;
  onClick?: () => void;
}

export function MatchCard({ battle, playerTag, onClick }: MatchCardProps) {
  // Normalize player tags - API returns with '#', URL param might not have it
  const normalizedPlayerTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
  const playerTeam = battle.team.find(p => p.tag === normalizedPlayerTag);
  const opponent = battle.opponent[0];
  
  if (!playerTeam || !opponent) return null;

  const isWin = playerTeam.crowns > opponent.crowns;
  const trophyChange = playerTeam.trophyChange || 0;

  return (
    <Card 
      variant={isWin ? "victory" : "defeat"}
      className={cn(
        "p-4 cursor-pointer transition-all border-l-4 hover:-translate-y-1 golden-shine",
        isWin 
          ? "border-l-success" 
          : "border-l-destructive"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge 
              variant={isWin ? "default" : "destructive"}
              className={cn(
                "font-rajdhani font-bold text-xs tracking-wider",
                isWin && "bg-gradient-victory border-success/30"
              )}
            >
              <Swords className="w-3 h-3 mr-1" />
              {isWin ? "VICTORY" : "DEFEAT"}
            </Badge>
            <span className="text-sm text-muted-foreground font-medium">{battle.gameMode.name}</span>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Crown className={cn(
                "w-4 h-4",
                isWin ? "text-gold" : "text-muted-foreground"
              )} />
              <span className="font-rajdhani font-semibold">{playerTeam.crowns} - {opponent.crowns}</span>
              <span className="text-muted-foreground">vs <span className="text-foreground">{opponent.name}</span></span>
            </div>
            
            {trophyChange !== 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Trophy className={cn(
                  "w-4 h-4",
                  trophyChange > 0 ? "text-gold trophy-shimmer" : "text-destructive"
                )} />
                <span className={cn(
                  "font-rajdhani font-bold text-base",
                  trophyChange > 0 ? "text-success" : "text-destructive"
                )}>
                  {trophyChange > 0 ? '+' : ''}{trophyChange}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(parseClashRoyaleDate(battle.battleTime), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Card>
  );
}
