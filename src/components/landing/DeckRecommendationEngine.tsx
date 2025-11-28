import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, User, Swords, Shield, Zap, Target, Trophy } from 'lucide-react';
import { sampleDecks, type SampleDeck } from '@/data/sampleDecks';
import { useTranslation } from 'react-i18next';

interface RecommendationResult {
  deck: SampleDeck;
  matchScore: number;
  reasons: string[];
}

export function DeckRecommendationEngine() {
  const { t } = useTranslation();
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<'beginner' | 'intermediate' | 'expert' | null>(null);
  const [selectedPlaystyles, setSelectedPlaystyles] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const skillLevels = [
    { value: 'beginner' as const, label: t('landing.demo.recommend.skillLevels.beginner'), icon: User, description: t('landing.demo.recommend.skillLevels.beginnerDesc') },
    { value: 'intermediate' as const, label: t('landing.demo.recommend.skillLevels.intermediate'), icon: Target, description: t('landing.demo.recommend.skillLevels.intermediateDesc') },
    { value: 'expert' as const, label: t('landing.demo.recommend.skillLevels.expert'), icon: Trophy, description: t('landing.demo.recommend.skillLevels.expertDesc') },
  ];

  const playstyles = [
    { value: 'cycle', label: t('landing.demo.recommend.playstyles.cycle'), icon: Zap, description: t('landing.demo.recommend.playstyles.cycleDesc') },
    { value: 'aggressive', label: t('landing.demo.recommend.playstyles.aggressive'), icon: Swords, description: t('landing.demo.recommend.playstyles.aggressiveDesc') },
    { value: 'defensive', label: t('landing.demo.recommend.playstyles.defensive'), icon: Shield, description: t('landing.demo.recommend.playstyles.defensiveDesc') },
    { value: 'beatdown', label: t('landing.demo.recommend.playstyles.beatdown'), icon: Trophy, description: t('landing.demo.recommend.playstyles.beatdownDesc') },
    { value: 'control', label: t('landing.demo.recommend.playstyles.control'), icon: Target, description: t('landing.demo.recommend.playstyles.controlDesc') },
    { value: 'bait', label: t('landing.demo.recommend.playstyles.bait'), icon: Sparkles, description: t('landing.demo.recommend.playstyles.baitDesc') },
    { value: 'siege', label: t('landing.demo.recommend.playstyles.siege'), icon: Target, description: t('landing.demo.recommend.playstyles.siegeDesc') },
    { value: 'chip', label: t('landing.demo.recommend.playstyles.chip'), icon: Zap, description: t('landing.demo.recommend.playstyles.chipDesc') },
  ];

  const togglePlaystyle = (playstyle: string) => {
    setSelectedPlaystyles(prev => 
      prev.includes(playstyle) 
        ? prev.filter(p => p !== playstyle)
        : [...prev, playstyle]
    );
  };

  const calculateRecommendations = () => {
    if (!selectedSkillLevel) return;

    const results: RecommendationResult[] = sampleDecks.map(deck => {
      const reasons: string[] = [];
      let score = 0;

      // Skill level match (60 points max)
      if (deck.difficulty === selectedSkillLevel) {
        score += 60;
        reasons.push(t('landing.demo.recommend.reasons.perfectFor', { level: selectedSkillLevel }));
      } else if (
        (selectedSkillLevel === 'beginner' && deck.difficulty === 'intermediate') ||
        (selectedSkillLevel === 'intermediate' && deck.difficulty === 'beginner') ||
        (selectedSkillLevel === 'intermediate' && deck.difficulty === 'expert') ||
        (selectedSkillLevel === 'expert' && deck.difficulty === 'intermediate')
      ) {
        score += 30;
        reasons.push(deck.difficulty === 'beginner' 
          ? t('landing.demo.recommend.reasons.slightlyEasier') 
          : t('landing.demo.recommend.reasons.goodChallenge'));
      }

      // Playstyle match (40 points max)
      if (selectedPlaystyles.length > 0) {
        const matchingStyles = deck.playstyles.filter(style => selectedPlaystyles.includes(style));
        const playstyleScore = (matchingStyles.length / selectedPlaystyles.length) * 40;
        score += playstyleScore;
        
        if (matchingStyles.length > 0) {
          reasons.push(t('landing.demo.recommend.reasons.matchesPlaystyle', { styles: matchingStyles.join(', ') }));
        }
      } else {
        // If no playstyle selected, give partial score
        score += 20;
      }

      // Add specific deck strengths
      if (deck.stats.winRate >= 55) {
        reasons.push(t('landing.demo.recommend.reasons.highWinRate', { rate: deck.stats.winRate }));
      }
      const usageRate = (deck.history[deck.history.length - 1]?.usageRate || 0);
      if (usageRate >= 20) {
        reasons.push(t('landing.demo.recommend.reasons.popularChoice', { rate: usageRate }));
      }

      // Add skill highlights
      const topSkills = Object.entries(deck.skillRequirements)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([skill]) => skill.replace(/([A-Z])/g, ' $1').toLowerCase());
      
      if (topSkills.length > 0) {
        reasons.push(t('landing.demo.recommend.reasons.focusesOn', { skills: topSkills.join(' and ') }));
      }

      return { deck, matchScore: Math.round(score), reasons };
    });

    // Sort by match score and take top 3
    const topRecommendations = results
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);

    setRecommendations(topRecommendations);
    setShowResults(true);
  };

  const reset = () => {
    setSelectedSkillLevel(null);
    setSelectedPlaystyles([]);
    setShowResults(false);
    setRecommendations([]);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-success';
      case 'intermediate': return 'text-warning';
      case 'expert': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {!showResults ? (
        <>
          {/* Skill Level Selection */}
          <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-rajdhani font-bold text-lg text-foreground">{t('landing.demo.recommend.yourSkillLevel')}</h4>
                <p className="text-xs text-muted-foreground">{t('landing.demo.recommend.selectLevel')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {skillLevels.map((level) => {
                const Icon = level.icon;
                const isSelected = selectedSkillLevel === level.value;
                return (
                  <Card 
                    key={level.value}
                    onClick={() => setSelectedSkillLevel(level.value)}
                    className={`p-4 cursor-pointer transition-all duration-300 hover:scale-105 ${
                      isSelected 
                        ? 'bg-primary/20 border-primary/50 border-2 shadow-lg shadow-primary/20' 
                        : 'bg-card/30 border-border/30 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <Icon className={`h-8 w-8 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`text-sm font-rajdhani font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {level.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{level.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>

          {/* Playstyle Selection */}
          <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-rajdhani font-bold text-lg text-foreground">{t('landing.demo.recommend.yourPlaystyle')}</h4>
                <p className="text-xs text-muted-foreground">{t('landing.demo.recommend.selectPlaystyles')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {playstyles.map((style) => {
                const Icon = style.icon;
                const isSelected = selectedPlaystyles.includes(style.value);
                return (
                  <Card 
                    key={style.value}
                    onClick={() => togglePlaystyle(style.value)}
                    className={`p-3 cursor-pointer transition-all duration-300 hover:scale-105 ${
                      isSelected 
                        ? 'bg-primary/20 border-primary/50 border-2' 
                        : 'bg-card/30 border-border/30 hover:border-primary/30'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className={`text-xs font-rajdhani font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {style.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{style.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>

          {/* Get Recommendations Button */}
          <div className="flex justify-center">
            <Button 
              onClick={calculateRecommendations}
              disabled={!selectedSkillLevel}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-rajdhani font-bold text-lg px-8 py-6"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              {t('landing.demo.recommend.getRecommendations')}
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Results Header */}
          <Card className="p-6 bg-gradient-to-br from-primary/20 to-card border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/50">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-rajdhani font-bold text-lg text-foreground">{t('landing.demo.recommend.yourPerfectDecks')}</h4>
                  <p className="text-xs text-muted-foreground">
                    {t('landing.demo.recommend.basedOn', { level: selectedSkillLevel })}
                    {selectedPlaystyles.length > 0 && ` ${t('landing.demo.recommend.andPlaystyle', { styles: selectedPlaystyles.join(', ') })}`}
                  </p>
                </div>
              </div>
              <Button onClick={reset} variant="outline" size="sm">
                {t('landing.demo.recommend.tryAgain')}
              </Button>
            </div>
          </Card>

          {/* Recommendations */}
          <div className="space-y-4">
            {recommendations.map((result, idx) => (
              <Card 
                key={result.deck.id}
                className={`p-6 bg-card/50 backdrop-blur border-${result.deck.color}/20 animate-fade-in`}
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                <div className="space-y-4">
                  {/* Header with match score */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-${result.deck.color}/10 border border-${result.deck.color}/30`}>
                        <Trophy className={`h-5 w-5 text-${result.deck.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-rajdhani font-bold text-lg text-foreground">{result.deck.name}</h5>
                          {idx === 0 && (
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              {t('landing.demo.recommend.topPick')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{result.deck.playstyle}</p>
                      </div>
                    </div>
                    <Badge className={`bg-${result.deck.color}/20 text-${result.deck.color} border-${result.deck.color}/30 text-lg px-3 py-1`}>
                      {result.matchScore}% {t('landing.demo.recommend.match')}
                    </Badge>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs">
                    <Badge variant="outline" className={getDifficultyColor(result.deck.difficulty)}>
                      {result.deck.difficulty}
                    </Badge>
                    <span className="text-muted-foreground">{t('landing.demo.winRate')}: {result.deck.stats.winRate}%</span>
                    <span className="text-muted-foreground">{t('landing.demo.recommend.usage')}: {result.deck.history[result.deck.history.length - 1]?.usageRate || 0}%</span>
                    <span className="text-muted-foreground">{t('landing.demo.avgElixir')}: {result.deck.stats.avgElixir}</span>
                  </div>

                  {/* Cards preview */}
                  <div className="flex items-center gap-2">
                    {result.deck.cards.map((card, cardIdx) => (
                      <div 
                        key={cardIdx}
                        className="text-2xl"
                        title={card.name}
                      >
                        {card.emoji}
                      </div>
                    ))}
                  </div>

                  {/* Reasons why recommended */}
                  <Card className={`p-4 bg-${result.deck.color}/5 border-${result.deck.color}/20`}>
                    <p className="text-xs font-rajdhani font-semibold text-foreground mb-2">{t('landing.demo.recommend.whyThisDeck')}</p>
                    <ul className="space-y-1">
                      {result.reasons.map((reason, reasonIdx) => (
                        <li key={reasonIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className={`text-${result.deck.color} mt-0.5`}>✓</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>

                  {/* Playstyle tags */}
                  <div className="flex flex-wrap gap-2">
                    {result.deck.playstyles.map((style) => (
                      <Badge 
                        key={style} 
                        variant="outline"
                        className={`text-xs ${selectedPlaystyles.includes(style) ? `bg-${result.deck.color}/10 border-${result.deck.color}/30 text-${result.deck.color}` : ''}`}
                      >
                        {style}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
