import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as LucideIcons from 'lucide-react';

interface AchievementNotificationProps {
  achievement: {
    name: string;
    description: string;
    tier: string;
    icon_name: string;
    points: number;
  };
  onDismiss: () => void;
}

export function AchievementNotification({ achievement, onDismiss }: AchievementNotificationProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'master':
        return { color: 'hsl(var(--primary))', bg: 'bg-primary/20', border: 'border-primary/30' };
      case 'diamond':
        return { color: '#00ced1', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' };
      case 'gold':
        return { color: '#ffd700', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
      case 'silver':
        return { color: '#c0c0c0', bg: 'bg-gray-400/20', border: 'border-gray-400/30' };
      default:
        return { color: '#cd7f32', bg: 'bg-orange-800/20', border: 'border-orange-800/30' };
    }
  };

  const tierInfo = getTierInfo(achievement.tier);
  const Icon = (LucideIcons as any)[achievement.icon_name] || Trophy;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <Card
      className={`fixed top-20 right-6 z-50 w-80 ${tierInfo.bg} ${tierInfo.border} border-2 shadow-2xl transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning animate-pulse" />
            <span className="font-rajdhani font-bold text-sm text-foreground">{t('achievements.unlocked')}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${tierInfo.bg} border ${tierInfo.border}`}>
            <Icon className="h-8 w-8" style={{ color: tierInfo.color }} />
          </div>
          <div className="flex-1">
            <h4 className="font-rajdhani font-bold text-foreground">{achievement.name}</h4>
            <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" style={{ borderColor: tierInfo.color, color: tierInfo.color }}>
                {achievement.tier.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-primary border-primary/30">
                +{achievement.points} {t('achievements.points')}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
