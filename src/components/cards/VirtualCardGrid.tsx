import { useCallback, useRef, useSyncExternalStore } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTranslation } from "react-i18next";
import { CollectionCard } from "./CollectionCard";
import type { CardCollectionRow } from "@/types/dashboard.types";

// The same sm/md/lg breakpoints as the plain collection grid.
const breakpoints = ["(min-width: 640px)", "(min-width: 768px)", "(min-width: 1024px)"];
function columnCount() {
  return 2 + breakpoints.filter(query => window.matchMedia(query).matches).length;
}
function onBreakpointChange(update: () => void) {
  const queries = breakpoints.map(query => window.matchMedia(query));
  queries.forEach(query => query.addEventListener("change", update));
  return () => queries.forEach(query => query.removeEventListener("change", update));
}

export function VirtualCardGrid({ cards }: { cards: CardCollectionRow[] }) {
  const { t } = useTranslation();
  const columns = useSyncExternalStore(onBreakpointChange, columnCount, () => 2);
  const parentRef = useRef<HTMLDivElement>(null);
  const rowKey = useCallback((index: number) => columns + ":" + cards[index * columns].id, [cards, columns]);
  const virtualizer = useVirtualizer({
    count: Math.ceil(cards.length / columns),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    getItemKey: rowKey,
    overscan: 3,
  });

  if (cards.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{t('cardCollection.noCardsFound')}</p>;
  }

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto" style={{ contain: "strict" }}>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(row => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 grid w-full gap-3 pb-3"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              transform: `translateY(${row.start}px)`,
            }}
          >
            {cards.slice(row.index * columns, (row.index + 1) * columns).map(card => (
              <CollectionCard key={card.id} card={card} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
