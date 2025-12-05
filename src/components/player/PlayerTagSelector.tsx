import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Trophy, Users, Crown, Loader2, Clock, Sparkles, GitCompare, Brain, Lock, Timer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePlayerProfiles, PlayerProfile, getClanBadgeUrl } from "@/hooks/usePlayerProfiles";
import { useUserAIProfiles } from "@/hooks/usePlayerAIAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { DataLoader } from "@/components/ui/data-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountComparison } from "./AccountComparison";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PlayerTagSelectorProps {
  userId: string;
  onSelect?: (playerTag: string) => void;
}

export function PlayerTagSelector({ userId, onSelect }: PlayerTagSelectorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [newTag, setNewTag] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  
  const { 
    profiles, 
    isLoading, 
    addProfile, 
    removeProfile, 
    isAdding, 
    isRemoving,
    canAddMore 
  } = usePlayerProfiles(userId);

  const { profiles: aiProfiles } = useUserAIProfiles();
  const { hasAccess, isTrialActive, hasUsedTrial } = useSubscription();
  
  // Create a map of player_tag -> ai_enabled status
  const aiStatusMap = new Map(
    aiProfiles.map(p => [p.player_tag, p.ai_enabled])
  );

  // Determine trial expired state
  const trialExpired = hasUsedTrial && !isTrialActive && !hasAccess;

  const handleSelectPlayer = (playerTag: string) => {
    if (onSelect) {
      onSelect(playerTag);
    } else {
      navigate(`/player/${playerTag}`);
    }
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    
    try {
      const normalizedTag = newTag.trim().replace('#', '').toUpperCase();
      await addProfile({ playerTag: normalizedTag });
      setNewTag("");
      setIsAddingNew(false);
      // Navigate to the player page after successful addition
      handleSelectPlayer(normalizedTag);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRemoveTag = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    await removeProfile(profileId);
  };

  if (isLoading) {
    return <DataLoader context="player-profiles" variant="card" />;
  }

  return (
    <div className="space-y-6">
      {/* Account Count Badge */}
      <div className="flex justify-center">
        <Badge variant="outline" className="border-gold/40 text-gold bg-gold/10 px-4 py-1.5">
          <Crown className="h-3.5 w-3.5 mr-1.5" />
          {t('selectPlayer.accountsLinked', { count: profiles.length })}
        </Badge>
      </div>

      {/* Compare Button */}
      {profiles.length >= 2 && (
        <div className="flex justify-center">
          <Button
            variant={showComparison ? "golden" : "outline"}
            onClick={() => setShowComparison(!showComparison)}
            className="gap-2"
          >
            <GitCompare className="h-4 w-4" />
            {showComparison ? t('selectPlayer.hideComparison') : t('selectPlayer.compareAccounts')}
          </Button>
        </div>
      )}

      {/* Comparison View */}
      {showComparison && profiles.length >= 2 && (
        <AccountComparison profiles={profiles} />
      )}

      {/* Player Tag Cards */}
      {profiles.length > 0 ? (
        <div className="grid gap-4">
          {profiles.map((profile, index) => (
            <PlayerTagCard
              key={profile.id}
              profile={profile}
              onSelect={() => handleSelectPlayer(profile.player_tag)}
              onRemove={(e) => handleRemoveTag(e, profile.id)}
              isRemoving={isRemoving}
              index={index}
              aiEnabled={aiStatusMap.get(profile.player_tag) ?? false}
              isTrialActive={isTrialActive}
              hasSubscription={hasAccess}
              trialExpired={trialExpired}
            />
          ))}
        </div>
      ) : (
        <Card variant="arena" className="p-8">
          <EmptyState
            icon={Users}
            title={t('selectPlayer.noTagsTitle')}
            description={t('selectPlayer.noTagsDescription')}
            variant="compact"
          />
        </Card>
      )}

      {/* Add New Tag */}
      {canAddMore && (
        <Card variant="arena" className="border-dashed border-2 border-gold/30">
          <CardContent className="pt-6">
            {isAddingNew ? (
              <form onSubmit={handleAddTag} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newTag" className="text-sm font-semibold">{t('selectPlayer.playerTagLabel')}</Label>
                  <Input
                    id="newTag"
                    placeholder={t('selectPlayer.tagPlaceholder')}
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="font-mono h-12 bg-background/50 border-border/50 focus:border-gold focus:ring-gold/30"
                    disabled={isAdding}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('selectPlayer.tagHelp')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="golden" disabled={isAdding || !newTag.trim()}>
                    {isAdding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('selectPlayer.adding')}
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        {t('selectPlayer.addTag')}
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddingNew(false)}
                    disabled={isAdding}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="ghost"
                className="w-full h-20 border-2 border-dashed border-gold/30 hover:border-gold/50 hover:bg-gold/5"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus className="mr-2 h-5 w-5 text-gold" />
                <span className="text-gold font-rajdhani font-semibold">{t('selectPlayer.addAnotherTag')}</span>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!canAddMore && (
        <p className="text-center text-sm text-muted-foreground">
          {t('selectPlayer.maxTagsReached')}
        </p>
      )}
    </div>
  );
}

interface PlayerTagCardProps {
  profile: PlayerProfile;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
  isRemoving: boolean;
  index: number;
  aiEnabled: boolean;
  isTrialActive: boolean;
  hasSubscription: boolean;
  trialExpired: boolean;
}

function PlayerTagCard({ 
  profile, 
  onSelect, 
  onRemove, 
  isRemoving, 
  index, 
  aiEnabled,
  isTrialActive,
  hasSubscription,
  trialExpired
}: PlayerTagCardProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const badgeUrl = getClanBadgeUrl(profile.clan_badge_id);

  // Determine badge state based on user status
  const getBadgeConfig = () => {
    if (isTrialActive) {
      return {
        icon: Timer,
        text: t('selectPlayer.onTrial'),
        tooltip: t('selectPlayer.onTrialTooltip'),
        className: "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
      };
    }
    if (hasSubscription && aiEnabled) {
      return {
        icon: Crown,
        text: t('selectPlayer.proBadge'),
        tooltip: t('selectPlayer.proBadgeTooltip'),
        className: "bg-gold/20 text-gold border-gold/30 hover:bg-gold/30"
      };
    }
    if (trialExpired) {
      return {
        icon: Lock,
        text: t('selectPlayer.trialExpired'),
        tooltip: t('selectPlayer.trialExpiredTooltip'),
        className: "bg-destructive/20 text-destructive border-destructive/30"
      };
    }
    // Free user or subscription without AI for this account
    return {
      icon: Lock,
      text: t('selectPlayer.noAI'),
      tooltip: t('selectPlayer.noAITooltip'),
      className: "text-muted-foreground border-border/50"
    };
  };

  const badgeConfig = getBadgeConfig();
  const BadgeIcon = badgeConfig.icon;
  
  return (
    <Card 
      variant="arena"
      className={cn(
        "cursor-pointer hover:-translate-y-1 group golden-shine",
        "animate-arena-entrance"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={onSelect}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Avatar with Clan Badge */}
            <div className="w-16 h-16 rounded-xl bg-gradient-gold flex items-center justify-center shadow-gold/30 shadow-lg flex-shrink-0 overflow-hidden">
              {badgeUrl && !imageError ? (
                <img 
                  src={badgeUrl} 
                  alt="Clan badge"
                  className="w-12 h-12 object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                <Crown className="h-8 w-8 text-gold-foreground" />
              )}
            </div>
            
            {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold font-rajdhani text-xl truncate">
                    {profile.player_name || `#${profile.player_tag}`}
                  </h3>
                  {profile.player_name && (
                    <Badge variant="secondary" className="text-xs font-mono bg-secondary/50">
                      #{profile.player_tag}
                    </Badge>
                  )}
                  {/* AI Status Badge */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline"
                        className={cn("text-xs gap-1", badgeConfig.className)}
                      >
                        <BadgeIcon className="h-3 w-3" />
                        {badgeConfig.text}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {badgeConfig.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </div>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {profile.trophies !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-gold trophy-shimmer" />
                    <span className="font-semibold text-foreground">{profile.trophies.toLocaleString()}</span>
                  </div>
                )}
                {profile.arena_name && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-royal" />
                    <span className="truncate">{profile.arena_name}</span>
                  </div>
                )}
                {profile.clan_name && (
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="truncate">{profile.clan_name}</span>
                  </div>
                )}
              </div>
              
              {profile.last_seen_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3" />
                  <span>{t('selectPlayer.lastUsed')} {formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true })}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
            disabled={isRemoving}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
