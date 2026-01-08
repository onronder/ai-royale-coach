import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ClashRoyaleBattle } from "@/services/clashRoyaleApi";
import { MatchCard } from "./MatchCard";

interface VirtualMatchListProps {
  battles: ClashRoyaleBattle[];
  playerTag: string;
  onMatchClick: (battle: ClashRoyaleBattle) => void;
}

export function VirtualMatchList({ battles, playerTag, onMatchClick }: VirtualMatchListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: battles.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated height of each MatchCard
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-[500px] md:h-[600px] overflow-auto w-full"
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const battle = battles[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="pr-2 pb-3">
                <MatchCard
                  battle={battle}
                  playerTag={playerTag}
                  onClick={() => onMatchClick(battle)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
