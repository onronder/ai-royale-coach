import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Swords, Copy, Info, CheckCircle } from "lucide-react";
import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { DeckGrid } from "@/components/cards/DeckGrid";
import { useState } from "react";
import { toast } from "sonner";

interface CounterDeckSuggestion {
  cards: string[];
  explanations: Record<string, string>;
  overallStrategy: string;
}

interface CounterDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counterDeck: CounterDeckSuggestion;
  opponentDeck: ClashRoyaleCard[];
  opponentName: string;
}

export function CounterDeckModal({ 
  open, 
  onOpenChange, 
  counterDeck, 
  opponentDeck, 
  opponentName 
}: CounterDeckModalProps) {
  const [copiedDeck, setCopiedDeck] = useState(false);

  // Create mock card objects for display (we only have names from AI)
  const counterCards: ClashRoyaleCard[] = counterDeck.cards.map((name, idx) => ({
    id: idx,
    name,
    level: 11,
    maxLevel: 14,
    elixirCost: 4, // Default, we don't know actual cost
    iconUrls: {
      medium: `https://api-assets.clashroyale.com/cards/300/${name.toLowerCase().replace(/\s+/g, '-')}.png`
    },
  }));

  const handleCopyDeckLink = () => {
    // Create a deck link format (card names joined)
    const deckString = counterDeck.cards.join(', ');
    navigator.clipboard.writeText(deckString);
    setCopiedDeck(true);
    toast.success('Counter deck copied to clipboard!');
    setTimeout(() => setCopiedDeck(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Counter Deck Builder
          </DialogTitle>
          <DialogDescription>
            AI-suggested deck designed to counter {opponentName}'s strategy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Opponent's Deck Reference */}
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-destructive">
              <Swords className="w-4 h-4" />
              Opponent's Deck
            </h3>
            <DeckGrid cards={opponentDeck} size="sm" showElixir={false} />
          </div>

          {/* Suggested Counter Deck */}
          <div className="p-4 bg-success/10 rounded-lg border border-success/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-success">
              <Shield className="w-4 h-4" />
              Suggested Counter Deck
            </h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {counterDeck.cards.slice(0, 8).map((cardName, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-card rounded-lg border text-center"
                >
                  <p className="text-sm font-medium truncate">{cardName}</p>
                  {counterDeck.explanations[cardName] && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {counterDeck.explanations[cardName]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Strategy Overview */}
          {counterDeck.overallStrategy && (
            <div className="p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                How to Play This Counter Deck
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {counterDeck.overallStrategy}
              </p>
            </div>
          )}

          {/* Card Explanations */}
          {Object.keys(counterDeck.explanations).length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                Why These Cards?
              </h3>
              <div className="grid gap-2">
                {Object.entries(counterDeck.explanations).slice(0, 4).map(([card, explanation]) => (
                  <div key={card} className="flex gap-3 p-2 bg-muted/50 rounded">
                    <Badge variant="outline" className="shrink-0">{card}</Badge>
                    <p className="text-sm text-muted-foreground">{explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4 border-t border-border">
            <Button 
              onClick={handleCopyDeckLink}
              className="w-full"
              variant={copiedDeck ? "outline" : "default"}
            >
              {copiedDeck ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Deck Cards
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Copy the card names to use in your deck builder
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
