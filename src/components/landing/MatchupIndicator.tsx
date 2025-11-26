import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
import type { MatchupData } from '@/data/sampleDecks';

interface MatchupIndicatorProps {
  deck1Name: string;
  deck2Name: string;
  deck1Matchup: MatchupData | undefined;
  deck2Matchup: MatchupData | undefined;
  isVisible: boolean;
}

export function MatchupIndicator({ 
  deck1Name, 
  deck2Name, 
  deck1Matchup, 
  deck2Matchup,
  isVisible 
}: MatchupIndicatorProps) {
  if (!deck1Matchup || !deck2Matchup) return null;

  const deck1WinRate = deck1Matchup.winRate;
  const deck2WinRate = deck2Matchup.winRate;
  const diff = Math.abs(deck1WinRate - deck2WinRate);

  const getAdvantage = () => {
    if (diff < 5) return 'even';
    return deck1WinRate > deck2WinRate ? 'deck1' : 'deck2';
  };

  const advantage = getAdvantage();

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'favored': return 'text-success border-success bg-success/10';
      case 'even': return 'text-warning border-warning bg-warning/10';
      case 'unfavored': return 'text-destructive border-destructive bg-destructive/10';
      default: return 'text-muted-foreground border-border bg-muted/10';
    }
  };

  const getAdvantageIcon = () => {
    if (advantage === 'even') return Minus;
    return advantage === 'deck1' ? TrendingUp : TrendingDown;
  };

  const AdvantageIcon = getAdvantageIcon();

  return (
    <Card className={`p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 transition-all duration-700 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
              <Swords className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-rajdhani font-bold text-lg text-foreground">Matchup Analysis</h4>
              <p className="text-xs text-muted-foreground">Head-to-head performance</p>
            </div>
          </div>
          
          <Badge className={`${
            advantage === 'even' 
              ? 'bg-warning/20 text-warning border-warning/30' 
              : advantage === 'deck1'
              ? 'bg-primary/20 text-primary border-primary/30'
              : 'bg-accent/20 text-accent border-accent/30'
          } flex items-center gap-1`}>
            <AdvantageIcon className="h-3 w-3" />
            {advantage === 'even' ? 'Even Matchup' : advantage === 'deck1' ? `${deck1Name} Favored` : `${deck2Name} Favored`}
          </Badge>
        </div>

        {/* Visual Win Rate Comparison */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-rajdhani font-semibold text-foreground w-32 truncate">
              {deck1Name}
            </span>
            <div className="flex-1 relative h-8 bg-muted/20 rounded-full overflow-hidden border border-border/30">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-1000 flex items-center justify-end pr-2"
                style={{ width: isVisible ? `${deck1WinRate}%` : '0%' }}
              >
                <span className="text-xs font-bold text-primary-foreground">{deck1WinRate}%</span>
              </div>
            </div>
            <Badge className={getDifficultyColor(deck1Matchup.difficulty)} variant="outline">
              {deck1Matchup.difficulty}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-rajdhani font-semibold text-foreground w-32 truncate">
              {deck2Name}
            </span>
            <div className="flex-1 relative h-8 bg-muted/20 rounded-full overflow-hidden border border-border/30">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-accent/80 to-accent transition-all duration-1000 flex items-center justify-end pr-2"
                style={{ width: isVisible ? `${deck2WinRate}%` : '0%', transitionDelay: '150ms' }}
              >
                <span className="text-xs font-bold text-accent-foreground">{deck2WinRate}%</span>
              </div>
            </div>
            <Badge className={getDifficultyColor(deck2Matchup.difficulty)} variant="outline">
              {deck2Matchup.difficulty}
            </Badge>
          </div>
        </div>

        {/* Tactical Tips */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h5 className="text-sm font-rajdhani font-bold text-foreground">{deck1Name} Tips</h5>
            </div>
            <ul className="space-y-2">
              {deck1Matchup.tacticalTips.map((tip, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-primary/10">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-primary">Key Cards:</span>{' '}
                {deck1Matchup.keyCards.join(', ')}
              </p>
            </div>
          </Card>

          <Card className="p-4 bg-accent/5 border-accent/20">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-accent" />
              <h5 className="text-sm font-rajdhani font-bold text-foreground">{deck2Name} Tips</h5>
            </div>
            <ul className="space-y-2">
              {deck2Matchup.tacticalTips.map((tip, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-accent/10">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-accent">Key Cards:</span>{' '}
                {deck2Matchup.keyCards.join(', ')}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Card>
  );
}
