import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { AnimatedCounter } from './AnimatedCounter';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const sampleDeck = {
  name: "Hog 2.6 Cycle",
  cards: [
    { name: "Hog Rider", emoji: "🐗" },
    { name: "Musketeer", emoji: "🔫" },
    { name: "Ice Golem", emoji: "🧊" },
    { name: "Cannon", emoji: "🎯" },
    { name: "Fireball", emoji: "🔥" },
    { name: "Log", emoji: "🪵" },
    { name: "Skeletons", emoji: "💀" },
    { name: "Ice Spirit", emoji: "❄️" }
  ],
  stats: {
    winRate: 58.2,
    avgElixir: 2.6,
    synergyScore: 8.5,
    archetype: "Cycle"
  },
  aiInsight: "Your Musketeer positioning is excellent for defense. Consider using Ice Golem to kite enemy troops while your Hog connects for extra damage. Fireball value can be improved by waiting for medium-sized pushes."
};

export function DemoSection() {
  const { ref, isVisible } = useScrollAnimation(0.2);
  const navigate = useNavigate();
  const [typedText, setTypedText] = useState('');
  const fullText = sampleDeck.aiInsight;

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

  return (
    <section ref={ref} className="py-20 px-4 relative overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-rajdhani mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            See AI Royal in Action
          </h2>
          <p className="text-muted-foreground text-lg">
            Experience intelligent deck analysis powered by AI
          </p>
        </div>

        <div className={`grid lg:grid-cols-2 gap-8 transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          {/* Cards Grid */}
          <Card className="p-6 bg-card/50 backdrop-blur border-primary/20">
            <h3 className="text-xl font-rajdhani font-bold mb-4 text-foreground">
              {sampleDeck.name}
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {sampleDeck.cards.map((card, idx) => (
                <div 
                  key={card.name}
                  className={`aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center text-4xl hover:scale-110 hover:shadow-glow transition-all duration-300 ${
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
            <Card className={`p-6 bg-card/50 backdrop-blur border-primary/20 transition-all duration-500 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`} style={{ transitionDelay: '200ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h4 className="font-rajdhani font-bold text-lg text-foreground">Performance Stats</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className="text-2xl text-primary">
                    {isVisible && <AnimatedCounter end={sampleDeck.stats.winRate} decimals={1} suffix="%" delay={200} />}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Avg Elixir</span>
                  <span className="text-2xl text-accent">
                    {isVisible && <AnimatedCounter end={sampleDeck.stats.avgElixir} decimals={1} delay={400} />}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Synergy Score</span>
                  <span className="text-2xl text-primary">
                    {isVisible && <AnimatedCounter end={sampleDeck.stats.synergyScore} decimals={1} suffix="/10" delay={600} />}
                  </span>
                </div>
              </div>
            </Card>

            {/* AI Insight */}
            <Card className={`p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/30 transition-all duration-500 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
            }`} style={{ transitionDelay: '400ms' }}>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary animate-pulse-glow" />
                <h4 className="font-rajdhani font-bold text-foreground">AI Coach Insight</h4>
              </div>
              <p className="text-muted-foreground leading-relaxed min-h-[80px]">
                {typedText}
                {typedText.length < fullText.length && (
                  <span className="inline-block w-1 h-4 bg-primary ml-1 animate-pulse" />
                )}
              </p>
            </Card>

            <Button 
              onClick={() => navigate('/auth')}
              className="w-full shadow-glow hover:scale-105 transition-transform"
              size="lg"
            >
              <Zap className="mr-2 h-5 w-5" />
              Try with YOUR Deck
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
