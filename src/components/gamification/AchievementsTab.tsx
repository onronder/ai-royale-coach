import { useRef, useState, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { 
  Share2, Trophy, Loader2, Zap, Crown, Shield, Flame, TrendingUp, Star, Sparkles 
} from "lucide-react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Achievement } from "@/utils/achievementSystem";
import { AchievementShowcase } from "./AchievementShowcase";
import type { ClashRoyaleBattle } from "@/services/clashRoyaleApi";

const iconMap: Record<string, React.ElementType> = {
  Zap, Crown, Shield, Flame, TrendingUp, Star, Trophy, Sparkles,
};

interface AchievementsTabProps {
  playerTag: string;
  playerName?: string;
  battles: ClashRoyaleBattle[] | null;
  unlockedAchievements: Achievement[];
}

export function AchievementsTab({ 
  playerTag, 
  playerName, 
  battles, 
  unlockedAchievements 
}: AchievementsTabProps) {
  const { t } = useTranslation();
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSharePreview, setShowSharePreview] = useState(false);

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    
    setIsGenerating(true);
    setShowSharePreview(true);

    // Wait for the preview to render
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png', 1.0);
      });

      // Try native share first
      if (navigator.share && navigator.canShare({ files: [new File([blob], 'trophy-case.png', { type: 'image/png' })] })) {
        await navigator.share({
          title: `${playerName || 'Player'}'s Trophy Case`,
          text: `Check out my ${unlockedAchievements.length} achievements in AI Royale! 🏆`,
          files: [new File([blob], 'trophy-case.png', { type: 'image/png' })],
        });
        toast.success(t('achievements.shared', 'Trophy Case shared!'));
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trophy-case-${playerTag}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t('achievements.downloaded', 'Trophy Case saved!'));
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error(t('achievements.shareFailed', 'Failed to share'));
    } finally {
      setIsGenerating(false);
      setShowSharePreview(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Share Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-rajdhani text-foreground">
            {t('achievements.title', 'Achievements')}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('achievements.subtitle', 'Your battle accomplishments')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleShare}
          disabled={isGenerating || unlockedAchievements.length === 0}
          className="border-gold/50 hover:bg-gold/10"
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="mr-2 h-4 w-4" />
          )}
          {t('achievements.share', 'Share Trophy Case')}
        </Button>
      </div>

      {/* Achievement Showcase */}
      <AchievementShowcase unlockedAchievements={unlockedAchievements} />

      {/* Hidden Shareable Card (for html2canvas) */}
      {showSharePreview && (
        <div className="fixed -left-[9999px] top-0">
          <ShareableCard
            ref={shareCardRef}
            playerName={playerName || 'Player'}
            playerTag={playerTag}
            achievements={unlockedAchievements}
          />
        </div>
      )}
    </div>
  );
}

interface ShareableCardProps {
  playerName: string;
  playerTag: string;
  achievements: Achievement[];
}

const ShareableCard = forwardRef<HTMLDivElement, ShareableCardProps>(
  ({ playerName, playerTag, achievements }, ref) => {
    return (
      <div
        ref={ref}
        className="w-[600px] p-8 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{playerName}'s Trophy Case</h2>
              <p className="text-gray-400">#{playerTag}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-amber-400">{achievements.length}</div>
            <div className="text-sm text-gray-400">Badges Earned</div>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {achievements.slice(0, 6).map((achievement) => {
            const Icon = iconMap[achievement.icon] || Trophy;
            return (
              <div
                key={achievement.id}
                className={cn(
                  "p-4 rounded-xl border-2 text-center",
                  "bg-white/5 backdrop-blur-sm",
                  achievement.rarity === 'Legendary' && "border-amber-500/50",
                  achievement.rarity === 'Epic' && "border-purple-500/50",
                  achievement.rarity === 'Rare' && "border-blue-500/50",
                  achievement.rarity === 'Common' && "border-gray-500/50"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2",
                    achievement.rarity === 'Legendary' && "bg-gradient-to-br from-amber-400 to-orange-500",
                    achievement.rarity === 'Epic' && "bg-gradient-to-br from-purple-400 to-purple-600",
                    achievement.rarity === 'Rare' && "bg-gradient-to-br from-blue-400 to-blue-600",
                    achievement.rarity === 'Common' && "bg-gradient-to-br from-gray-400 to-gray-500"
                  )}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <p className="text-white text-sm font-medium truncate">{achievement.title.replace(/^[^\w]+/, '')}</p>
                <p className={cn(
                  "text-xs mt-1",
                  achievement.rarity === 'Legendary' && "text-amber-400",
                  achievement.rarity === 'Epic' && "text-purple-400",
                  achievement.rarity === 'Rare' && "text-blue-400",
                  achievement.rarity === 'Common' && "text-gray-400"
                )}>
                  {achievement.rarity}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <span className="text-white font-bold">AI ROYALE</span>
          </div>
          <p className="text-gray-400 text-sm">airoyale.app</p>
        </div>
      </div>
    );
  }
);

ShareableCard.displayName = 'ShareableCard';
