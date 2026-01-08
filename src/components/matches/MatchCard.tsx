import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, Swords, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { parseClashRoyaleDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  battle: ClashRoyaleBattle;
  playerTag: string;
  onClick?: () => void;
}

// Memoized to prevent re-renders when parent updates unrelated state
export const MatchCard = memo(function MatchCard({ battle, playerTag, onClick }: MatchCardProps) {
  const navigate = useNavigate();
  
  // Normalize player tags - API returns with '#', URL param might not have it
  const normalizedPlayerTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
  const playerTeam = battle.team.find(p => p.tag === normalizedPlayerTag);
  const opponent = battle.opponent[0];
  
  if (!playerTeam || !opponent) return null;

  const isWin = playerTeam.crowns > opponent.crowns;
  const trophyChange = playerTeam.trophyChange || 0;

  const handleQuickScan = (e: React.MouseEvent) => {
    e.stopPropagation();
    const opponentTag = opponent.tag.replace(/^#/, '');
    const cleanPlayerTag = playerTag.replace(/^#/, '');
    navigate(`/oracle?target=${opponentTag}&player=${cleanPlayerTag}`);
  };

  return (
    <Card 
      variant={isWin ? "victory" : "defeat"}
      className={cn(
        "p-3 md:p-4 cursor-pointer transition-all border-l-4 hover:-translate-y-1 animate-fade-in w-full",
        isWin 
          ? "border-l-success border-glow-victory" 
          : "border-l-destructive border-glow-defeat"
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
            <span className="text-xs md:text-sm text-muted-foreground font-medium truncate">{battle.gameMode.name}</span>
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

        <div className="flex flex-col items-end gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleQuickScan}
            className="h-8 w-8 min-h-[44px] min-w-[44px] text-emerald-400 hover:bg-emerald-900/20"
            title="Quick Scan Opponent"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <p className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(parseClashRoyaleDate(battle.battleTime), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if battle or playerTag changes
  return (
    prevProps.battle.battleTime === nextProps.battle.battleTime &&
    prevProps.playerTag === nextProps.playerTag
  );
});
