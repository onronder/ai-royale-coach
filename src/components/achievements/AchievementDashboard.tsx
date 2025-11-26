import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Award, Trophy, RefreshCw, Target, Clock, Zap, Brain, TrendingUp, GraduationCap, Crown } from 'lucide-react';
import { useAchievements, useAchievementProgress, useSyncAchievements } from '@/hooks/useAchievements';
import { AnalysisLoader } from '@/components/ui/analysis-loader';
import * as LucideIcons from 'lucide-react';

interface AchievementDashboardProps {
  playerTag: string;
}

export function AchievementDashboard({ playerTag }: AchievementDashboardProps) {
  const { data: achievements, isLoading: achievementsLoading } = useAchievements(playerTag);
  const { data: progress, isLoading: progressLoading } = useAchievementProgress(playerTag);
  const { mutate: syncAchievements, isPending: isSyncing } = useSyncAchievements(playerTag);

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'master':
        return { color: 'hsl(var(--primary))', bg: 'bg-primary/20', border: 'border-primary/30', text: 'text-primary' };
      case 'diamond':
        return { color: '#00ced1', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', text: 'text-cyan-500' };
      case 'gold':
        return { color: '#ffd700', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-500' };
      case 'silver':
        return { color: '#c0c0c0', bg: 'bg-gray-400/20', border: 'border-gray-400/30', text: 'text-gray-400' };
      default:
        return { color: '#cd7f32', bg: 'bg-orange-800/20', border: 'border-orange-800/30', text: 'text-orange-800' };
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Award;
    return Icon;
  };

  const unlockedAchievements = achievements?.filter(a => a.unlocked_at) || [];
  const lockedAchievements = achievements?.filter(a => !a.unlocked_at) || [];

  const achievementsByCategory = {
    skill: achievements?.filter(a => a.achievements.category === 'skill') || [],
    mastery: achievements?.filter(a => a.achievements.category === 'mastery') || [],
    learning_path: achievements?.filter(a => a.achievements.category === 'learning_path') || [],
    milestone: achievements?.filter(a => a.achievements.category === 'milestone') || [],
  };

  const skillIcons: Record<string, any> = {
    cardPlacement: Target,
    timing: Clock,
    elixirManagement: Zap,
    prediction: Brain,
    adaptation: TrendingUp,
  };

  if (achievementsLoading || progressLoading) {
    return <AnalysisLoader message="Loading your achievements..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/20 to-card border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20 border border-primary/50">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-rajdhani text-2xl">Achievement Center</CardTitle>
                <CardDescription>Track your mastery journey and unlock rewards</CardDescription>
              </div>
            </div>
            <Button
              onClick={() => syncAchievements()}
              disabled={isSyncing}
              className="bg-primary hover:bg-primary/90"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Progress
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="h-8 w-8 text-primary" />
              <span className="text-3xl font-bold font-rajdhani text-primary">{unlockedAchievements.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Achievements Unlocked</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-card border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-8 w-8 text-accent" />
              <span className="text-3xl font-bold font-rajdhani text-accent">
                {progress?.total_mastery_points || 0}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Mastery Points</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-card border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <GraduationCap className="h-8 w-8 text-success" />
              <span className="text-2xl font-bold font-rajdhani text-success capitalize">
                {progress?.learning_phase || 'Beginner'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Learning Phase</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-card border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <Crown className="h-8 w-8 text-warning" />
              <span className="text-3xl font-bold font-rajdhani text-warning">
                {Math.round((unlockedAchievements.length / (achievements?.length || 1)) * 100)}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Skill Levels */}
      {progress?.skill_levels && (
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardHeader>
            <CardTitle className="font-rajdhani">Skill Breakdown</CardTitle>
            <CardDescription>Your current skill ratings across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(progress.skill_levels).map(([skill, level]) => {
                const Icon = skillIcons[skill] || Target;
                const tierInfo = getTierInfo(
                  level >= 9 ? 'master' : level >= 7 ? 'diamond' : level >= 5 ? 'gold' : level >= 3 ? 'silver' : 'bronze'
                );
                
                return (
                  <div key={skill}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-rajdhani font-semibold text-foreground capitalize">
                          {skill.replace(/([A-Z])/g, ' $1')}
                        </span>
                      </div>
                      <Badge variant="outline" className={tierInfo.text}>
                        {level}/10
                      </Badge>
                    </div>
                    <Progress value={level * 10} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievement Categories */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-card/50">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="skill">Skills</TabsTrigger>
          <TabsTrigger value="mastery">Mastery</TabsTrigger>
          <TabsTrigger value="learning_path">Learning</TabsTrigger>
          <TabsTrigger value="milestone">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="space-y-6">
            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <div>
                <h3 className="text-lg font-rajdhani font-bold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Unlocked ({unlockedAchievements.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unlockedAchievements.map((userAch) => {
                    const ach = userAch.achievements;
                    const tierInfo = getTierInfo(ach.tier);
                    const Icon = getIconComponent(ach.icon_name);
                    
                    return (
                      <Card key={userAch.id} className={`${tierInfo.bg} ${tierInfo.border} border-2`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${tierInfo.bg} border ${tierInfo.border}`}>
                              <Icon className="h-6 w-6" style={{ color: tierInfo.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-rajdhani font-bold text-foreground">{ach.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                              <div className="flex items-center gap-2 mt-3">
                                <Badge variant="outline" style={{ borderColor: tierInfo.color, color: tierInfo.color }}>
                                  {ach.tier.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-primary border-primary/30">
                                  +{ach.points} pts
                                </Badge>
                              </div>
                              <p className="text-xs text-success mt-2">
                                Unlocked {new Date(userAch.unlocked_at!).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Locked Achievements */}
            {lockedAchievements.length > 0 && (
              <div>
                <h3 className="text-lg font-rajdhani font-bold text-muted-foreground mb-4">
                  In Progress ({lockedAchievements.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lockedAchievements.map((userAch) => {
                    const ach = userAch.achievements;
                    const tierInfo = getTierInfo(ach.tier);
                    const Icon = getIconComponent(ach.icon_name);
                    
                    return (
                      <Card key={userAch.id} className="bg-card/30 border-border/50 opacity-70">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-muted/20 border border-muted/30">
                              <Icon className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-rajdhani font-bold text-foreground">{ach.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">Progress</span>
                                  <span className="text-xs font-semibold text-foreground">{userAch.progress}%</span>
                                </div>
                                <Progress value={userAch.progress} className="h-2" />
                              </div>
                              <div className="flex items-center gap-2 mt-3">
                                <Badge variant="outline" className="text-muted-foreground border-muted/30">
                                  {ach.tier.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-muted-foreground border-muted/30">
                                  {ach.points} pts
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Category Tabs */}
        {Object.entries(achievementsByCategory).map(([category, items]) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((userAch) => {
                const ach = userAch.achievements;
                const tierInfo = getTierInfo(ach.tier);
                const Icon = getIconComponent(ach.icon_name);
                const isUnlocked = !!userAch.unlocked_at;
                
                return (
                  <Card 
                    key={userAch.id} 
                    className={isUnlocked 
                      ? `${tierInfo.bg} ${tierInfo.border} border-2` 
                      : 'bg-card/30 border-border/50 opacity-70'
                    }
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isUnlocked ? `${tierInfo.bg} border ${tierInfo.border}` : 'bg-muted/20 border border-muted/30'}`}>
                          <Icon 
                            className="h-6 w-6" 
                            style={isUnlocked ? { color: tierInfo.color } : undefined}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-rajdhani font-bold text-foreground">{ach.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
                          
                          {!isUnlocked && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-muted-foreground">Progress</span>
                                <span className="text-xs font-semibold text-foreground">{userAch.progress}%</span>
                              </div>
                              <Progress value={userAch.progress} className="h-2" />
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 mt-3">
                            <Badge 
                              variant="outline" 
                              className={isUnlocked ? tierInfo.text : 'text-muted-foreground border-muted/30'}
                              style={isUnlocked ? { borderColor: tierInfo.color } : undefined}
                            >
                              {ach.tier.toUpperCase()}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={isUnlocked ? 'text-primary border-primary/30' : 'text-muted-foreground border-muted/30'}
                            >
                              +{ach.points} pts
                            </Badge>
                          </div>
                          
                          {isUnlocked && (
                            <p className="text-xs text-success mt-2">
                              ✓ Unlocked {new Date(userAch.unlocked_at!).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
