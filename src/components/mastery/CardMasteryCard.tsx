import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardMastery, useGenerateCardTips } from "@/hooks/useCardMastery";
import { MasteryProgressRing } from "./MasteryProgressRing";
import { MasteryLevelBadge } from "./MasteryLevelBadge";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface CardMasteryCardProps {
  card: CardMastery;
  playerTag: string;
}

export function CardMasteryCard({ card, playerTag }: CardMasteryCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const generateTips = useGenerateCardTips();

  const handleGenerateTips = async () => {
    try {
      await generateTips.mutateAsync({
        cardName: card.card_name,
        winRate: card.win_rate,
        timesUsed: card.times_used,
        bestPartners: card.best_partner_cards,
        worstMatchups: card.worst_matchup_cards,
        cardId: card.card_id,
        playerTag,
      });
    } catch (error) {
      console.error('Failed to generate tips:', error);
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-elegant transition-all">
      <CardContent className="p-4 space-y-4">
        {/* Header with Badge */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-heading text-foreground mb-1">{card.card_name}</h3>
            <p className="text-xs text-muted-foreground">{t('cardMastery.used', { count: card.times_used })}</p>
          </div>
          <MasteryLevelBadge level={card.mastery_level} />
        </div>

        {/* Progress Ring */}
        <div className="flex justify-center">
          <MasteryProgressRing 
            level={card.mastery_level} 
            progress={card.mastery_progress} 
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-card-secondary rounded p-2 text-center">
            <div className="text-muted-foreground text-xs">{t('cardMastery.winRate')}</div>
            <div className={`font-semibold ${card.win_rate >= 0.5 ? 'text-accent' : 'text-destructive'}`}>
              {(card.win_rate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-card-secondary rounded p-2 text-center">
            <div className="text-muted-foreground text-xs">{t('cardMastery.avgCrowns')}</div>
            <div className="font-semibold text-foreground">
              {card.crown_avg.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              {isOpen ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  {t('cardMastery.hideDetails')}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  {t('cardMastery.showDetails')}
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Best Partners */}
            {card.best_partner_cards.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">{t('cardMastery.bestPartners')}</div>
                <div className="flex flex-wrap gap-1">
                  {card.best_partner_cards.map(partner => (
                    <Badge key={partner} variant="secondary" className="text-xs">
                      {partner}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tough Matchups */}
            {card.worst_matchup_cards.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-2">{t('cardMastery.strugglesAgainst')}</div>
                <div className="flex flex-wrap gap-1">
                  {card.worst_matchup_cards.map(matchup => (
                    <Badge key={matchup} variant="destructive" className="text-xs">
                      {matchup}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* AI Tips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted-foreground">{t('cardMastery.personalizedTips')}</div>
                {!card.ai_tips && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleGenerateTips}
                    disabled={generateTips.isPending}
                    className="h-6 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {t('cardMastery.generate')}
                  </Button>
                )}
              </div>
              {card.ai_tips ? (
                <div className="text-xs text-foreground bg-card-secondary rounded p-3 whitespace-pre-wrap">
                  {card.ai_tips}
                </div>
              ) : generateTips.isPending ? (
                <div className="text-xs text-muted-foreground italic">{t('cardMastery.generatingTips')}</div>
              ) : (
                <div className="text-xs text-muted-foreground italic">{t('cardMastery.clickGenerate')}</div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}