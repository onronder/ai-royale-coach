import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Crown, Trophy, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePlayerProfiles, getClanBadgeUrl } from "@/hooks/usePlayerProfiles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface QuickAccountSwitchProps {
  currentPlayerTag: string;
  userId: string | null;
}

export function QuickAccountSwitch({ currentPlayerTag, userId }: QuickAccountSwitchProps) {
  const navigate = useNavigate();
  const { profiles, isLoading } = usePlayerProfiles(userId);
  
  const currentProfile = profiles.find(
    p => p.player_tag === currentPlayerTag.replace('#', '').toUpperCase()
  );
  
  const otherProfiles = profiles.filter(
    p => p.player_tag !== currentPlayerTag.replace('#', '').toUpperCase()
  );

  const handleSwitchAccount = (playerTag: string) => {
    navigate(`/dashboard/${playerTag}`);
  };

  if (isLoading || profiles.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {currentProfile?.clan_badge_id ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={getClanBadgeUrl(currentProfile.clan_badge_id)} />
              <AvatarFallback><Crown className="h-3 w-3" /></AvatarFallback>
            </Avatar>
          ) : (
            <Crown className="h-4 w-4 text-primary" />
          )}
          <span className="hidden sm:inline font-rajdhani font-semibold">
            {currentProfile?.player_name || `#${currentPlayerTag}`}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-card border-border">
        <DropdownMenuLabel className="font-rajdhani text-xs text-muted-foreground">
          Switch Account
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Current Account */}
        {currentProfile && (
          <DropdownMenuItem disabled className="opacity-100 bg-primary/10">
            <div className="flex items-center gap-3 w-full">
              {currentProfile.clan_badge_id ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getClanBadgeUrl(currentProfile.clan_badge_id)} />
                  <AvatarFallback><Crown className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Crown className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-rajdhani font-semibold text-sm truncate">
                  {currentProfile.player_name || `#${currentProfile.player_tag}`}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Trophy className="h-3 w-3 text-primary" />
                  <span>{currentProfile.trophies?.toLocaleString() || '—'}</span>
                  <span className="ml-1 text-success">● Active</span>
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {/* Other Accounts */}
        {otherProfiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => handleSwitchAccount(profile.player_tag)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              {profile.clan_badge_id ? (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getClanBadgeUrl(profile.clan_badge_id)} />
                  <AvatarFallback><Crown className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Crown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-rajdhani font-semibold text-sm truncate">
                  {profile.player_name || `#${profile.player_tag}`}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Trophy className="h-3 w-3 text-primary" />
                  <span>{profile.trophies?.toLocaleString() || '—'}</span>
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => navigate('/select-player')}
          className="cursor-pointer text-muted-foreground"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Manage Accounts
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
