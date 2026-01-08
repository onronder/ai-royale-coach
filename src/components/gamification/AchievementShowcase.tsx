import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, 
  Zap, 
  Crown, 
  Shield, 
  Flame, 
  TrendingUp, 
  Star, 
  Trophy,
  Sparkles,
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Achievement, 
  AchievementRarity, 
  getRarityColorClass 
} from "@/utils/achievementSystem";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// Map icon names to components
const iconMap: Record<string, React.ElementType> = {
  Zap,
  Crown,
  Shield,
  Flame,
  TrendingUp,
  Star,
  Trophy,
  Sparkles,
};

// Define all possible achievements for the locked state display
interface LockedAchievementInfo {
  id: string;
  titleKey: string;
  hintKey: string;
  icon: string;
  rarity: AchievementRarity;
}

const allAchievements: LockedAchievementInfo[] = [
  {
    id: 'elixir-master',
    titleKey: 'achievementShowcase.achievements.elixirMaster.title',
    hintKey: 'achievementShowcase.achievements.elixirMaster.hint',
    icon: 'Zap',
    rarity: 'Rare',
  },
  {
    id: 'comeback-king',
    titleKey: 'achievementShowcase.achievements.comebackKing.title',
    hintKey: 'achievementShowcase.achievements.comebackKing.hint',
    icon: 'Crown',
    rarity: 'Epic',
  },
  {
    id: 'perfect-defense',
    titleKey: 'achievementShowcase.achievements.perfectDefense.title',
    hintKey: 'achievementShowcase.achievements.perfectDefense.hint',
    icon: 'Shield',
    rarity: 'Rare',
  },
  {
    id: 'win-streak-warrior',
    titleKey: 'achievementShowcase.achievements.winStreakWarrior.title',
    hintKey: 'achievementShowcase.achievements.winStreakWarrior.hint',
    icon: 'Flame',
    rarity: 'Rare',
  },
  {
    id: 'underdog',
    titleKey: 'achievementShowcase.achievements.underdog.title',
    hintKey: 'achievementShowcase.achievements.underdog.hint',
    icon: 'TrendingUp',
    rarity: 'Epic',
  },
  {
    id: 'three-crown-master',
    titleKey: 'achievementShowcase.achievements.threeCrownMaster.title',
    hintKey: 'achievementShowcase.achievements.threeCrownMaster.hint',
    icon: 'Trophy',
    rarity: 'Common',
  },
];

interface AchievementShowcaseProps {
  unlockedAchievements: Achievement[];
  className?: string;
}

export function AchievementShowcase({ unlockedAchievements, className }: AchievementShowcaseProps) {
  const { t } = useTranslation();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const unlockedIds = new Set(unlockedAchievements.map(a => a.id));

  const handleBadgeClick = (achievement: Achievement | null) => {
    if (achievement) {
      setSelectedAchievement(achievement);
      setShowDetail(true);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center shadow-lg shadow-gold/30">
          <Trophy className="h-6 w-6 text-gold-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-rajdhani text-foreground">{t('achievementShowcase.trophyCase')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('achievementShowcase.badgesUnlocked', { unlocked: unlockedAchievements.length, total: allAchievements.length })}
          </p>
        </div>
      </div>

      {/* Trophy Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {allAchievements.map((achievementInfo, index) => {
          const unlocked = unlockedAchievements.find(a => a.id === achievementInfo.id);
          const isUnlocked = !!unlocked;

          return (
            <motion.div
              key={achievementInfo.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              {isUnlocked ? (
                <UnlockedBadge 
                  achievement={unlocked} 
                  onClick={() => handleBadgeClick(unlocked)}
                />
              ) : (
                <LockedBadge info={achievementInfo} />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <AchievementDetailDialog
        achievement={selectedAchievement}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    </div>
  );
}

interface UnlockedBadgeProps {
  achievement: Achievement;
  onClick: () => void;
}

function UnlockedBadge({ achievement, onClick }: UnlockedBadgeProps) {
  const Icon = iconMap[achievement.icon] || Trophy;
  const rarityClass = getRarityColorClass(achievement.rarity);

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "relative w-full p-4 rounded-xl border-2 transition-all duration-300",
        "bg-gradient-to-br from-card to-card/80",
        "hover:shadow-lg hover:-translate-y-1 cursor-pointer",
        rarityClass
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow effect */}
      <div className={cn(
        "absolute inset-0 rounded-xl opacity-30 blur-xl -z-10",
        achievement.rarity === 'Legendary' && "bg-amber-400",
        achievement.rarity === 'Epic' && "bg-purple-400",
        achievement.rarity === 'Rare' && "bg-blue-400",
        achievement.rarity === 'Common' && "bg-gray-400"
      )} />

      {/* Sparkle animation for Legendary */}
      {achievement.rarity === 'Legendary' && (
        <motion.div
          className="absolute top-2 right-2"
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
        </motion.div>
      )}

      <div className="flex flex-col items-center text-center gap-2">
        {/* Icon with animated ring */}
        <motion.div 
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            "bg-gradient-to-br",
            achievement.rarity === 'Legendary' && "from-amber-400 to-orange-500",
            achievement.rarity === 'Epic' && "from-purple-400 to-purple-600",
            achievement.rarity === 'Rare' && "from-blue-400 to-blue-600",
            achievement.rarity === 'Common' && "from-gray-400 to-gray-500"
          )}
          animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0.4)', '0 0 0 8px rgba(255,255,255,0)', '0 0 0 0 rgba(255,255,255,0.4)'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className="h-7 w-7 text-white" />
        </motion.div>

        {/* Title */}
        <span className="font-bold text-sm leading-tight">{achievement.title}</span>

        {/* Rarity Badge */}
        <Badge 
          variant="outline" 
          className={cn("text-[10px] px-2 py-0", rarityClass)}
        >
          {achievement.rarity}
        </Badge>
      </div>
    </motion.button>
  );
}

interface LockedBadgeProps {
  info: LockedAchievementInfo;
}

function LockedBadge({ info }: LockedBadgeProps) {
  const { t } = useTranslation();
  const Icon = iconMap[info.icon] || Trophy;

  return (
    <div className={cn(
      "relative w-full p-4 rounded-xl border-2 border-dashed",
      "border-muted-foreground/30 bg-muted/20",
      "opacity-60 grayscale"
    )}>
      <div className="flex flex-col items-center text-center gap-2">
        {/* Locked Icon Container */}
        <div className="relative">
          <div className="w-14 h-14 rounded-full flex items-center justify-center bg-muted/50">
            <Icon className="h-7 w-7 text-muted-foreground/50" />
          </div>
          {/* Lock overlay */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-muted-foreground/30 flex items-center justify-center">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        {/* Title */}
        <span className="font-bold text-sm text-muted-foreground leading-tight">
          {t(info.titleKey)}
        </span>

        {/* Hint */}
        <p className="text-[10px] text-muted-foreground/70 leading-tight line-clamp-2">
          {t(info.hintKey)}
        </p>
      </div>
    </div>
  );
}

interface AchievementDetailDialogProps {
  achievement: Achievement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AchievementDetailDialog({ achievement, open, onOpenChange }: AchievementDetailDialogProps) {
  const { t } = useTranslation();
  if (!achievement) return null;

  const Icon = iconMap[achievement.icon] || Trophy;
  const rarityClass = getRarityColorClass(achievement.rarity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-2 overflow-hidden">
        {/* Background glow */}
        <div className={cn(
          "absolute inset-0 opacity-10",
          achievement.rarity === 'Legendary' && "bg-gradient-to-br from-amber-400 to-orange-500",
          achievement.rarity === 'Epic' && "bg-gradient-to-br from-purple-400 to-purple-600",
          achievement.rarity === 'Rare' && "bg-gradient-to-br from-blue-400 to-blue-600",
          achievement.rarity === 'Common' && "bg-gradient-to-br from-gray-400 to-gray-500"
        )} />

        <DialogHeader className="relative z-10">
          <DialogTitle className="sr-only">{achievement.title}</DialogTitle>
        </DialogHeader>

        <div className="relative z-10 flex flex-col items-center text-center py-4 space-y-4">
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.6 }}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center",
              "bg-gradient-to-br shadow-2xl",
              achievement.rarity === 'Legendary' && "from-amber-400 to-orange-500 shadow-amber-500/50",
              achievement.rarity === 'Epic' && "from-purple-400 to-purple-600 shadow-purple-500/50",
              achievement.rarity === 'Rare' && "from-blue-400 to-blue-600 shadow-blue-500/50",
              achievement.rarity === 'Common' && "from-gray-400 to-gray-500 shadow-gray-500/50"
            )}
          >
            <Icon className="h-12 w-12 text-white" />
          </motion.div>

          {/* Title with emoji */}
          <motion.h3 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold font-rajdhani"
          >
            {achievement.title}
          </motion.h3>

          {/* Rarity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Badge 
              variant="outline" 
              className={cn("text-sm px-3 py-1", rarityClass)}
            >
              {achievement.rarity}
            </Badge>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground max-w-xs"
          >
            {achievement.description}
          </motion.p>

          {/* Earned date */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 text-sm text-muted-foreground/70"
          >
            <Trophy className="h-4 w-4" />
            <span>{t('achievementShowcase.earnedRecently')}</span>
          </motion.div>

          {/* Encouragement message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className={cn(
              "mt-4 px-4 py-2 rounded-lg text-sm font-medium",
              "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            )}
          >
            🎉 {t('achievementShowcase.amazingWork')}
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
