import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GameTooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

export function GameTooltip({ children, content, side = "top" }: GameTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent 
          side={side}
          className="bg-card-elevated border-primary/30 shadow-glow max-w-xs"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Card rarity tooltips
export const rarityTooltips = {
  common: "Common cards are easy to upgrade and form the foundation of most decks.",
  rare: "Rare cards offer unique abilities and are moderately difficult to upgrade.",
  epic: "Epic cards provide powerful effects but require more cards to upgrade.",
  legendary: "Legendary cards are the rarest and most powerful, with game-changing abilities.",
  champion: "Champions are ultra-rare cards with special abilities that can turn the tide of battle."
};

// Stat tooltips
export const statTooltips = {
  trophies: "Your current trophy count. Gain trophies by winning battles and climb the ranks!",
  bestTrophies: "The highest trophy count you've ever achieved. This shows your peak performance.",
  winRate: "Percentage of battles won out of your last 25 matches. Aim for 50% or higher!",
  arena: "Your current competitive arena based on trophy count. Higher arenas unlock better rewards.",
  avgElixir: "Average elixir cost of your deck. Lower is faster, higher is more powerful. Aim for 3.0-4.0.",
  crowns: "Tower crowns destroyed in a match. Get 3 crowns for complete domination!",
  trophyChange: "Trophies gained or lost from this match. Win more to climb faster!"
};

// Gameplay tips
export const gameplayTips = {
  elixir: "💡 Tip: Never waste elixir! Always have a plan for your next card play.",
  defense: "🛡️ Tip: Strong defense wins games. Counter your opponent's pushes efficiently.",
  cycle: "♻️ Tip: Cycle through your deck quickly to access key cards when you need them.",
  timing: "⏰ Tip: Save your big spells for when they can hit multiple targets for maximum value.",
  counter: "⚔️ Tip: Know your counters! Every card has weaknesses you can exploit."
};
