import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

interface MasteryLevelBadgeProps {
  level: number;
}

export function MasteryLevelBadge({ level }: MasteryLevelBadgeProps) {
  const getTier = (level: number) => {
    if (level >= 9) return { name: 'Master', color: 'hsl(var(--primary))' };
    if (level >= 7) return { name: 'Diamond', color: '#00ced1' };
    if (level >= 5) return { name: 'Gold', color: '#ffd700' };
    if (level >= 3) return { name: 'Silver', color: '#c0c0c0' };
    return { name: 'Bronze', color: '#cd7f32' };
  };

  const tier = getTier(level);

  return (
    <Badge 
      variant="outline" 
      className="flex items-center gap-1 border-2"
      style={{ 
        borderColor: tier.color,
        color: tier.color,
      }}
    >
      <Crown className="h-3 w-3" style={{ fill: tier.color }} />
      {tier.name}
    </Badge>
  );
}