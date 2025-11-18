import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Trophy, Target, MessageSquare, Swords } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const { playerTag } = useParams<{ playerTag: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

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
                    Your current performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-primary-foreground">
                  <p>Trophies: Loading...</p>
                  <p>Win Rate: Loading...</p>
                </CardContent>
              </Card>

              <Card className="bg-card-elevated">
                <CardHeader>
                  <CardTitle>AI Coach Summary</CardTitle>
                  <CardDescription>Top insights from your AI coach</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Loading AI analysis...</p>
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
                <p className="text-muted-foreground">Loading matches...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deck" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Deck Analysis</CardTitle>
                <CardDescription>AI-powered deck evaluation</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Loading deck analysis...</p>
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