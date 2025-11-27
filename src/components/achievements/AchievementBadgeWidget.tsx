import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Loader2 } from 'lucide-react';
import { useAchievements, useAchievementProgress } from '@/hooks/useAchievements';

interface AchievementBadgeWidgetProps {
  playerTag: string;
}

export function AchievementBadgeWidget({ playerTag }: AchievementBadgeWidgetProps) {
  const { data: achievements, isLoading: achievementsLoading } = useAchievements(playerTag);
  const { data: progress, isLoading: progressLoading } = useAchievementProgress(playerTag);

  if (achievementsLoading || progressLoading) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur border-primary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 border border-primary/30 animate-pulse">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Loading achievements...</p>
          </div>
        </div>
      </Card>
    );
  }

  const unlockedCount = achievements?.filter(a => a.unlocked_at)?.length || 0;
  const totalPoints = progress?.total_mastery_points || 0;

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/10 to-card border-primary/20 hover:border-primary/40 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-rajdhani font-bold text-foreground">
              {unlockedCount} Achievement{unlockedCount !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {progress?.learning_phase || 'Beginner'} Phase
            </p>
          </div>
        </div>
        <div className="text-right">
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <Award className="h-3 w-3 mr-1" />
            {totalPoints}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
