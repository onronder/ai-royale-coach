import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Swords, Crown, Users, Star, Target, Gift, Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { PlayerProfile, getClanBadgeUrl } from "@/hooks/usePlayerProfiles";
import { cn } from "@/lib/utils";

interface AccountComparisonProps {
  profiles: PlayerProfile[];
}

interface StatRowProps {
  label: string;
  icon: React.ReactNode;
  values: (number | undefined)[];
  format?: (val: number) => string;
  higherIsBetter?: boolean;
}

function StatRow({ label, icon, values, format = (v) => v.toLocaleString(), higherIsBetter = true }: StatRowProps) {
  const numericValues = values.map(v => v ?? 0);
  const maxValue = Math.max(...numericValues);
  const minValue = Math.min(...numericValues);
  const allEqual = maxValue === minValue;
  
  return (
    <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 py-3 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {values.map((value, idx) => {
        const numValue = value ?? 0;
        const isBest = !allEqual && (higherIsBetter ? numValue === maxValue : numValue === minValue);
        const isWorst = !allEqual && (higherIsBetter ? numValue === minValue : numValue === maxValue);
        
        return (
          <div 
            key={idx}
            className={cn(
              "text-center font-semibold font-rajdhani text-lg transition-all",
              isBest && "text-success",
              isWorst && "text-destructive/70",
              !isBest && !isWorst && "text-foreground"
            )}
          >
            {value !== undefined ? (
              <div className="flex items-center justify-center gap-1">
                <span>{format(value)}</span>
                {isBest && <TrendingUp className="h-4 w-4 text-success" />}
                {isWorst && <TrendingDown className="h-4 w-4 text-destructive/70" />}
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AccountComparison({ profiles }: AccountComparisonProps) {
  if (profiles.length < 2) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Add at least 2 player tags to compare accounts
          </p>
        </CardContent>
      </Card>
    );
  }

  // Pad to 3 columns for consistent layout
  const paddedProfiles = [...profiles];
  while (paddedProfiles.length < 3) {
    paddedProfiles.push(undefined as any);
  }

  const getWinRate = (profile: PlayerProfile | undefined) => {
    if (!profile?.wins && !profile?.losses) return undefined;
    const total = (profile.wins || 0) + (profile.losses || 0);
    if (total === 0) return undefined;
    return ((profile.wins || 0) / total) * 100;
  };

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Account Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Player Headers */}
        <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2 mb-6">
          <div></div>
          {paddedProfiles.map((profile, idx) => (
            <div key={idx} className="text-center">
              {profile ? (
                <div className="space-y-2">
                  {/* Avatar */}
                  <div className="mx-auto w-16 h-16 rounded-xl bg-gradient-primary flex items-center justify-center overflow-hidden shadow-glow">
                    {profile.clan_badge_id ? (
                      <img 
                        src={getClanBadgeUrl(profile.clan_badge_id)} 
                        alt="Clan badge"
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Crown className={cn("h-8 w-8 text-primary-foreground", profile.clan_badge_id && "hidden")} />
                  </div>
                  {/* Name */}
                  <p className="font-bold font-rajdhani truncate">
                    {profile.player_name || `#${profile.player_tag}`}
                  </p>
                  <Badge variant="outline" className="text-xs font-mono">
                    #{profile.player_tag}
                  </Badge>
                </div>
              ) : (
                <div className="h-28 flex items-center justify-center text-muted-foreground text-sm">
                  Empty slot
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats Comparison */}
        <div className="space-y-1">
          <StatRow 
            label="Trophies" 
            icon={<Trophy className="h-4 w-4 text-primary" />}
            values={paddedProfiles.map(p => p?.trophies)}
          />
          <StatRow 
            label="Best Trophies" 
            icon={<Star className="h-4 w-4 text-accent" />}
            values={paddedProfiles.map(p => p?.bestTrophies)}
          />
          <StatRow 
            label="Win Rate" 
            icon={<Target className="h-4 w-4 text-success" />}
            values={paddedProfiles.map(p => getWinRate(p))}
            format={(v) => `${v.toFixed(1)}%`}
          />
          <StatRow 
            label="Total Wins" 
            icon={<Swords className="h-4 w-4 text-chart-1" />}
            values={paddedProfiles.map(p => p?.wins)}
          />
          <StatRow 
            label="Total Losses" 
            icon={<Swords className="h-4 w-4 text-destructive" />}
            values={paddedProfiles.map(p => p?.losses)}
            higherIsBetter={false}
          />
          <StatRow 
            label="3-Crown Wins" 
            icon={<Crown className="h-4 w-4 text-gold" />}
            values={paddedProfiles.map(p => p?.threeCrownWins)}
          />
          <StatRow 
            label="Challenge Max Wins" 
            icon={<Shield className="h-4 w-4 text-chart-3" />}
            values={paddedProfiles.map(p => p?.challengeMaxWins)}
          />
          <StatRow 
            label="Challenge Cards Won" 
            icon={<Gift className="h-4 w-4 text-chart-4" />}
            values={paddedProfiles.map(p => p?.challengeCardsWon)}
          />
          <StatRow 
            label="War Day Wins" 
            icon={<Shield className="h-4 w-4 text-chart-5" />}
            values={paddedProfiles.map(p => p?.warDayWins)}
          />
          <StatRow 
            label="Donations" 
            icon={<Gift className="h-4 w-4 text-primary" />}
            values={paddedProfiles.map(p => p?.donations)}
          />
          <StatRow 
            label="King Level" 
            icon={<Crown className="h-4 w-4 text-accent" />}
            values={paddedProfiles.map(p => p?.expLevel)}
          />
        </div>

        {/* Clan Info */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clan Membership
          </p>
          <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))] gap-2">
            <div></div>
            {paddedProfiles.map((profile, idx) => (
              <div key={idx} className="text-center">
                {profile?.clan_name ? (
                  <Badge variant="secondary" className="truncate max-w-full">
                    {profile.clan_name}
                  </Badge>
                ) : profile ? (
                  <span className="text-xs text-muted-foreground">No Clan</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
