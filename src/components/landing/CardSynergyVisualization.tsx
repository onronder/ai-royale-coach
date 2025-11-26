import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, Sparkles } from 'lucide-react';
import type { SampleDeck, CardSynergy } from '@/data/sampleDecks';
import { useState } from 'react';

interface CardSynergyVisualizationProps {
  deck: SampleDeck;
  isVisible: boolean;
}

export function CardSynergyVisualization({ deck, isVisible }: CardSynergyVisualizationProps) {
  const [selectedSynergy, setSelectedSynergy] = useState<CardSynergy | null>(null);

  const getStrengthColor = (strength: number) => {
    if (strength >= 90) return 'from-success to-success/70';
    if (strength >= 75) return 'from-primary to-primary/70';
    if (strength >= 60) return 'from-accent to-accent/70';
    return 'from-muted to-muted/70';
  };

  const getStrengthLabel = (strength: number) => {
    if (strength >= 90) return 'Exceptional';
    if (strength >= 75) return 'Strong';
    if (strength >= 60) return 'Good';
    return 'Moderate';
  };

  const getCardEmoji = (cardName: string) => {
    const card = deck.cards.find(c => c.name === cardName);
    return card?.emoji || '🃏';
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
              <Network className={`h-5 w-5 text-${deck.color}`} />
            </div>
            <div>
              <h4 className="font-rajdhani font-bold text-lg text-foreground">Card Synergies</h4>
              <p className="text-xs text-muted-foreground">Interactive combinations</p>
            </div>
          </div>
          <Badge className={`bg-${deck.color}/20 text-${deck.color} border-${deck.color}/30`}>
            {deck.synergies.length} Combos
          </Badge>
        </div>

        {/* Synergy Grid */}
        <div className="grid gap-3">
          {deck.synergies.map((synergy, idx) => (
            <div
              key={`${synergy.card1}-${synergy.card2}`}
              className={`group relative p-4 rounded-lg border border-border/50 hover:border-${deck.color}/50 transition-all cursor-pointer ${
                selectedSynergy === synergy ? `bg-${deck.color}/10 border-${deck.color}/50` : 'bg-card/30 hover:bg-card/50'
              } ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
              style={{ transitionDelay: `${idx * 100}ms` }}
              onClick={() => setSelectedSynergy(selectedSynergy === synergy ? null : synergy)}
            >
              <div className="flex items-center gap-4">
                {/* Card 1 */}
                <div className="flex items-center gap-2 flex-1">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getStrengthColor(synergy.strength)} flex items-center justify-center text-2xl border border-${deck.color}/20 group-hover:scale-110 transition-transform`}>
                    {getCardEmoji(synergy.card1)}
                  </div>
                  <span className="text-sm font-rajdhani font-semibold text-foreground truncate">
                    {synergy.card1}
                  </span>
                </div>

                {/* Connection */}
                <div className="flex flex-col items-center gap-1">
                  <Sparkles className={`h-4 w-4 text-${deck.color} group-hover:animate-pulse-glow`} />
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      synergy.strength >= 90 ? 'border-success text-success' :
                      synergy.strength >= 75 ? 'border-primary text-primary' :
                      synergy.strength >= 60 ? 'border-accent text-accent' :
                      'border-muted-foreground text-muted-foreground'
                    }`}
                  >
                    {synergy.strength}%
                  </Badge>
                </div>

                {/* Card 2 */}
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-sm font-rajdhani font-semibold text-foreground truncate">
                    {synergy.card2}
                  </span>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getStrengthColor(synergy.strength)} flex items-center justify-center text-2xl border border-${deck.color}/20 group-hover:scale-110 transition-transform`}>
                    {getCardEmoji(synergy.card2)}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedSynergy === synergy && (
                <div className={`mt-4 pt-4 border-t border-${deck.color}/20 animate-fade-in-up`}>
                  <div className="flex items-start gap-3">
                    <Badge className={`${
                      synergy.strength >= 90 ? 'bg-success/20 text-success border-success/30' :
                      synergy.strength >= 75 ? 'bg-primary/20 text-primary border-primary/30' :
                      synergy.strength >= 60 ? 'bg-accent/20 text-accent border-accent/30' :
                      'bg-muted/20 text-muted-foreground border-muted/30'
                    }`}>
                      {getStrengthLabel(synergy.strength)}
                    </Badge>
                    <p className="text-sm text-muted-foreground flex-1">
                      {synergy.reason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <Card className={`p-4 bg-${deck.color}/5 border-${deck.color}/20`}>
          <p className="text-xs text-muted-foreground">
            <span className={`font-semibold text-${deck.color}`}>Pro Tip:</span>{' '}
            Click on any synergy to learn why these cards work well together. Master these combinations to maximize your deck's potential!
          </p>
        </Card>
      </div>
    </Card>
  );
}
