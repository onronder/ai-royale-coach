import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Clock, Zap, Brain, TrendingUp, Award, CheckCircle2 } from 'lucide-react';
import type { SampleDeck } from '@/data/sampleDecks';

interface AchievementBadgesProps {
  deck: SampleDeck;
  isVisible: boolean;
}

interface SkillMilestone {
  name: string;
  icon: any;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond' | 'master';
  progress: number;
  unlocked: boolean;
}

export function AchievementBadges({ deck, isVisible }: AchievementBadgesProps) {
  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'master':
        return { color: 'hsl(var(--primary))', bg: 'bg-primary/20', border: 'border-primary/30' };
      case 'diamond':
        return { color: '#00ced1', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' };
      case 'gold':
        return { color: '#ffd700', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
      case 'silver':
        return { color: '#c0c0c0', bg: 'bg-gray-400/20', border: 'border-gray-400/30' };
      default:
        return { color: '#cd7f32', bg: 'bg-orange-800/20', border: 'border-orange-800/30' };
    }
  };

  const getSkillTier = (value: number): 'bronze' | 'silver' | 'gold' | 'diamond' | 'master' => {
    if (value >= 9) return 'master';
    if (value >= 7) return 'diamond';
    if (value >= 5) return 'gold';
    if (value >= 3) return 'silver';
    return 'bronze';
  };

  const skillMilestones: SkillMilestone[] = [
    {
      name: 'Card Placement',
      icon: Target,
      tier: getSkillTier(deck.skillRequirements.cardPlacement),
      progress: deck.skillRequirements.cardPlacement * 10,
      unlocked: deck.skillRequirements.cardPlacement >= 5,
    },
    {
      name: 'Timing',
      icon: Clock,
      tier: getSkillTier(deck.skillRequirements.timing),
      progress: deck.skillRequirements.timing * 10,
      unlocked: deck.skillRequirements.timing >= 5,
    },
    {
      name: 'Elixir Management',
      icon: Zap,
      tier: getSkillTier(deck.skillRequirements.elixirManagement),
      progress: deck.skillRequirements.elixirManagement * 10,
      unlocked: deck.skillRequirements.elixirManagement >= 5,
    },
    {
      name: 'Prediction',
      icon: Brain,
      tier: getSkillTier(deck.skillRequirements.prediction),
      progress: deck.skillRequirements.prediction * 10,
      unlocked: deck.skillRequirements.prediction >= 5,
    },
    {
      name: 'Adaptation',
      icon: TrendingUp,
      tier: getSkillTier(deck.skillRequirements.adaptation),
      progress: deck.skillRequirements.adaptation * 10,
      unlocked: deck.skillRequirements.adaptation >= 5,
    },
  ];

  const learningMilestones = deck.learningPath.map((phase, idx) => ({
    phase: phase.phase,
    completed: idx < 2, // Demo: show first 2 phases as completed
    current: idx === 2,
  }));

  const totalSkillScore = Object.values(deck.skillRequirements).reduce((a, b) => a + b, 0);
  const maxScore = 50;
  const overallProgress = (totalSkillScore / maxScore) * 100;

  return (
    <Card className={`p-6 bg-card/50 backdrop-blur border-${deck.color}/20 transition-all duration-700 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${deck.color}/10 border border-${deck.color}/30`}>
              <Trophy className={`h-5 w-5 text-${deck.color}`} />
            </div>
            <div>
              <h4 className="font-rajdhani font-bold text-lg text-foreground">{deck.name} Achievements</h4>
              <p className="text-xs text-muted-foreground">Track your mastery progress</p>
            </div>
          </div>
          <Badge className={`bg-${deck.color}/20 text-${deck.color} border-${deck.color}/30 text-sm`}>
            {Math.round(overallProgress)}% Mastery
          </Badge>
        </div>

        {/* Overall Progress */}
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-card border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-rajdhani font-semibold text-foreground">Overall Deck Mastery</span>
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div className="relative h-3 bg-muted/20 rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-1000"
              style={{ width: isVisible ? `${overallProgress}%` : '0%' }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Complete all skill challenges and learning phases to master this deck
          </p>
        </Card>

        {/* Skill Badges */}
        <div>
          <h5 className="text-sm font-rajdhani font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Skill Badges
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {skillMilestones.map((milestone, idx) => {
              const Icon = milestone.icon;
              const tierInfo = getTierInfo(milestone.tier);
              return (
                <Card 
                  key={milestone.name}
                  className={`p-4 ${tierInfo.bg} ${tierInfo.border} transition-all duration-500 ${
                    isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  } ${milestone.unlocked ? 'border-2' : 'opacity-50'}`}
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="relative">
                      <Icon 
                        className="h-8 w-8" 
                        style={{ color: tierInfo.color }}
                      />
                      {milestone.unlocked && (
                        <CheckCircle2 
                          className="h-4 w-4 absolute -top-1 -right-1 bg-card rounded-full"
                          style={{ color: tierInfo.color }}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-rajdhani font-bold text-foreground">{milestone.name}</p>
                      <Badge 
                        variant="outline" 
                        className="mt-1 text-[10px] uppercase"
                        style={{ borderColor: tierInfo.color, color: tierInfo.color }}
                      >
                        {milestone.tier}
                      </Badge>
                    </div>
                    <div className="w-full h-1 bg-muted/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-1000"
                        style={{ 
                          width: isVisible ? `${milestone.progress}%` : '0%',
                          backgroundColor: tierInfo.color,
                          transitionDelay: `${idx * 100 + 200}ms`
                        }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Learning Path Milestones */}
        <div>
          <h5 className="text-sm font-rajdhani font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Learning Path Progress
          </h5>
          <div className="space-y-3">
            {learningMilestones.map((milestone, idx) => (
              <Card 
                key={milestone.phase}
                className={`p-4 transition-all duration-500 ${
                  milestone.completed 
                    ? `bg-gradient-to-br from-${deck.color}/10 to-card border-${deck.color}/30 border-2`
                    : milestone.current
                    ? `bg-${deck.color}/5 border-${deck.color}/20 border-2 border-dashed`
                    : 'bg-card/30 border-border/30 opacity-60'
                } ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                style={{ transitionDelay: `${(idx + 5) * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full ${
                    milestone.completed 
                      ? `bg-${deck.color}/20 border-2 border-${deck.color}/50`
                      : milestone.current
                      ? `bg-${deck.color}/10 border-2 border-${deck.color}/30 border-dashed`
                      : 'bg-muted/20 border border-muted/30'
                  } flex items-center justify-center`}>
                    {milestone.completed ? (
                      <CheckCircle2 className={`h-5 w-5 text-${deck.color}`} />
                    ) : (
                      <span className={`text-sm font-bold ${milestone.current ? `text-${deck.color}` : 'text-muted-foreground'}`}>
                        {idx + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-rajdhani font-bold ${
                      milestone.completed || milestone.current ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {milestone.phase}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.completed 
                        ? '✓ Completed' 
                        : milestone.current 
                        ? 'In Progress' 
                        : 'Locked'}
                    </p>
                  </div>
                  {milestone.completed && (
                    <Badge className={`bg-${deck.color}/20 text-${deck.color} border-${deck.color}/30`}>
                      <Trophy className="h-3 w-3 mr-1" />
                      Mastered
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Next Milestone */}
        <Card className={`p-4 bg-gradient-to-br from-${deck.color}/5 to-card border-${deck.color}/20`}>
          <p className="text-xs text-muted-foreground">
            <span className={`font-semibold text-${deck.color}`}>Next Milestone:</span>{' '}
            Complete {learningMilestones.find(m => m.current)?.phase || 'Foundation Phase'} to unlock new achievements and advance your mastery level.
          </p>
        </Card>
      </div>
    </Card>
  );
}
