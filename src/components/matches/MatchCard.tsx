import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { parseClashRoyaleDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  battle: ClashRoyaleBattle;
  playerTag: string;
  onClick?: () => void;
}

export function MatchCard({ battle, playerTag, onClick }: MatchCardProps) {
  const playerTeam = battle.team.find(p => p.tag === playerTag);
  const opponent = battle.opponent[0];
  
  if (!playerTeam || !opponent) return null;

  const isWin = playerTeam.crowns > opponent.crowns;
  const trophyChange = playerTeam.trophyChange || 0;

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md border-l-4",
        isWin ? "border-l-green-500" : "border-l-red-500"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={isWin ? "default" : "destructive"}>
              {isWin ? "Victory" : "Defeat"}
            </Badge>
            <span className="text-sm text-muted-foreground">{battle.gameMode.name}</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <Crown className="w-4 h-4" />
              <span>{playerTeam.crowns} - {opponent.crowns}</span>
              <span className="text-muted-foreground">vs {opponent.name}</span>
            </div>
            
            {trophyChange !== 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4" />
                <span className={cn(
                  "font-semibold",
                  trophyChange > 0 ? "text-green-500" : "text-red-500"
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
