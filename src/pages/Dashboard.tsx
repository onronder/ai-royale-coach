import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LogOut, Trophy, Target, MessageSquare, Swords, Crown, Zap, Users } from "lucide-react";
import { toast } from "sonner";
import { useClashRoyalePlayer } from "@/hooks/useClashRoyalePlayer";
import { useClashRoyaleBattles } from "@/hooks/useClashRoyaleBattles";
import { usePlayerAnalysis } from "@/hooks/usePlayerAnalysis";
import { formatDistanceToNow } from "date-fns";
import { parseClashRoyaleDate } from "@/lib/utils";

const Dashboard = () => {
  const { playerTag } = useParams<{ playerTag: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  
  const { data: player, isLoading: playerLoading, error: playerError } = useClashRoyalePlayer(playerTag || null);
  const { data: battles, isLoading: battlesLoading, error: battlesError } = useClashRoyaleBattles(playerTag || null);
  const { data: analysis, isLoading: analysisLoading, error: analysisError } = usePlayerAnalysis(player, battles);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  if (!playerTag || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary">AI Royal</h1>
            <p className="text-sm text-muted-foreground">Player: {playerTag}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Trophy className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="matches">
              <Swords className="mr-2 h-4 w-4" />
              Matches
            </TabsTrigger>
            <TabsTrigger value="deck">
              <Target className="mr-2 h-4 w-4" />
              Deck
            </TabsTrigger>
            <TabsTrigger value="coach">
              <MessageSquare className="mr-2 h-4 w-4" />
              Coach
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-gradient-primary shadow-glow">
                <CardHeader>
                  <CardTitle className="text-primary-foreground">Player Stats</CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    {player?.name || playerTag}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-primary-foreground space-y-3">
                  {playerLoading ? (
                    <>
                      <Skeleton className="h-4 w-3/4 bg-primary-foreground/20" />
                      <Skeleton className="h-4 w-2/3 bg-primary-foreground/20" />
                      <Skeleton className="h-4 w-1/2 bg-primary-foreground/20" />
                    </>
                  ) : playerError ? (
                    <p className="text-sm">Failed to load player data</p>
                  ) : player ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        <span className="text-xl font-bold">{player.trophies.toLocaleString()}</span>
                        <span className="text-sm opacity-80">/ {player.bestTrophies.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        <span className="text-sm">{player.arena?.name || 'Unknown Arena'}</span>
                      </div>
                      {battles && (
                        <div className="flex items-center gap-2">
                          <Swords className="h-4 w-4" />
                          <span className="text-sm">
                            Win Rate: {((battles.filter(b => b.team[0]?.crowns > (b.opponent[0]?.crowns || 0)).length / battles.length) * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {player.clan && (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">{player.clan.name}</span>
                        </div>
                      )}
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="bg-card-elevated">
                <CardHeader>
                  <CardTitle>AI Coach Summary</CardTitle>
                  <CardDescription>Your personalized performance analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {analysisLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                    </div>
                  ) : analysisError ? (
                    <p className="text-sm text-muted-foreground">Unable to generate analysis. Please try again later.</p>
                  ) : analysis ? (
                    <div className="space-y-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-sm whitespace-pre-wrap">{analysis.analysis}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{analysis.stats.winRate}%</p>
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-2xl font-bold ${parseFloat(analysis.stats.avgTrophyChange) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {parseFloat(analysis.stats.avgTrophyChange) >= 0 ? '+' : ''}{analysis.stats.avgTrophyChange}
                          </p>
                          <p className="text-xs text-muted-foreground">Avg Trophy Δ</p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="matches" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Match History</CardTitle>
                <CardDescription>Your recent battles</CardDescription>
              </CardHeader>
              <CardContent>
                {battlesLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : battlesError ? (
                  <p className="text-muted-foreground">Failed to load battles</p>
                ) : battles && battles.length > 0 ? (
                  <div className="space-y-3">
                    {battles.slice(0, 10).map((battle, idx) => {
                      const playerCrowns = battle.team[0]?.crowns || 0;
                      const opponentCrowns = battle.opponent[0]?.crowns || 0;
                      const won = playerCrowns > opponentCrowns;
                      const trophyChange = battle.team[0]?.trophyChange || 0;
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <Badge variant={won ? "default" : "destructive"} className="w-16 justify-center">
                              {won ? "WIN" : "LOSS"}
                            </Badge>
                            <div>
                              <p className="font-medium">{battle.type}</p>
                              <p className="text-sm text-muted-foreground">
                                vs {battle.opponent[0]?.name || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${trophyChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {trophyChange >= 0 ? '+' : ''}{trophyChange}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(parseClashRoyaleDate(battle.battleTime), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No battles found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deck" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Deck</CardTitle>
                <CardDescription>Your active battle deck</CardDescription>
              </CardHeader>
              <CardContent>
                {playerLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : playerError ? (
                  <p className="text-muted-foreground">Failed to load deck</p>
                ) : player?.currentDeck ? (
                  <div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {player.currentDeck.map((card, idx) => (
                        <div key={idx} className="border rounded-lg p-3 text-center">
                          <p className="font-medium text-sm mb-1">{card.name}</p>
                          <Badge variant="outline" className="text-xs">Lv {card.level}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No deck data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coach" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Coach Chat</CardTitle>
                <CardDescription>Ask your AI coach anything</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Chat interface coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;