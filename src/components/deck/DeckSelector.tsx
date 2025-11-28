import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClashRoyaleCard } from "@/services/clashRoyaleApi";
import { Gamepad2, Save } from "lucide-react";

interface SavedDeck {
  id: string;
  name: string;
  cards: ClashRoyaleCard[];
  avg_elixir?: number;
}

interface DeckSelectorProps {
  savedDecks: SavedDeck[];
  currentDeck: ClashRoyaleCard[] | null;
  selectedDeckId: string | null;
  onSelectDeck: (deckId: string, cards: ClashRoyaleCard[]) => void;
}

export function DeckSelector({ savedDecks, currentDeck, selectedDeckId, onSelectDeck }: DeckSelectorProps) {
  const { t } = useTranslation();

  const handleSelect = (value: string) => {
    if (value === "current" && currentDeck) {
      onSelectDeck("current", currentDeck);
    } else {
      const deck = savedDecks.find(d => d.id === value);
      if (deck) {
        onSelectDeck(deck.id, deck.cards);
      }
    }
  };

  return (
    <Select value={selectedDeckId || ""} onValueChange={handleSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={t('deckComparison.selectDeckB')} />
      </SelectTrigger>
      <SelectContent>
        {currentDeck && currentDeck.length === 8 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              {t('deckComparison.inGameDeck')}
            </SelectLabel>
            <SelectItem value="current">
              {t('deckComparison.currentInGameDeck')}
            </SelectItem>
          </SelectGroup>
        )}
        
        {savedDecks.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {t('deckComparison.savedDecks')}
            </SelectLabel>
            {savedDecks.map(deck => (
              <SelectItem key={deck.id} value={deck.id}>
                {deck.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        
        {(!currentDeck || currentDeck.length < 8) && savedDecks.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {t('deckComparison.noDecksAvailable')}
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
