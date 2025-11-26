import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, User, Swords, Shield, Zap, Target, Trophy } from 'lucide-react';
import { sampleDecks, type SampleDeck } from '@/data/sampleDecks';

interface RecommendationResult {
  deck: SampleDeck;
  matchScore: number;
  reasons: string[];
}

export function DeckRecommendationEngine() {
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<'beginner' | 'intermediate' | 'expert' | null>(null);
  const [selectedPlaystyles, setSelectedPlaystyles] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const skillLevels = [
    { value: 'beginner' as const, label: 'Beginner', icon: User, description: 'New to the game or deck archetype' },
    { value: 'intermediate' as const, label: 'Intermediate', icon: Target, description: 'Comfortable with basics, learning advanced tactics' },
    { value: 'expert' as const, label: 'Expert', icon: Trophy, description: 'Mastered mechanics, ready for competitive play' },
  ];

  const playstyles = [
    { value: 'cycle', label: 'Fast Cycle', icon: Zap, description: 'Quick cards, constant pressure' },
    { value: 'aggressive', label: 'Aggressive', icon: Swords, description: 'Offensive pushes, high pressure' },
    { value: 'defensive', label: 'Defensive', icon: Shield, description: 'Strong defense, counter-attacks' },
    { value: 'beatdown', label: 'Beatdown', icon: Trophy, description: 'Heavy pushes, massive damage' },
    { value: 'control', label: 'Control', icon: Target, description: 'Board control, strategic plays' },
    { value: 'bait', label: 'Bait', icon: Sparkles, description: 'Trick opponents, spell cycling' },
    { value: 'siege', label: 'Siege', icon: Target, description: 'Long-range damage, building focus' },
    { value: 'chip', label: 'Chip Damage', icon: Zap, description: 'Small consistent damage' },
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
        reasons.push(`Perfect for ${selectedSkillLevel} players`);
      } else if (
        (selectedSkillLevel === 'beginner' && deck.difficulty === 'intermediate') ||
        (selectedSkillLevel === 'intermediate' && deck.difficulty === 'beginner') ||
        (selectedSkillLevel === 'intermediate' && deck.difficulty === 'expert') ||
        (selectedSkillLevel === 'expert' && deck.difficulty === 'intermediate')
      ) {
        score += 30;
        reasons.push(`${deck.difficulty === 'beginner' ? 'Slightly easier' : 'Good challenge'} for your skill level`);
      }

      // Playstyle match (40 points max)
      if (selectedPlaystyles.length > 0) {
        const matchingStyles = deck.playstyles.filter(style => selectedPlaystyles.includes(style));
        const playstyleScore = (matchingStyles.length / selectedPlaystyles.length) * 40;
        score += playstyleScore;
        
        if (matchingStyles.length > 0) {
          reasons.push(`Matches your ${matchingStyles.join(', ')} playstyle`);
        }
      } else {
        // If no playstyle selected, give partial score
        score += 20;
      }

      // Add specific deck strengths
      if (deck.stats.winRate >= 55) {
        reasons.push(`High win rate (${deck.stats.winRate}%) in current meta`);
      }
      const usageRate = (deck.history[deck.history.length - 1]?.usageRate || 0);
      if (usageRate >= 20) {
        reasons.push(`Popular choice (${usageRate}% usage rate)`);
      }

      // Add skill highlights
      const topSkills = Object.entries(deck.skillRequirements)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2)
        .map(([skill]) => skill.replace(/([A-Z])/g, ' $1').toLowerCase());
      
      if (topSkills.length > 0) {
        reasons.push(`Focuses on ${topSkills.join(' and ')} skills`);
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
                <h4 className="font-rajdhani font-bold text-lg text-foreground">Your Skill Level</h4>
                <p className="text-xs text-muted-foreground">Select your current experience level</p>
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
                <h4 className="font-rajdhani font-bold text-lg text-foreground">Your Playstyle</h4>
                <p className="text-xs text-muted-foreground">Select one or more playstyles you enjoy (optional)</p>
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
              Get Deck Recommendations
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
                  <h4 className="font-rajdhani font-bold text-lg text-foreground">Your Perfect Decks</h4>
                  <p className="text-xs text-muted-foreground">
                    Based on {selectedSkillLevel} skill level
                    {selectedPlaystyles.length > 0 && ` and ${selectedPlaystyles.join(', ')} playstyle`}
                  </p>
                </div>
              </div>
              <Button onClick={reset} variant="outline" size="sm">
                Try Again
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
                              Top Pick
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{result.deck.playstyle}</p>
                      </div>
                    </div>
                    <Badge className={`bg-${result.deck.color}/20 text-${result.deck.color} border-${result.deck.color}/30 text-lg px-3 py-1`}>
                      {result.matchScore}% Match
                    </Badge>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs">
                    <Badge variant="outline" className={getDifficultyColor(result.deck.difficulty)}>
                      {result.deck.difficulty}
                    </Badge>
                    <span className="text-muted-foreground">Win Rate: {result.deck.stats.winRate}%</span>
                    <span className="text-muted-foreground">Usage: {result.deck.history[result.deck.history.length - 1]?.usageRate || 0}%</span>
                    <span className="text-muted-foreground">Avg Elixir: {result.deck.stats.avgElixir}</span>
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
                    <p className="text-xs font-rajdhani font-semibold text-foreground mb-2">Why This Deck?</p>
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
