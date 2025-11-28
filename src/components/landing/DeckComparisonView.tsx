import { Card } from '@/components/ui/card';
import { AnimatedCounter } from './AnimatedCounter';
import { sampleDecks } from '@/data/sampleDecks';
import type { SampleDeck } from '@/data/sampleDecks';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus, Target, Shield, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MatchupIndicator } from './MatchupIndicator';

interface DeckComparisonViewProps {
  isVisible: boolean;
}

// Helper to convert deck ID to translation key
const getDeckKey = (deckId: string): string => {
  const keyMap: Record<string, string> = {
    'hog-cycle': 'hogCycle',
    'golem-beatdown': 'golemBeatdown',
    'log-bait': 'logBait',
    'xbow-siege': 'xbowSiege'
  };
  return keyMap[deckId] || deckId;
};

export function DeckComparisonView({ isVisible }: DeckComparisonViewProps) {
  const { t } = useTranslation();
  const [deck1, setDeck1] = useState<SampleDeck>(sampleDecks[0]);
  const [deck2, setDeck2] = useState<SampleDeck>(sampleDecks[1]);

  const getStatDiff = (stat1: number, stat2: number) => {
    const diff = stat1 - stat2;
    if (Math.abs(diff) < 0.1) return { icon: Minus, color: 'text-muted-foreground', text: '0' };
    if (diff > 0) return { icon: ArrowUpRight, color: 'text-success', text: `+${diff.toFixed(1)}` };
    return { icon: ArrowDownRight, color: 'text-destructive', text: diff.toFixed(1) };
  };

  // Get translated deck data
  const getTranslatedStrengths = (deck: SampleDeck) => {
    const key = getDeckKey(deck.id);
    const strengths = t(`landing.demo.difficulty.deckData.${key}.strengths`, { returnObjects: true });
    return Array.isArray(strengths) ? strengths : deck.strengths;
  };

  const getTranslatedWeaknesses = (deck: SampleDeck) => {
    const key = getDeckKey(deck.id);
    const weaknesses = t(`landing.demo.difficulty.deckData.${key}.weaknesses`, { returnObjects: true });
    return Array.isArray(weaknesses) ? weaknesses : deck.weaknesses;
  };

  const getTranslatedPlaystyle = (deck: SampleDeck) => {
    const key = getDeckKey(deck.id);
    return t(`landing.demo.difficulty.deckData.${key}.playstyle`, { defaultValue: deck.playstyle });
  };

  const renderCardWithTooltip = (card: typeof deck1.cards[0], deckColor: string) => (
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
    <div className="space-y-6">
      {/* Deck Selectors */}
      <div className={`grid md:grid-cols-2 gap-4 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}>
        <div>
          <label className="text-sm text-muted-foreground mb-2 block font-rajdhani font-semibold">
            {t('landing.demo.comparison.firstDeck')}
          </label>
          <Select value={deck1.id} onValueChange={(val) => {
            const selected = sampleDecks.find(d => d.id === val);
            if (selected) setDeck1(selected);
          }}>
            <SelectTrigger className="w-full bg-card/50 border-primary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sampleDecks.map(deck => (
                <SelectItem key={deck.id} value={deck.id} disabled={deck.id === deck2.id}>
                  {deck.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block font-rajdhani font-semibold">
            {t('landing.demo.comparison.secondDeck')}
          </label>
          <Select value={deck2.id} onValueChange={(val) => {
            const selected = sampleDecks.find(d => d.id === val);
            if (selected) setDeck2(selected);
          }}>
            <SelectTrigger className="w-full bg-card/50 border-accent/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sampleDecks.map(deck => (
                <SelectItem key={deck.id} value={deck.id} disabled={deck.id === deck1.id}>
                  {deck.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className={`grid lg:grid-cols-2 gap-6 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`} style={{ transitionDelay: '200ms' }}>
        {/* Deck 1 */}
        <div className="space-y-4">
          <Card className="p-6 bg-card/50 backdrop-blur border-primary/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-rajdhani font-bold text-foreground">
                {deck1.name}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-rajdhani font-semibold border border-primary/30">
                {deck1.stats.archetype}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {deck1.cards.map((card) => renderCardWithTooltip(card, 'primary'))}
            </div>
            <p className="text-sm text-muted-foreground italic">"{getTranslatedPlaystyle(deck1)}"</p>
          </Card>

          <Card className="p-5 bg-card/50 backdrop-blur border-primary/20">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  {t('landing.demo.winRate')}
                </span>
                <span className="text-xl font-bold text-primary">
                  {isVisible && <AnimatedCounter end={deck1.stats.winRate} decimals={1} suffix="%" delay={300} />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {t('landing.demo.avgElixir')}
                </span>
                <span className="text-xl font-bold text-accent">
                  {isVisible && <AnimatedCounter end={deck1.stats.avgElixir} decimals={1} delay={500} />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t('landing.demo.comparison.synergy')}
                </span>
                <span className="text-xl font-bold text-primary">
                  {isVisible && <AnimatedCounter end={deck1.stats.synergyScore} decimals={1} suffix="/10" delay={700} />}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-success/5 border-success/20">
            <h4 className="text-sm font-rajdhani font-bold text-success mb-2">{t('landing.demo.comparison.strengths')}</h4>
            <ul className="space-y-1">
              {getTranslatedStrengths(deck1).map((strength, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-success" />
                  {strength}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4 bg-destructive/5 border-destructive/20">
            <h4 className="text-sm font-rajdhani font-bold text-destructive mb-2">{t('landing.demo.comparison.weaknesses')}</h4>
            <ul className="space-y-1">
              {getTranslatedWeaknesses(deck1).map((weakness, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-destructive" />
                  {weakness}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Deck 2 */}
        <div className="space-y-4">
          <Card className="p-6 bg-card/50 backdrop-blur border-accent/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-rajdhani font-bold text-foreground">
                {deck2.name}
              </h3>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-rajdhani font-semibold border border-accent/30">
                {deck2.stats.archetype}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {deck2.cards.map((card) => renderCardWithTooltip(card, 'accent'))}
            </div>
            <p className="text-sm text-muted-foreground italic">"{getTranslatedPlaystyle(deck2)}"</p>
          </Card>

          <Card className="p-5 bg-card/50 backdrop-blur border-accent/20">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {t('landing.demo.winRate')}
                  </span>
                  {(() => {
                    const diff = getStatDiff(deck2.stats.winRate, deck1.stats.winRate);
                    const Icon = diff.icon;
                    return (
                      <span className={`text-xs ${diff.color} flex items-center`}>
                        <Icon className="h-3 w-3" />
                        {diff.text}%
                      </span>
                    );
                  })()}
                </div>
                <span className="text-xl font-bold text-accent">
                  {isVisible && <AnimatedCounter end={deck2.stats.winRate} decimals={1} suffix="%" delay={300} />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    {t('landing.demo.avgElixir')}
                  </span>
                  {(() => {
                    const diff = getStatDiff(deck2.stats.avgElixir, deck1.stats.avgElixir);
                    const Icon = diff.icon;
                    return (
                      <span className={`text-xs ${diff.color} flex items-center`}>
                        <Icon className="h-3 w-3" />
                        {diff.text}
                      </span>
                    );
                  })()}
                </div>
                <span className="text-xl font-bold text-primary">
                  {isVisible && <AnimatedCounter end={deck2.stats.avgElixir} decimals={1} delay={500} />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('landing.demo.comparison.synergy')}
                  </span>
                  {(() => {
                    const diff = getStatDiff(deck2.stats.synergyScore, deck1.stats.synergyScore);
                    const Icon = diff.icon;
                    return (
                      <span className={`text-xs ${diff.color} flex items-center`}>
                        <Icon className="h-3 w-3" />
                        {diff.text}
                      </span>
                    );
                  })()}
                </div>
                <span className="text-xl font-bold text-accent">
                  {isVisible && <AnimatedCounter end={deck2.stats.synergyScore} decimals={1} suffix="/10" delay={700} />}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-success/5 border-success/20">
            <h4 className="text-sm font-rajdhani font-bold text-success mb-2">{t('landing.demo.comparison.strengths')}</h4>
            <ul className="space-y-1">
              {getTranslatedStrengths(deck2).map((strength, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-success" />
                  {strength}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4 bg-destructive/5 border-destructive/20">
            <h4 className="text-sm font-rajdhani font-bold text-destructive mb-2">{t('landing.demo.comparison.weaknesses')}</h4>
            <ul className="space-y-1">
              {getTranslatedWeaknesses(deck2).map((weakness, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-destructive" />
                  {weakness}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* Matchup Analysis */}
      <MatchupIndicator
        deck1Name={deck1.name}
        deck2Name={deck2.name}
        deck1Id={deck1.id}
        deck2Id={deck2.id}
        deck1Matchup={deck1.matchups.find(m => m.opponent === deck2.id)}
        deck2Matchup={deck2.matchups.find(m => m.opponent === deck1.id)}
        isVisible={isVisible}
      />

      {/* Key Differences Summary */}
      <Card className={`p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`} style={{ transitionDelay: '600ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h4 className="font-rajdhani font-bold text-lg text-foreground">{t('landing.demo.comparison.keyDifferences')}</h4>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">
              <span className="font-semibold text-primary">{deck1.name}</span> {t('landing.demo.comparison.favors')} {getTranslatedPlaystyle(deck1).toLowerCase()}
              {deck1.stats.avgElixir < deck2.stats.avgElixir ? `, ${t('landing.demo.comparison.fasterCycling')}` : `, ${t('landing.demo.comparison.heavierInvestments')}`}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">
              <span className="font-semibold text-accent">{deck2.name}</span> {t('landing.demo.comparison.excelsIn')} {getTranslatedPlaystyle(deck2).toLowerCase()}
              {deck2.stats.winRate > deck1.stats.winRate ? `, ${t('landing.demo.comparison.higherWinRates')}` : `, ${t('landing.demo.comparison.requiresRefinedExecution')}`}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
