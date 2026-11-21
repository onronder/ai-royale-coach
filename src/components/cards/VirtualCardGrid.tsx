import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { CollectionCard } from "./CollectionCard";
import type { CardCollectionRow } from "@/types/dashboard.types";

interface VirtualCardGridProps {
  cards: CardCollectionRow[];
  columns?: number;
}

export function VirtualCardGrid({ 
  cards, 
  columns = 5 
}: VirtualCardGridProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Calculate rows based on columns
  const rows = Math.ceil(cards.length / columns);
  
  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated row height
    overscan: 3,
  });

  if (cards.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t('cardCollection.noCardsFound')}
      </p>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowStartIndex = virtualRow.index * columns;
          const rowCards = cards.slice(rowStartIndex, rowStartIndex + columns);
          
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-3">
                {rowCards.map(card => <CollectionCard key={card.id} card={card} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
