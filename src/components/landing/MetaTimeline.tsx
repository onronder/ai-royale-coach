import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, Activity } from 'lucide-react';
import type { SampleDeck } from '@/data/sampleDecks';

interface MetaTimelineProps {
  decks: SampleDeck[];
  isVisible: boolean;
}

export function MetaTimeline({ decks, isVisible }: MetaTimelineProps) {
  const patches = decks[0].history.map(h => h.patch);

  const getWinRateAtPatch = (deck: SampleDeck, patch: string) => {
    return deck.history.find(h => h.patch === patch)?.winRate || 0;
  };

  const getUsageRateAtPatch = (deck: SampleDeck, patch: string) => {
    return deck.history.find(h => h.patch === patch)?.usageRate || 0;
  };

  const maxWinRate = Math.max(...decks.flatMap(d => d.history.map(h => h.winRate)));
  const minWinRate = Math.min(...decks.flatMap(d => d.history.map(h => h.winRate)));
  const rangeWinRate = maxWinRate - minWinRate;

  const getYPosition = (winRate: number) => {
    return 100 - ((winRate - minWinRate) / rangeWinRate) * 100;
  };

  const getTrendIcon = (deck: SampleDeck) => {
    const oldestWinRate = deck.history[deck.history.length - 1].winRate;
    const newestWinRate = deck.history[0].winRate;
    const diff = newestWinRate - oldestWinRate;

    if (Math.abs(diff) < 1) return { icon: '→', color: 'text-muted-foreground', label: 'Stable' };
    if (diff > 0) return { icon: '↗', color: 'text-success', label: 'Rising' };
    return { icon: '↘', color: 'text-destructive', label: 'Declining' };
  };

  return (
    <Card className={`p-6 bg-card/50 backdrop-blur border-primary/20 transition-all duration-700 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-rajdhani font-bold text-lg text-foreground">Meta Evolution</h4>
                <Badge variant="outline" className="text-xs text-warning border-warning">Demo</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Example historical trends</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-rajdhani">
              {patches[patches.length - 1]} - {patches[0]}
            </span>
          </div>
        </div>

        {/* Graph */}
        <div className="relative h-64 bg-card/30 rounded-lg border border-border/30 p-4">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-muted-foreground">
            <span>{maxWinRate.toFixed(0)}%</span>
            <span>{((maxWinRate + minWinRate) / 2).toFixed(0)}%</span>
            <span>{minWinRate.toFixed(0)}%</span>
          </div>

          {/* Graph area */}
          <div className="ml-12 mr-4 h-full relative">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y) => (
              <div
                key={y}
                className="absolute w-full border-t border-border/20"
                style={{ top: `${y}%` }}
              />
            ))}

            {/* Lines for each deck */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {decks.map((deck, deckIdx) => {
                const points = patches.map((patch, idx) => {
                  const x = (idx / (patches.length - 1)) * 100;
                  const y = getYPosition(getWinRateAtPatch(deck, patch));
                  return `${x},${y}`;
                }).join(' ');

                const colors = {
                  primary: '#00f2fe',
                  accent: '#ff6b35',
                  success: '#22c55e',
                  warning: '#eab308',
                };

                return (
                  <polyline
                    key={deck.id}
                    points={points}
                    fill="none"
                    stroke={colors[deck.color]}
                    strokeWidth="2"
                    className={`transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                    style={{ 
                      strokeDasharray: '1000',
                      strokeDashoffset: isVisible ? '0' : '1000',
                      transitionDelay: `${deckIdx * 200}ms`
                    }}
                  />
                );
              })}
            </svg>

            {/* Data points */}
            {decks.map((deck) =>
              patches.map((patch, idx) => {
                const x = (idx / (patches.length - 1)) * 100;
                const y = getYPosition(getWinRateAtPatch(deck, patch));

                return (
                  <div
                    key={`${deck.id}-${patch}`}
                    className={`absolute w-2 h-2 rounded-full bg-${deck.color} border-2 border-card transition-all duration-500 hover:scale-150 cursor-pointer ${
                      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                    }`}
                    style={{
                      left: `calc(${x}% - 4px)`,
                      top: `calc(${y}% - 4px)`,
                      transitionDelay: `${(idx + 1) * 100}ms`,
                    }}
                    title={`${deck.name}: ${getWinRateAtPatch(deck, patch)}%`}
                  />
                );
              })
            )}
          </div>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-12 right-4 flex justify-between text-xs text-muted-foreground mt-2">
            {patches.slice().reverse().map((patch) => (
              <span key={patch} className="font-rajdhani">{patch}</span>
            ))}
          </div>
        </div>

        {/* Legend & Trends */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Legend */}
          <Card className="p-4 bg-card/30 border-border/30">
            <h5 className="text-sm font-rajdhani font-bold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Deck Legend
            </h5>
            <div className="space-y-2">
              {decks.map((deck) => (
                <div key={deck.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-${deck.color}`} />
                    <span className="text-sm text-muted-foreground">{deck.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {deck.history[0].winRate}%
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Trends */}
          <Card className="p-4 bg-card/30 border-border/30">
            <h5 className="text-sm font-rajdhani font-bold text-foreground mb-3">Recent Trends</h5>
            <div className="space-y-2">
              {decks.map((deck) => {
                const trend = getTrendIcon(deck);
                return (
                  <div key={deck.id} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{deck.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${trend.color}`}>{trend.icon}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          trend.label === 'Rising' ? 'border-success text-success' :
                          trend.label === 'Declining' ? 'border-destructive text-destructive' :
                          'border-muted-foreground text-muted-foreground'
                        }`}
                      >
                        {trend.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Insights */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-primary">Meta Insight:</span>{' '}
            {(() => {
              const highestWinRate = decks.reduce((prev, curr) => 
                curr.history[0].winRate > prev.history[0].winRate ? curr : prev
              );
              return `${highestWinRate.name} currently dominates the meta with a ${highestWinRate.history[0].winRate}% win rate. `;
            })()}
            Historical data helps predict future balance changes and meta shifts.
          </p>
        </Card>
      </div>
    </Card>
  );
}
