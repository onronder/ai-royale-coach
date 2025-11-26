import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { AnimatedCounter } from './AnimatedCounter';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { sampleDecks } from '@/data/sampleDecks';
import type { SampleDeck } from '@/data/sampleDecks';

export function DemoSection() {
  const { ref, isVisible } = useScrollAnimation(0.2);
  const navigate = useNavigate();
  const [selectedDeck, setSelectedDeck] = useState<SampleDeck>(sampleDecks[0]);
  const [typedText, setTypedText] = useState('');
  const fullText = selectedDeck.aiInsight;

  // Reset typewriter when deck changes
  useEffect(() => {
    setTypedText('');
  }, [selectedDeck.id]);

  useEffect(() => {
    if (!isVisible) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [isVisible, fullText]);

  const colorMap = {
    primary: 'border-primary/20 hover:border-primary/50',
    accent: 'border-accent/20 hover:border-accent/50',
    success: 'border-success/20 hover:border-success/50',
    warning: 'border-warning/20 hover:border-warning/50',
  };

  return (
    <section ref={ref} className="py-20 px-4 relative overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-rajdhani mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            See AI Royal in Action
          </h2>
          <p className="text-muted-foreground text-lg">
            Experience intelligent deck analysis across different archetypes
          </p>
        </div>

        <Tabs defaultValue={sampleDecks[0].id} className="w-full" onValueChange={(value) => {
          const deck = sampleDecks.find(d => d.id === value);
          if (deck) setSelectedDeck(deck);
        }}>
          {/* Deck Archetype Tabs */}
          <TabsList className={`grid w-full grid-cols-2 md:grid-cols-4 mb-8 bg-card/50 transition-all duration-500 ${
            isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            {sampleDecks.map((deck, idx) => (
              <TabsTrigger 
                key={deck.id} 
                value={deck.id}
                className="font-rajdhani font-semibold data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-accent/20"
                style={{ transitionDelay: isVisible ? `${idx * 100}ms` : '0ms' }}
              >
                {deck.stats.archetype}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Deck Content */}
          {sampleDecks.map((deck) => (
            <TabsContent key={deck.id} value={deck.id} className="mt-0">
              <div className={`grid lg:grid-cols-2 gap-8 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}>
                {/* Cards Grid */}
                <Card className={`p-6 bg-card/50 backdrop-blur ${colorMap[deck.color]} transition-all`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-rajdhani font-bold text-foreground">
                      {deck.name}
                    </h3>
                    <span className={`text-sm px-3 py-1 rounded-full bg-${deck.color}/10 text-${deck.color} font-rajdhani font-semibold border border-${deck.color}/30`}>
                      {deck.stats.archetype}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {deck.cards.map((card, idx) => (
                      <div 
                        key={card.name}
                        className={`aspect-square rounded-lg bg-gradient-to-br from-${deck.color}/20 to-accent/20 border border-${deck.color}/30 flex items-center justify-center text-4xl hover:scale-110 hover:shadow-glow transition-all duration-300 ${
                          isVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ 
                          transitionDelay: isVisible ? `${idx * 50}ms` : '0ms'
                        }}
                      >
                        {card.emoji}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Stats Panel */}
                <div className="space-y-4">
                  <Card className={`p-6 bg-card/50 backdrop-blur ${colorMap[deck.color]} transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                  }`} style={{ transitionDelay: '200ms' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className={`h-5 w-5 text-${deck.color}`} />
                      <h4 className="font-rajdhani font-bold text-lg text-foreground">Performance Stats</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Win Rate</span>
                        <span className={`text-2xl text-${deck.color}`}>
                          {isVisible && selectedDeck.id === deck.id && (
                            <AnimatedCounter end={deck.stats.winRate} decimals={1} suffix="%" delay={200} />
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Avg Elixir</span>
                        <span className="text-2xl text-accent">
                          {isVisible && selectedDeck.id === deck.id && (
                            <AnimatedCounter end={deck.stats.avgElixir} decimals={1} delay={400} />
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Synergy Score</span>
                        <span className={`text-2xl text-${deck.color}`}>
                          {isVisible && selectedDeck.id === deck.id && (
                            <AnimatedCounter end={deck.stats.synergyScore} decimals={1} suffix="/10" delay={600} />
                          )}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* AI Insight */}
                  <Card className={`p-6 bg-gradient-to-br from-${deck.color}/10 to-accent/10 border-${deck.color}/30 transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                  }`} style={{ transitionDelay: '400ms' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className={`h-5 w-5 text-${deck.color} animate-pulse-glow`} />
                      <h4 className="font-rajdhani font-bold text-foreground">AI Coach Insight</h4>
                    </div>
                    <p className="text-muted-foreground leading-relaxed min-h-[100px]">
                      {selectedDeck.id === deck.id && typedText}
                      {selectedDeck.id === deck.id && typedText.length < fullText.length && (
                        <span className={`inline-block w-1 h-4 bg-${deck.color} ml-1 animate-pulse`} />
                      )}
                    </p>
                  </Card>

                  <Button 
                    onClick={() => navigate('/auth')}
                    className={`w-full shadow-${deck.color === 'primary' ? 'glow' : deck.color + '-glow'} hover:scale-105 transition-transform`}
                    size="lg"
                  >
                    <Zap className="mr-2 h-5 w-5" />
                    Try with YOUR Deck
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
