import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Target, Clock, Zap, Brain, TrendingUp } from 'lucide-react';
import type { SampleDeck } from '@/data/sampleDecks';
import { useTranslation } from 'react-i18next';

interface DeckDifficultyBreakdownProps {
  deck: SampleDeck;
  isVisible: boolean;
}

export function DeckDifficultyBreakdown({ deck, isVisible }: DeckDifficultyBreakdownProps) {
  const { t } = useTranslation();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return { bg: 'bg-success/20', text: 'text-success', border: 'border-success/30' };
      case 'intermediate': return { bg: 'bg-warning/20', text: 'text-warning', border: 'border-warning/30' };
      case 'expert': return { bg: 'bg-destructive/20', text: 'text-destructive', border: 'border-destructive/30' };
      default: return { bg: 'bg-muted/20', text: 'text-muted-foreground', border: 'border-muted/30' };
    }
  };

  const difficultyColors = getDifficultyColor(deck.difficulty);

  const skillCategories = [
    { key: 'cardPlacement', label: t('landing.demo.difficulty.cardPlacement'), icon: Target, description: t('landing.demo.difficulty.cardPlacementDesc') },
    { key: 'timing', label: t('landing.demo.difficulty.timing'), icon: Clock, description: t('landing.demo.difficulty.timingDesc') },
    { key: 'elixirManagement', label: t('landing.demo.difficulty.elixirManagement'), icon: Zap, description: t('landing.demo.difficulty.elixirManagementDesc') },
    { key: 'prediction', label: t('landing.demo.difficulty.prediction'), icon: Brain, description: t('landing.demo.difficulty.predictionDesc') },
    { key: 'adaptation', label: t('landing.demo.difficulty.adaptation'), icon: TrendingUp, description: t('landing.demo.difficulty.adaptationDesc') },
  ];

  const getSkillColor = (value: number) => {
    if (value <= 3) return 'from-success to-success/70';
    if (value <= 6) return 'from-warning to-warning/70';
    return 'from-destructive to-destructive/70';
  };

  // Get translated difficulty label
  const getDifficultyLabel = (difficulty: string) => {
    return t(`landing.demo.difficulty.difficultyLevels.${difficulty}`);
  };

  // Get translated learning path content
  const getLearningPathPhase = (phaseIndex: number) => {
    const phaseKey = `phase${phaseIndex + 1}`;
    return {
      name: t(`landing.demo.difficulty.deckData.${deck.learningPathKey}.${phaseKey}.name`),
      focus: t(`landing.demo.difficulty.deckData.${deck.learningPathKey}.${phaseKey}.focus`),
      tips: [
        t(`landing.demo.difficulty.deckData.${deck.learningPathKey}.${phaseKey}.tips.0`),
        t(`landing.demo.difficulty.deckData.${deck.learningPathKey}.${phaseKey}.tips.1`),
        t(`landing.demo.difficulty.deckData.${deck.learningPathKey}.${phaseKey}.tips.2`),
      ]
    };
  };

  return (
    <Card className={`p-6 bg-card/50 backdrop-blur border-${deck.color}/20 transition-all duration-700 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${deck.color}/10 border border-${deck.color}/30`}>
              <GraduationCap className={`h-5 w-5 text-${deck.color}`} />
            </div>
            <div>
              <h4 className="font-rajdhani font-bold text-lg text-foreground">{deck.name}</h4>
              <p className="text-xs text-muted-foreground">{t('landing.demo.difficulty.subtitle')}</p>
            </div>
          </div>
          <Badge className={`${difficultyColors.bg} ${difficultyColors.text} ${difficultyColors.border} uppercase font-bold`}>
            {getDifficultyLabel(deck.difficulty)}
          </Badge>
        </div>

        {/* Skill Requirements Radar */}
        <Card className="p-5 bg-card/30 border-border/30">
          <h5 className="text-sm font-rajdhani font-bold text-foreground mb-4">{t('landing.demo.difficulty.skillRequirements')}</h5>
          <div className="space-y-4">
            {skillCategories.map((category, idx) => {
              const Icon = category.icon;
              const value = deck.skillRequirements[category.key as keyof typeof deck.skillRequirements];
              return (
                <div 
                  key={category.key}
                  className={`transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                  }`}
                  style={{ transitionDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-rajdhani font-semibold text-foreground">
                        {category.label}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {value}/10
                    </Badge>
                  </div>
                  <div className="relative h-2 bg-muted/20 rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full bg-gradient-to-r ${getSkillColor(value)} transition-all duration-1000`}
                      style={{ width: isVisible ? `${value * 10}%` : '0%', transitionDelay: `${idx * 100 + 200}ms` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Learning Path */}
        <div className="space-y-4">
          <h5 className="text-sm font-rajdhani font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('landing.demo.difficulty.learningPath')}
          </h5>
          {deck.learningPath.map((_, idx) => {
            const phase = getLearningPathPhase(idx);
            return (
              <Card 
                key={idx}
                className={`p-4 bg-gradient-to-br from-${deck.color}/5 to-card border-${deck.color}/20 transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${(idx + 5) * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-${deck.color}/20 border border-${deck.color}/30 flex items-center justify-center`}>
                    <span className={`text-sm font-bold text-${deck.color}`}>{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h6 className="font-rajdhani font-bold text-foreground mb-1">{phase.name}</h6>
                    <p className={`text-sm text-${deck.color} mb-2`}>{phase.focus}</p>
                    <ul className="space-y-1">
                      {phase.tips.map((tip, tipIdx) => (
                        <li key={tipIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className={`text-${deck.color} mt-0.5`}>•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bottom Tip */}
        <Card className={`p-4 bg-${deck.color}/5 border-${deck.color}/20`}>
          <p className="text-xs text-muted-foreground">
            <span className={`font-semibold text-${deck.color}`}>{t('landing.demo.difficulty.masteryTimeline')}:</span>{' '}
            {deck.difficulty === 'beginner' && t('landing.demo.difficulty.beginnerTimeline')}
            {deck.difficulty === 'intermediate' && t('landing.demo.difficulty.intermediateTimeline')}
            {deck.difficulty === 'expert' && t('landing.demo.difficulty.expertTimeline')}
          </p>
        </Card>
      </div>
    </Card>
  );
}
