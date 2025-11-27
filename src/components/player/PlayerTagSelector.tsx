import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Trophy, Users, Crown, Loader2, Clock, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePlayerProfiles, PlayerProfile } from "@/hooks/usePlayerProfiles";
import { DataLoader } from "@/components/ui/data-loader";
import { EmptyState } from "@/components/ui/empty-state";

interface PlayerTagSelectorProps {
  userId: string;
  onSelect?: (playerTag: string) => void;
}

export function PlayerTagSelector({ userId, onSelect }: PlayerTagSelectorProps) {
  const navigate = useNavigate();
  const [newTag, setNewTag] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  
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
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold font-rajdhani">Select Your Account</h2>
        <p className="text-muted-foreground">
          Choose a player tag to view your stats, or add a new one
        </p>
        <Badge variant="outline" className="text-xs">
          {profiles.length}/3 accounts linked
        </Badge>
      </div>

      {/* Player Tag Cards */}
      {profiles.length > 0 ? (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <PlayerTagCard
              key={profile.id}
              profile={profile}
              onSelect={() => handleSelectPlayer(profile.player_tag)}
              onRemove={(e) => handleRemoveTag(e, profile.id)}
              isRemoving={isRemoving}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No Player Tags Linked"
          description="Add your Clash Royale player tag to get started with personalized analytics and coaching."
          variant="card"
        />
      )}

      {/* Add New Tag */}
      {canAddMore && (
        <Card className="border-dashed border-2 border-primary/30 bg-card/50">
          <CardContent className="pt-6">
            {isAddingNew ? (
              <form onSubmit={handleAddTag} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newTag">Player Tag</Label>
                  <Input
                    id="newTag"
                    placeholder="Enter tag (e.g., #ABC123)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="font-mono"
                    disabled={isAdding}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find your tag in Clash Royale → Profile → Below your name
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={isAdding || !newTag.trim()}>
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
                className="w-full h-20 border-2 border-dashed border-muted hover:border-primary/50"
                onClick={() => setIsAddingNew(true)}
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Another Player Tag
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
}

function PlayerTagCard({ profile, onSelect, onRemove, isRemoving }: PlayerTagCardProps) {
  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-primary-glow hover:border-primary/50 hover:-translate-y-1 group"
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Avatar/Icon */}
            <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow flex-shrink-0">
              <Crown className="h-7 w-7 text-primary-foreground" />
            </div>
            
            {/* Player Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold font-rajdhani text-lg truncate">
                  {profile.player_name || `#${profile.player_tag}`}
                </h3>
                {profile.player_name && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    #{profile.player_tag}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                {profile.trophies !== undefined && (
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{profile.trophies.toLocaleString()}</span>
                  </div>
                )}
                {profile.arena_name && (
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <span className="truncate">{profile.arena_name}</span>
                  </div>
                )}
                {profile.clan_name && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="truncate">{profile.clan_name}</span>
                  </div>
                )}
              </div>
              
              {profile.last_seen_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
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
