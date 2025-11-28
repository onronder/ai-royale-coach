import { useTranslation } from "react-i18next";

interface MasteryProgressRingProps {
  level: number;
  progress: number;
}

export function MasteryProgressRing({ level, progress }: MasteryProgressRingProps) {
  const { t } = useTranslation();
  
  const getTierColor = (level: number) => {
    if (level >= 9) return 'hsl(var(--primary))'; // Master - Purple
    if (level >= 7) return '#00ced1'; // Diamond - Cyan
    if (level >= 5) return '#ffd700'; // Gold
    if (level >= 3) return '#c0c0c0'; // Silver
    return '#cd7f32'; // Bronze
  };

  const color = getTierColor(level);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        {/* Background circle */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth="6"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
          style={{
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{level}</div>
          <div className="text-xs text-muted-foreground">{t('mastery.level')}</div>
        </div>
      </div>
    </div>
  );
}
