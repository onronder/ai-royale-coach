import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profiles, isLoading } = usePlayerProfiles(userId);
  
  const currentProfile = profiles.find(
    p => p.player_tag === currentPlayerTag.replace('#', '').toUpperCase()
  );
  
  const otherProfiles = profiles.filter(
    p => p.player_tag !== currentPlayerTag.replace('#', '').toUpperCase()
  );

  const handleSwitchAccount = (playerTag: string) => {
    navigate(`/player/${playerTag}`);
  };

  if (isLoading || profiles.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2 h-9 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all">
          {currentProfile?.clan_badge_id ? (
            <Avatar className="h-6 w-6 ring-1 ring-primary/30">
              <AvatarImage src={getClanBadgeUrl(currentProfile.clan_badge_id)} />
              <AvatarFallback className="bg-primary/20"><Crown className="h-3 w-3 text-primary" /></AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center ring-1 ring-primary/30">
              <Crown className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
          <span className="hidden sm:inline font-rajdhani font-semibold text-sm">
            {currentProfile?.player_name || `#${currentPlayerTag}`}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-card/98 backdrop-blur-md border-border/50 shadow-xl z-50 animate-in zoom-in-95 slide-in-from-top-2 duration-200">
        <DropdownMenuLabel className="font-rajdhani text-xs text-muted-foreground uppercase tracking-wide">
          {t('dashboard.accountSwitch.title', 'Switch Account')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        
        {/* Current Account */}
        {currentProfile && (
          <DropdownMenuItem 
            disabled 
            className="opacity-100 rounded-lg mx-1 my-1 relative overflow-hidden
                       bg-gradient-to-r from-primary/30 via-primary/20 to-primary/30
                       border-2 border-primary/60 
                       shadow-[0_0_25px_hsl(190_100%_50%/0.4)]
                       animate-active-card-glow"
          >
            {/* Shimmer overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer bg-[length:200%_100%]" />
            
            <div className="relative flex items-center gap-3 w-full py-1">
              {currentProfile.clan_badge_id ? (
                <Avatar className="h-10 w-10 ring-2 ring-primary shadow-[0_0_15px_hsl(190_100%_50%/0.6)]">
                  <AvatarImage src={getClanBadgeUrl(currentProfile.clan_badge_id)} />
                  <AvatarFallback className="bg-primary/20"><Crown className="h-5 w-5 text-primary" /></AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/30 flex items-center justify-center ring-2 ring-primary shadow-[0_0_15px_hsl(190_100%_50%/0.6)]">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-rajdhani font-bold text-sm truncate text-foreground">
                  {currentProfile.player_name || `#${currentProfile.player_tag}`}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-gold group/trophy">
                    <Trophy className="h-3 w-3 animate-[trophy-shine_2s_ease-in-out_infinite]" />
                    <span className="font-semibold">{currentProfile.trophies?.toLocaleString() || '—'}</span>
                  </div>
                  <span className="px-1.5 py-0.5 bg-success/30 text-success text-[10px] font-bold rounded-full border border-success/50 shadow-[0_0_10px_hsl(145_80%_42%/0.5)] flex items-center gap-1">
                    <Crown className="h-2.5 w-2.5 text-gold animate-[trophy-shine_2s_ease-in-out_infinite]" />
                    {t('dashboard.accountSwitch.active', 'Active')}
                  </span>
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator className="bg-border/50" />
        
        {/* Other Accounts */}
        {otherProfiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => handleSwitchAccount(profile.player_tag)}
            className="group/card cursor-pointer mx-1 my-0.5 rounded-lg 
                       hover:bg-muted/50 hover:border-primary/30 
                       hover:shadow-[0_0_12px_hsl(190_100%_50%/0.2)] 
                       hover:-translate-y-0.5
                       border border-transparent
                       transition-all duration-200"
          >
            <div className="flex items-center gap-3 w-full py-1">
              {profile.clan_badge_id ? (
                <Avatar className="h-10 w-10 ring-1 ring-border/50">
                  <AvatarImage src={getClanBadgeUrl(profile.clan_badge_id)} />
                  <AvatarFallback className="bg-muted"><Crown className="h-5 w-5 text-muted-foreground" /></AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center ring-1 ring-border/50">
                  <Crown className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-rajdhani font-semibold text-sm truncate">
                  {profile.player_name || `#${profile.player_tag}`}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover/card:text-gold transition-colors duration-200">
                  <Trophy className="h-3 w-3 text-gold/70 group-hover/card:text-gold group-hover/card:drop-shadow-[0_0_6px_hsl(45_100%_55%/0.6)] transition-all duration-200" />
                  <span>{profile.trophies?.toLocaleString() || '—'}</span>
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator className="bg-border/50" />
        
        <DropdownMenuItem
          onClick={() => navigate('/select-player')}
          className="cursor-pointer mx-1 my-1 rounded-lg text-primary/80 hover:text-primary 
                     hover:bg-primary/10 border border-transparent hover:border-primary/30
                     hover:shadow-[0_0_12px_hsl(190_100%_50%/0.3)] transition-all duration-200"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          {t('dashboard.accountSwitch.manage', 'Manage Accounts')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
