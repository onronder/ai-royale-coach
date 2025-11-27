import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Trophy, Users, Crown, Loader2, Clock, Sparkles, GitCompare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePlayerProfiles, PlayerProfile, getClanBadgeUrl } from "@/hooks/usePlayerProfiles";
import { DataLoader } from "@/components/ui/data-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountComparison } from "./AccountComparison";
import { cn } from "@/lib/utils";

interface PlayerTagSelectorProps {
  userId: string;
  onSelect?: (playerTag: string) => void;
}

export function PlayerTagSelector({ userId, onSelect }: PlayerTagSelectorProps) {
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
      await addProfile({ playerTag: newTag.trim() });
      setNewTag("");
      setIsAddingNew(false);
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
          {profiles.length}/3 accounts linked
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
            {showComparison ? "Hide Comparison" : "Compare Accounts"}
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
            />
          ))}
        </div>
      ) : (
        <Card variant="arena" className="p-8">
          <EmptyState
            icon={Users}
            title="No Player Tags Linked"
            description="Add your Clash Royale player tag to get started with personalized analytics and coaching."
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
                  <Label htmlFor="newTag" className="text-sm font-semibold">Player Tag</Label>
                  <Input
                    id="newTag"
                    placeholder="Enter tag (e.g., #ABC123)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="font-mono h-12 bg-background/50 border-border/50 focus:border-gold focus:ring-gold/30"
                    disabled={isAdding}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find your tag in Clash Royale → Profile → Below your name
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="golden" disabled={isAdding || !newTag.trim()}>
                    {isAdding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Tag
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddingNew(false)}
                    disabled={isAdding}
                  >
                    Cancel
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
                <span className="text-gold font-rajdhani font-semibold">Add Another Player Tag</span>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {!canAddMore && (
        <p className="text-center text-sm text-muted-foreground">
          Maximum of 3 player tags reached. Remove one to add a new one.
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
}

function PlayerTagCard({ profile, onSelect, onRemove, isRemoving, index }: PlayerTagCardProps) {
  const [imageError, setImageError] = useState(false);
  const badgeUrl = getClanBadgeUrl(profile.clan_badge_id);
  
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
                  <span>Last used {formatDistanceToNow(new Date(profile.last_seen_at), { addSuffix: true })}</span>
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
