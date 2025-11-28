import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Sword, Target } from 'lucide-react';
import { sampleDecks } from '@/data/sampleDecks';
import type { SampleDeck } from '@/data/sampleDecks';
import { useTranslation } from 'react-i18next';

interface CounterDeckRecommendationsProps {
  deck: SampleDeck;
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

export function CounterDeckRecommendations({ deck, isVisible }: CounterDeckRecommendationsProps) {
  const { t } = useTranslation();
  
  // Find decks that counter this deck
  const counterDecks = sampleDecks.filter(d => deck.counters.includes(d.id));
  
  // Find decks that this deck counters
  const counteredBy = sampleDecks.filter(d => d.counters.includes(deck.id));

  const getMatchupData = (targetDeckId: string) => {
    return deck.matchups.find(m => m.opponent === targetDeckId);
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'favored':
        return <Badge className="bg-success/20 text-success border-success/30">{t('landing.demo.counters.favored')}</Badge>;
      case 'unfavored':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">{t('landing.demo.counters.unfavored')}</Badge>;
      default:
        return <Badge className="bg-warning/20 text-warning border-warning/30">{t('landing.demo.counters.even')}</Badge>;
    }
  };

  // Get translated tactical tips
  const getTranslatedTips = (targetDeckId: string, fallbackTips: string[]) => {
    const sourceKey = getDeckKey(deck.id);
    const targetKey = getDeckKey(targetDeckId);
    const tips = t(`landing.demo.difficulty.deckData.${sourceKey}.matchups.${targetKey}`, { returnObjects: true });
    return Array.isArray(tips) ? tips : fallbackTips;
  };

  return (
    <Card className={`p-6 bg-card/50 backdrop-blur border-${deck.color}/20 transition-all duration-700 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
    }`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${deck.color}/10 border border-${deck.color}/30`}>
            <Shield className={`h-5 w-5 text-${deck.color}`} />
          </div>
            <div>
              <h4 className="font-rajdhani font-bold text-lg text-foreground">{deck.name}</h4>
              <p className="text-xs text-muted-foreground">{t('landing.demo.counters.subtitle')}</p>
            </div>
        </div>

        {/* Threats Section */}
        {counterDecks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h5 className="text-sm font-rajdhani font-bold text-foreground">{t('landing.demo.counters.majorThreats')}</h5>
              <Badge variant="outline" className="text-xs">{counterDecks.length}</Badge>
            </div>
            
            <div className="space-y-3">
              {counterDecks.map((counterDeck, idx) => {
                const matchupData = getMatchupData(counterDeck.id);
                return (
                  <Card 
                    key={counterDeck.id}
                    className={`p-4 bg-destructive/5 border-destructive/20 transition-all duration-500 hover:border-destructive/40 ${
                      isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                    }`}
                    style={{ transitionDelay: `${idx * 100}ms` }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${counterDeck.color}/20 to-accent/20 border border-${counterDeck.color}/30 flex items-center justify-center`}>
                            <Sword className={`h-5 w-5 text-${counterDeck.color}`} />
                          </div>
                          <div>
                            <h6 className="font-rajdhani font-bold text-foreground">{counterDeck.name}</h6>
                            <p className="text-xs text-muted-foreground">{counterDeck.stats.archetype}</p>
                          </div>
                        </div>
                        {matchupData && getDifficultyBadge(matchupData.difficulty)}
                      </div>

                      {matchupData && (
                        <>
                          <div className="pt-3 border-t border-border/30">
                            <p className="text-xs text-muted-foreground mb-2">
                              <span className="font-semibold text-destructive">{t('landing.demo.counters.winRateLabel')}:</span>{' '}
                              {matchupData.winRate}% ({t('landing.demo.counters.atDisadvantage')})
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{t('landing.demo.counters.keyCardsLabel')}:</span>{' '}
                              {matchupData.keyCards.join(', ')}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-border/30">
                            <p className="text-xs font-rajdhani font-semibold text-foreground mb-2">
                              {t('landing.demo.counters.survivalTips')}:
                            </p>
                            <ul className="space-y-1">
                              {getTranslatedTips(counterDeck.id, matchupData.tacticalTips).slice(0, 2).map((tip, tipIdx) => (
                                <li key={tipIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                                  <span className="text-destructive mt-0.5">•</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Favorable Matchups Section */}
        {counteredBy.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-success" />
              <h5 className="text-sm font-rajdhani font-bold text-foreground">{t('landing.demo.counters.favorableMatchups')}</h5>
              <Badge variant="outline" className="text-xs">{counteredBy.length}</Badge>
            </div>
            
            <div className="grid md:grid-cols-2 gap-3">
              {counteredBy.map((favorableDeck, idx) => {
                const matchupData = getMatchupData(favorableDeck.id);
                return (
                  <Card 
                    key={favorableDeck.id}
                    className={`p-4 bg-success/5 border-success/20 transition-all duration-500 hover:border-success/40 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: `${(idx + counterDecks.length) * 100}ms` }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-${favorableDeck.color}/20 to-success/20 border border-${favorableDeck.color}/30 flex items-center justify-center`}>
                            <Shield className={`h-4 w-4 text-${favorableDeck.color}`} />
                          </div>
                          <div>
                            <h6 className="font-rajdhani font-semibold text-foreground text-sm">{favorableDeck.name}</h6>
                            <p className="text-xs text-muted-foreground">{favorableDeck.stats.archetype}</p>
                          </div>
                        </div>
                      </div>
                      {matchupData && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-success">{t('landing.demo.counters.winRateLabel')}:</span>{' '}
                          {matchupData.winRate}% {t('landing.demo.counters.advantage')}
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Meta Position Summary */}
        <Card className={`p-4 bg-${deck.color}/5 border-${deck.color}/20`}>
          <p className="text-xs text-muted-foreground">
            <span className={`font-semibold text-${deck.color}`}>{t('landing.demo.counters.metaPosition')}:</span>{' '}
            {counterDecks.length === 0 && counteredBy.length === 0 && t('landing.demo.counters.balanced')}
            {counterDecks.length > counteredBy.length && t('landing.demo.counters.cautious', { count: counterDecks.length })}
            {counteredBy.length > counterDecks.length && t('landing.demo.counters.strongPick', { count: counteredBy.length })}
            {counterDecks.length === counteredBy.length && counterDecks.length > 0 && t('landing.demo.counters.matchupKnowledge')}
          </p>
        </Card>
      </div>
    </Card>
  );
}
