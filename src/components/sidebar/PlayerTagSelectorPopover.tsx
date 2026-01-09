import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crown, Trophy, ChevronDown, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayerProfiles, getClanBadgeUrl, PlayerProfile } from "@/hooks/usePlayerProfiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NavbarSubscriptionBadge } from "@/components/layout/NavbarSubscriptionBadge";

interface PlayerTagSelectorPopoverProps {
  userId: string | null;
  currentPlayerTag?: string;
  playerName?: string;
  trophies?: number;
  isCollapsed?: boolean;
}

export function PlayerTagSelectorPopover({
  userId,
  currentPlayerTag,
  playerName,
  trophies,
  isCollapsed = false,
}: PlayerTagSelectorPopoverProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { profiles, addProfile, removeProfile, isAdding, canAddMore } = usePlayerProfiles(userId);

  const handleSelectPlayer = (tag: string) => {
    setOpen(false);
    navigate(`/player/${tag}`);
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      await addProfile({ playerTag: newTag.trim() });
      setNewTag("");
      setShowAddForm(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleRemoveTag = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    await removeProfile(profileId);
  };

  const formatTrophies = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  // Collapsed state - just show crown icon
  if (isCollapsed) {
    return (
      <div className="flex justify-center p-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold/60 flex items-center justify-center shadow-gold">
          <Crown className="h-5 w-5 text-gold-foreground" />
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50 hover:bg-card/80 transition-colors text-left">
          {/* Crown Avatar with Trophy Badge */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold/60 flex items-center justify-center shadow-gold">
              <Crown className="h-6 w-6 text-gold-foreground" />
            </div>
            {trophies && (
              <div className="absolute -bottom-1 -left-1 bg-card border border-gold/30 rounded-full px-1.5 py-0.5 flex items-center gap-0.5">
                <Trophy className="h-2.5 w-2.5 text-gold" />
                <span className="text-[10px] font-bold text-gold">{formatTrophies(trophies)}</span>
              </div>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <h2 className="font-rajdhani font-bold text-foreground truncate">
              {playerName || "AI ROYALE"}
            </h2>
            {currentPlayerTag && (
              <p className="text-xs text-muted-foreground font-mono truncate">
                #{currentPlayerTag}
              </p>
            )}
          </div>

          {/* Dropdown Indicator */}
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        className="w-[calc(var(--radix-popover-trigger-width))] p-0 bg-popover border-border"
        sideOffset={4}
      >
        {/* Account List */}
        <div className="max-h-64 overflow-y-auto">
          {profiles.map((profile) => {
            const isActive = profile.player_tag === currentPlayerTag;
            return (
              <button
                key={profile.id}
                onClick={() => handleSelectPlayer(profile.player_tag)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left group",
                  isActive && "bg-primary/5"
                )}
              >
                {/* Clan Badge or Crown */}
                <div className="relative flex-shrink-0">
                  {profile.clan_badge_id ? (
                    <img
                      src={getClanBadgeUrl(profile.clan_badge_id)}
                      alt=""
                      className="w-8 h-8 rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                      <Crown className="h-4 w-4 text-gold" />
                    </div>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {profile.player_name || `#${profile.player_tag}`}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {profile.trophies && (
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-gold" />
                        {profile.trophies.toLocaleString()}
                      </span>
                    )}
                    {profile.arena_name && (
                      <span className="truncate">{profile.arena_name}</span>
                    )}
                  </div>
                </div>

                {/* Active Check or Remove */}
                {isActive ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <button
                    onClick={(e) => handleRemoveTag(e, profile.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity"
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                )}
              </button>
            );
          })}
        </div>

        {/* Add New Tag */}
        {canAddMore && (
          <div className="border-t border-border p-2">
            {showAddForm ? (
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="#ABC123"
                  className="h-9 text-sm font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button
                  size="sm"
                  onClick={handleAddTag}
                  disabled={isAdding || !newTag.trim()}
                  className="h-9 px-3"
                >
                  {isAdding ? "..." : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="w-full justify-start gap-2 h-9 text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
                {t("playerSelector.addAccount", "Add account")}
              </Button>
            )}
          </div>
        )}

        {/* Account Count */}
        <div className="border-t border-border px-3 py-2">
          <p className="text-xs text-muted-foreground text-center">
            {profiles.length}/3 {t("playerSelector.accounts", "accounts")}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
