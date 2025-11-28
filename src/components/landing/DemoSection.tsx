import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { useTranslation } from 'react-i18next';
import { AnimatedCounter } from './AnimatedCounter';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp, Zap, GitCompare, Network, Activity, GraduationCap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { sampleDecks } from '@/data/sampleDecks';
import type { SampleDeck } from '@/data/sampleDecks';
import { DeckComparisonView } from './DeckComparisonView';
import { CardSynergyVisualization } from './CardSynergyVisualization';
import { MetaTimeline } from './MetaTimeline';
import { DeckDifficultyBreakdown } from './DeckDifficultyBreakdown';
import { CounterDeckRecommendations } from './CounterDeckRecommendations';
import { AchievementBadges } from './AchievementBadges';
import { DeckRecommendationEngine } from './DeckRecommendationEngine';

// Map deck IDs to i18n keys for AI insights
const deckInsightKeys: Record<string, string> = {
  'hog-cycle': 'hogCycle',
  'golem-beatdown': 'golemBeatdown',
  'log-bait': 'logBait',
  'xbow-siege': 'xbowSiege',
};

export function DemoSection() {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation(0.2);
  const navigate = useNavigate();
  const sectionId = "demo-section";
  const [selectedDeck, setSelectedDeck] = useState<SampleDeck>(sampleDecks[0]);
  const [typedText, setTypedText] = useState('');
  
  // Get translated AI insight based on deck ID
  const getAiInsight = (deckId: string) => {
    const key = deckInsightKeys[deckId];
    if (key) {
      return t(`landing.demo.aiInsights.${key}`);
    }
    return selectedDeck.aiInsight; // Fallback to original
  };
  
  const fullText = getAiInsight(selectedDeck.id);

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

  const renderCardWithTooltip = (card: typeof selectedDeck.cards[0], deckColor: string) => (
    <TooltipProvider key={card.name}>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div 
            className={`aspect-square rounded-lg bg-gradient-to-br from-${deckColor}/20 to-accent/20 border border-${deckColor}/30 flex items-center justify-center text-4xl hover:scale-110 hover:shadow-glow transition-all duration-300 cursor-help`}
          >
            {card.emoji}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-border p-3">
          <div className="space-y-1">
            <p className="font-rajdhani font-bold text-foreground">{card.name}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-primary flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {card.elixir}
              </span>
              <span className={`font-semibold ${
                card.rarity === 'Legendary' ? 'text-warning' :
                card.rarity === 'Epic' ? 'text-accent' :
                card.rarity === 'Rare' ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {card.rarity}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{card.role}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <section ref={ref} id="demo-section" className="py-20 px-4 relative overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold font-rajdhani mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            {t("landing.demo.title")}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t("landing.demo.subtitle")}
          </p>
          <div className="mt-4 bg-warning/10 border-2 border-warning/30 rounded-lg p-4 max-w-3xl mx-auto shadow-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Sparkles className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-warning mb-1">{t("landing.demo.demoDataTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("landing.demo.demoDataDesc")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue={sampleDecks[0].id} className="w-full" onValueChange={(value) => {
          if (['compare', 'synergy', 'meta', 'difficulty', 'counters'].includes(value)) return;
          const deck = sampleDecks.find(d => d.id === value);
          if (deck) setSelectedDeck(deck);
        }}>
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-9 gap-1 bg-card/50 backdrop-blur p-1">
          {sampleDecks.map((deck, idx) => (
            <TabsTrigger 
              key={deck.id} 
              value={deck.id}
              className="font-rajdhani font-semibold data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-accent/20 text-[10px] md:text-xs px-2"
              style={{ transitionDelay: isVisible ? `${idx * 100}ms` : '0ms' }}
            >
              {deck.stats.archetype}
            </TabsTrigger>
          ))}
          <TabsTrigger value="compare" className="text-[10px] md:text-xs px-2">{t("landing.demo.tabs.compare")}</TabsTrigger>
          <TabsTrigger value="synergy" className="text-[10px] md:text-xs px-2">{t("landing.demo.tabs.synergy")}</TabsTrigger>
          <TabsTrigger value="meta" className="text-[10px] md:text-xs px-2">{t("landing.demo.tabs.meta")}</TabsTrigger>
          <TabsTrigger value="difficulty" className="text-[10px] md:text-xs px-2">{t("landing.demo.tabs.skills")}</TabsTrigger>
          <TabsTrigger value="counters" className="text-[10px] md:text-xs px-2">{t("landing.demo.tabs.counters")}</TabsTrigger>
          <TabsTrigger value="achievements" className="text-[10px] md:text-xs px-2">{t("landing.demo.tabs.badges")}</TabsTrigger>
          <TabsTrigger value="recommend" className="text-[10px] md:text-xs px-2">{t("landing.demo.tabs.findDeck")}</TabsTrigger>
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
                        className={`transition-all duration-300 ${
                          isVisible ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{ 
                          transitionDelay: isVisible ? `${idx * 50}ms` : '0ms'
                        }}
                      >
                        {renderCardWithTooltip(card, deck.color)}
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
                      <h4 className="font-rajdhani font-bold text-lg text-foreground">{t("landing.demo.performanceStats")}</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t("landing.demo.winRate")}</span>
                        <span className={`text-2xl text-${deck.color}`}>
                          {isVisible && selectedDeck.id === deck.id && (
                            <AnimatedCounter end={deck.stats.winRate} decimals={1} suffix="%" delay={200} />
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t("landing.demo.avgElixir")}</span>
                        <span className="text-2xl text-accent">
                          {isVisible && selectedDeck.id === deck.id && (
                            <AnimatedCounter end={deck.stats.avgElixir} decimals={1} delay={400} />
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t("landing.demo.deckComplexity")}</span>
                        <span className={`text-2xl text-${deck.color}`}>
                          {isVisible && selectedDeck.id === deck.id && (
                            <AnimatedCounter end={deck.stats.synergyScore} decimals={1} suffix="/10" delay={600} />
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/70 italic mt-2">
                        {t("landing.demo.demoMetrics")}
                      </p>
                    </div>
                  </Card>

                  {/* AI Insight */}
                  <Card className={`p-6 bg-gradient-to-br from-${deck.color}/10 to-accent/10 border-${deck.color}/30 transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                  }`} style={{ transitionDelay: '400ms' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className={`h-5 w-5 text-${deck.color} animate-pulse-glow`} />
                      <h4 className="font-rajdhani font-bold text-foreground">{t("landing.demo.aiCoachInsight")}</h4>
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
                    {t("landing.demo.tryWithYourDeck")}
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}

          {/* Difficulty & Skills Tab */}
          <TabsContent value="difficulty" className="mt-0">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold font-rajdhani mb-2 text-foreground">
                  {t("landing.demo.skillsTitle")}
                </h3>
                <p className="text-muted-foreground">
                  {t("landing.demo.skillsSubtitle")}
                </p>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                {sampleDecks.map((deck) => (
                  <DeckDifficultyBreakdown key={deck.id} deck={deck} isVisible={isVisible} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Counter Analysis Tab */}
          <TabsContent value="counters" className="mt-0">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold font-rajdhani mb-2 text-foreground">
                  {t("landing.demo.countersTitle")}
                </h3>
                <p className="text-muted-foreground">
                  {t("landing.demo.countersSubtitle")}
                </p>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                {sampleDecks.map((deck) => (
                  <CounterDeckRecommendations key={deck.id} deck={deck} isVisible={isVisible} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="mt-0">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold font-rajdhani mb-2 text-foreground">
                  {t("landing.demo.badgesTitle")}
                </h3>
                <p className="text-muted-foreground">
                  {t("landing.demo.badgesSubtitle")}
                </p>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                {sampleDecks.map((deck) => (
                  <AchievementBadges key={deck.id} deck={deck} isVisible={isVisible} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Deck Recommendation Engine Tab */}
          <TabsContent value="recommend" className="mt-0">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold font-rajdhani mb-2 text-foreground">
                  {t("landing.demo.findDeckTitle")}
                </h3>
                <p className="text-muted-foreground">
                  {t("landing.demo.findDeckSubtitle")}
                </p>
              </div>
              <DeckRecommendationEngine />
            </div>
          </TabsContent>

          {/* Synergy Tab */}
          <TabsContent value="synergy" className="mt-0">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold font-rajdhani mb-2 text-foreground">
                  {t("landing.demo.synergyTitle")}
                </h3>
                <p className="text-muted-foreground">
                  {t("landing.demo.synergySubtitle")}
                </p>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                {sampleDecks.map((deck) => (
                  <CardSynergyVisualization key={deck.id} deck={deck} isVisible={isVisible} />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Meta Timeline Tab */}
          <TabsContent value="meta" className="mt-0">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold font-rajdhani mb-2 text-foreground">
                  {t("landing.demo.metaTitle")}
                </h3>
                <p className="text-muted-foreground">
                  {t("landing.demo.metaSubtitle")}
                </p>
              </div>
              <MetaTimeline decks={sampleDecks} isVisible={isVisible} />
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="compare" className="mt-0">
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-bold font-rajdhani mb-2 text-foreground">
                  {t("landing.demo.compareTitle")}
                </h3>
                <p className="text-muted-foreground">
                  {t("landing.demo.compareSubtitle")}
                </p>
              </div>
              <DeckComparisonView isVisible={isVisible} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
