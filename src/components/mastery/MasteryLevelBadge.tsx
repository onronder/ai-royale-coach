import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

interface MasteryLevelBadgeProps {
  level: number;
}

export function MasteryLevelBadge({ level }: MasteryLevelBadgeProps) {
  const { t } = useTranslation();
  
  const getTier = (level: number) => {
    if (level >= 9) return { key: 'master', color: 'hsl(var(--primary))' };
    if (level >= 7) return { key: 'diamond', color: '#00ced1' };
    if (level >= 5) return { key: 'gold', color: '#ffd700' };
    if (level >= 3) return { key: 'silver', color: '#c0c0c0' };
    return { key: 'bronze', color: '#cd7f32' };
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
      {t(`mastery.tiers.${tier.key}`)}
    </Badge>
  );
}
