import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BookOpen, ChevronRight, Home, User, BarChart3, Swords, 
  Wrench, TrendingUp, Wallet, Trophy, Users, Shield,
  MessageSquare, Bell, Globe, Settings, HelpCircle, Search,
  Crown, Target, Zap, Lightbulb, CheckCircle2, ArrowLeft
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const Help = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("getting-started");
  const [isResettingTour, setIsResettingTour] = useState(false);

  // Map tab help IDs to help section IDs
  const tabToSectionMap: Record<string, string> = {
    overview: "stats",
    matches: "matches",
    deck: "deck",
    builder: "builder",
    collection: "collection",
    leaderboard: "leaderboard",
    tournaments: "tournaments",
    clans: "clans",
    analytics: "analytics",
  };

  // Define sections with searchable keywords
  const sections = [
    { 
      id: "getting-started", 
      icon: Home, 
      label: t("help.sections.gettingStarted"),
      keywords: [
        t("help.gettingStarted.title"),
        t("help.gettingStarted.createAccount.title"),
        t("help.gettingStarted.findTag.title"),
        t("help.gettingStarted.multiAccount.title"),
        "account", "tag", "player tag", "sign up", "register", "login"
      ]
    },
    { 
      id: "dashboard", 
      icon: BarChart3, 
      label: t("help.sections.dashboard"),
      keywords: [
        t("help.dashboard.title"),
        t("help.dashboard.overview.title"),
        t("help.dashboard.navigation.title"),
        t("help.dashboard.sync.title"),
        "tabs", "navigation", "sync", "refresh", "data"
      ]
    },
    { 
      id: "stats", 
      icon: TrendingUp, 
      label: t("help.sections.stats"),
      keywords: [
        t("help.stats.title"),
        t("help.stats.overview.title"),
        t("help.stats.charts.title"),
        t("help.stats.aiSummary.title"),
        "trophies", "win rate", "arena", "clan", "statistics", "chart"
      ]
    },
    { 
      id: "matches", 
      icon: Swords, 
      label: t("help.sections.matches"),
      keywords: [
        t("help.matches.title"),
        t("help.matches.history.title"),
        t("help.matches.detail.title"),
        t("help.matches.discuss.title"),
        "battle", "history", "opponent", "crowns", "analysis"
      ]
    },
    { 
      id: "deck", 
      icon: Wallet, 
      label: t("help.sections.deck"),
      keywords: [
        t("help.deck.title"),
        t("help.deck.current.title"),
        t("help.deck.recommendations.title"),
        t("help.deck.analysis.title"),
        "cards", "elixir", "recommendations", "current deck"
      ]
    },
    { 
      id: "builder", 
      icon: Wrench, 
      label: t("help.sections.builder"),
      keywords: [
        t("help.builder.title"),
        t("help.builder.create.title"),
        t("help.builder.templates.title"),
        t("help.builder.compare.title"),
        "build", "create", "templates", "compare", "save deck"
      ]
    },
    { 
      id: "analytics", 
      icon: BarChart3, 
      label: t("help.sections.analytics"),
      keywords: [
        t("help.analytics.title"),
        t("help.analytics.deckStats.title"),
        t("help.analytics.mastery.title"),
        t("help.analytics.achievements.title"),
        "statistics", "mastery", "achievements", "trends", "performance"
      ]
    },
    { 
      id: "collection", 
      icon: Wallet, 
      label: t("help.sections.collection"),
      keywords: [
        t("help.collection.title"),
        t("help.collection.cards.title"),
        t("help.collection.levels.title"),
        t("help.collection.progress.title"),
        "cards", "rarity", "level", "upgrade", "common", "rare", "epic", "legendary", "champion"
      ]
    },
    { 
      id: "leaderboard", 
      icon: Trophy, 
      label: t("help.sections.leaderboard"),
      keywords: [
        t("help.leaderboard.title"),
        t("help.leaderboard.rankings.title"),
        t("help.leaderboard.global.title"),
        "ranking", "top players", "global", "position"
      ]
    },
    { 
      id: "tournaments", 
      icon: Crown, 
      label: t("help.sections.tournaments"),
      keywords: [
        t("help.tournaments.title"),
        t("help.tournaments.browse.title"),
        t("help.tournaments.create.title"),
        t("help.tournaments.join.title"),
        "tournament", "compete", "prize", "registration", "bracket"
      ]
    },
    { 
      id: "clans", 
      icon: Users, 
      label: t("help.sections.clans"),
      keywords: [
        t("help.clans.title"),
        t("help.clans.search.title"),
        t("help.clans.join.title"),
        t("help.clans.details.title"),
        "clan", "members", "war", "join request", "search clan"
      ]
    },
    { 
      id: "coach", 
      icon: MessageSquare, 
      label: t("help.sections.coach"),
      keywords: [
        t("help.coach.title"),
        t("help.coach.chat.title"),
        t("help.coach.tips.title"),
        t("help.coach.quota.title"),
        "AI", "coach", "chat", "advice", "tips", "strategy", "help"
      ]
    },
    { 
      id: "features", 
      icon: Zap, 
      label: t("help.sections.features"),
      keywords: [
        t("help.features.title"),
        t("help.features.language.title"),
        t("help.features.notifications.title"),
        t("help.features.progress.title"),
        t("help.features.comparison.title"),
        "language", "notifications", "progress", "comparison", "settings"
      ]
    },
    { 
      id: "faq", 
      icon: HelpCircle, 
      label: t("help.sections.faq"),
      keywords: [
        t("help.faq.title"),
        "question", "answer", "problem", "issue", "help", "support"
      ]
    },
  ];

  // Filter sections based on search query
  const filteredSections = searchQuery.trim() === "" 
    ? sections 
    : sections.filter(section => {
        const query = searchQuery.toLowerCase();
        const labelMatch = section.label.toLowerCase().includes(query);
        const keywordMatch = section.keywords.some(kw => 
          kw.toLowerCase().includes(query)
        );
        return labelMatch || keywordMatch;
      });

  const filteredSectionIds = new Set(filteredSections.map(s => s.id));

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Handle URL hash on mount and hash changes
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1); // Remove '#'
      if (hash) {
        // Check if it's a tab help ID that needs mapping
        const targetSection = tabToSectionMap[hash] || hash;
        // Verify section exists
        const sectionExists = sections.some(s => s.id === targetSection);
        if (sectionExists) {
          setTimeout(() => scrollToSection(targetSection), 100);
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Handle restart tour
  const handleRestartTour = async () => {
    setIsResettingTour(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(t("help.gettingStarted.restartTour.loginRequired"));
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed_at: null })
        .eq("id", session.user.id);

      if (error) throw error;

      toast.success(t("help.gettingStarted.restartTour.success"));
      navigate("/select-player");
    } catch (error) {
      console.error("Failed to reset tour:", error);
      toast.error(t("help.gettingStarted.restartTour.error"));
    } finally {
      setIsResettingTour(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Help Center - AI Royale | Complete User Guide</title>
        <meta name="description" content="Complete guide to AI Royale. Learn how to use deck analysis, AI coaching, card collection tracking, and all features to improve your Clash Royale gameplay." />
        <link rel="canonical" href="https://ai-royale.com/help" />
        <meta property="og:title" content="Help Center - AI Royale" />
        <meta property="og:description" content="Complete guide to AI Royale. Learn how to use all features to improve your Clash Royale gameplay." />
        <meta property="og:url" content="https://ai-royale.com/help" />
        <meta property="og:image" content="https://ai-royale.com/og-help.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:image" content="https://ai-royale.com/og-help.png" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Why doesn't my latest deck show up in AI Royale?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The Clash Royale API has a 5-15 minute delay. Your recent in-game changes will appear after this delay. Try refreshing in a few minutes."
                }
              },
              {
                "@type": "Question",
                "name": "How is my win rate calculated?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Win rate is calculated from your last 25 battles available from the API. It only includes ladder and challenge battles, not friendly battles or 2v2."
                }
              },
              {
                "@type": "Question",
                "name": "Why are some features requiring login?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Features like saving decks, AI coaching, and personalized recommendations require an account to store your preferences and history."
                }
              },
              {
                "@type": "Question",
                "name": "Can I use AI Royale on mobile?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! AI Royale is fully responsive and works on all devices. The interface adapts to your screen size."
                }
              },
              {
                "@type": "Question",
                "name": "How accurate are the AI matchup predictions?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Predictions are based on deck composition analysis and historical data. Actual results may vary based on skill level and card levels."
                }
              },
              {
                "@type": "Question",
                "name": "Why can't I add more than 3 accounts?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "The 3-account limit ensures fair usage of our AI services and API resources for all users."
                }
              },
              {
                "@type": "Question",
                "name": "Is my data secure with AI Royale?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! We use industry-standard encryption and never store your Clash Royale login credentials. We only access public data through your Player Tag."
                }
              }
            ]
          })}
        </script>
      </Helmet>
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{t("help.title")}</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-rajdhani font-bold text-foreground flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                {t("help.title")}
              </h1>
              <p className="text-muted-foreground mt-2">{t("help.subtitle")}</p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("help.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 shrink-0">
            <Card className="sticky top-24 bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  {t("help.navigation")}
                  {searchQuery && (
                    <Badge variant="secondary" className="text-xs">
                      {filteredSections.length} {t("help.results")}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[60vh] lg:h-[70vh]">
                  <nav className="space-y-1">
                    {filteredSections.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>{t("help.noResults")}</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => setSearchQuery("")}
                          className="mt-2"
                        >
                          {t("help.clearSearch")}
                        </Button>
                      </div>
                    ) : (
                      filteredSections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                            activeSection === section.id
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <section.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{section.label}</span>
                        </button>
                      ))
                    )}
                  </nav>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1 space-y-12">
            {/* No results message in main content */}
            {filteredSections.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t("help.noResultsTitle")}
                </h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  {t("help.noResultsDescription", { query: searchQuery })}
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  {t("help.clearSearch")}
                </Button>
              </div>
            )}
            {/* Getting Started */}
            {filteredSectionIds.has("getting-started") && (
              <section id="getting-started" className="scroll-mt-24">
                <SectionHeader 
                  icon={Home} 
                  title={t("help.gettingStarted.title")} 
                  badge={t("help.gettingStarted.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.gettingStarted.createAccount.title")}
                    icon={User}
                  >
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.gettingStarted.createAccount.step1")}</li>
                      <li>{t("help.gettingStarted.createAccount.step2")}</li>
                      <li>{t("help.gettingStarted.createAccount.step3")}</li>
                      <li>{t("help.gettingStarted.createAccount.step4")}</li>
                    </ol>
                  </HelpCard>

                  <HelpCard
                    title={t("help.gettingStarted.findTag.title")}
                    icon={Target}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.gettingStarted.findTag.intro")}</p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.gettingStarted.findTag.step1")}</li>
                      <li>{t("help.gettingStarted.findTag.step2")}</li>
                      <li>{t("help.gettingStarted.findTag.step3")}</li>
                      <li>{t("help.gettingStarted.findTag.step4")}</li>
                    </ol>
                    <div className="mt-4 p-3 bg-muted/50 rounded-md">
                      <p className="text-sm font-medium">{t("help.gettingStarted.findTag.example")}</p>
                      <code className="text-primary">#ABC123XY</code>
                    </div>
                  </HelpCard>

                  <HelpCard
                    title={t("help.gettingStarted.multiAccount.title")}
                    icon={Users}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.gettingStarted.multiAccount.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.gettingStarted.multiAccount.point1")}</li>
                      <li>{t("help.gettingStarted.multiAccount.point2")}</li>
                      <li>{t("help.gettingStarted.multiAccount.point3")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.gettingStarted.restartTour.title")}
                    icon={Lightbulb}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.gettingStarted.restartTour.description")}</p>
                    <Button 
                      variant="outline" 
                      onClick={handleRestartTour}
                      disabled={isResettingTour}
                      className="border-primary/50 hover:bg-primary/10"
                    >
                      {isResettingTour ? t("common.loading") : t("help.gettingStarted.restartTour.button")}
                    </Button>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Dashboard Overview */}
            {filteredSectionIds.has("dashboard") && (
              <section id="dashboard" className="scroll-mt-24">
                <SectionHeader 
                  icon={BarChart3} 
                  title={t("help.dashboard.title")} 
                  badge={t("help.dashboard.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.dashboard.overview.title")}
                    icon={BarChart3}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.dashboard.overview.intro")}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {["stats", "matches", "deck", "builder", "analytics", "collection", "leaderboard", "tournaments", "clans"].map((tab) => (
                        <div key={tab} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                          <Badge variant="outline" className="text-xs">{t(`help.dashboard.tabs.${tab}`)}</Badge>
                        </div>
                      ))}
                    </div>
                  </HelpCard>

                  <HelpCard
                    title={t("help.dashboard.navigation.title")}
                    icon={Settings}
                  >
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.dashboard.navigation.point1")}</li>
                      <li>{t("help.dashboard.navigation.point2")}</li>
                      <li>{t("help.dashboard.navigation.point3")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.dashboard.sync.title")}
                    icon={Zap}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.dashboard.sync.intro")}</p>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                      <p className="text-sm text-amber-200">{t("help.dashboard.sync.note")}</p>
                    </div>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Stats Tab */}
            {filteredSectionIds.has("stats") && (
              <section id="stats" className="scroll-mt-24">
                <SectionHeader 
                  icon={TrendingUp} 
                  title={t("help.stats.title")} 
                  badge={t("help.stats.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.stats.overview.title")}
                    icon={TrendingUp}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.stats.overview.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>{t("help.stats.overview.trophies")}:</strong> {t("help.stats.overview.trophiesDesc")}</li>
                      <li><strong>{t("help.stats.overview.winRate")}:</strong> {t("help.stats.overview.winRateDesc")}</li>
                      <li><strong>{t("help.stats.overview.arena")}:</strong> {t("help.stats.overview.arenaDesc")}</li>
                      <li><strong>{t("help.stats.overview.clan")}:</strong> {t("help.stats.overview.clanDesc")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.stats.charts.title")}
                    icon={BarChart3}
                  >
                    <p className="text-muted-foreground">{t("help.stats.charts.intro")}</p>
                  </HelpCard>

                  <HelpCard
                    title={t("help.stats.aiSummary.title")}
                    icon={MessageSquare}
                  >
                    <p className="text-muted-foreground">{t("help.stats.aiSummary.intro")}</p>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Matches Tab */}
            {filteredSectionIds.has("matches") && (
              <section id="matches" className="scroll-mt-24">
                <SectionHeader 
                  icon={Swords} 
                  title={t("help.matches.title")} 
                  badge={t("help.matches.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.matches.history.title")}
                    icon={Swords}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.matches.history.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.matches.history.point1")}</li>
                      <li>{t("help.matches.history.point2")}</li>
                      <li>{t("help.matches.history.point3")}</li>
                      <li>{t("help.matches.history.point4")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.matches.detail.title")}
                    icon={Target}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.matches.detail.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>{t("help.matches.detail.comparison")}:</strong> {t("help.matches.detail.comparisonDesc")}</li>
                      <li><strong>{t("help.matches.detail.analysis")}:</strong> {t("help.matches.detail.analysisDesc")}</li>
                      <li><strong>{t("help.matches.detail.moments")}:</strong> {t("help.matches.detail.momentsDesc")}</li>
                      <li><strong>{t("help.matches.detail.counter")}:</strong> {t("help.matches.detail.counterDesc")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.matches.discuss.title")}
                    icon={MessageSquare}
                  >
                    <p className="text-muted-foreground">{t("help.matches.discuss.intro")}</p>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Deck Tab */}
            {filteredSectionIds.has("deck") && (
              <section id="deck" className="scroll-mt-24">
                <SectionHeader 
                  icon={Wallet} 
                  title={t("help.deck.title")} 
                  badge={t("help.deck.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.deck.current.title")}
                    icon={Wallet}
                  >
                    <p className="text-muted-foreground">{t("help.deck.current.intro")}</p>
                  </HelpCard>

                  <HelpCard
                    title={t("help.deck.recommendations.title")}
                    icon={Lightbulb}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.deck.recommendations.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>{t("help.deck.recommendations.ownership")}:</strong> {t("help.deck.recommendations.ownershipDesc")}</li>
                      <li><strong>{t("help.deck.recommendations.skill")}:</strong> {t("help.deck.recommendations.skillDesc")}</li>
                      <li><strong>{t("help.deck.recommendations.adopt")}:</strong> {t("help.deck.recommendations.adoptDesc")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.deck.analysis.title")}
                    icon={BarChart3}
                  >
                    <p className="text-muted-foreground">{t("help.deck.analysis.intro")}</p>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Builder Tab */}
            {filteredSectionIds.has("builder") && (
              <section id="builder" className="scroll-mt-24">
                <SectionHeader 
                  icon={Wrench} 
                  title={t("help.builder.title")} 
                  badge={t("help.builder.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.builder.create.title")}
                    icon={Wrench}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.builder.create.intro")}</p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.builder.create.step1")}</li>
                      <li>{t("help.builder.create.step2")}</li>
                      <li>{t("help.builder.create.step3")}</li>
                      <li>{t("help.builder.create.step4")}</li>
                      <li>{t("help.builder.create.step5")}</li>
                    </ol>
                  </HelpCard>

                  <HelpCard
                    title={t("help.builder.templates.title")}
                    icon={Crown}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.builder.templates.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.builder.templates.point1")}</li>
                      <li>{t("help.builder.templates.point2")}</li>
                      <li>{t("help.builder.templates.point3")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.builder.compare.title")}
                    icon={Target}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.builder.compare.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.builder.compare.point1")}</li>
                      <li>{t("help.builder.compare.point2")}</li>
                      <li>{t("help.builder.compare.point3")}</li>
                    </ul>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Analytics Tab */}
            {filteredSectionIds.has("analytics") && (
              <section id="analytics" className="scroll-mt-24">
                <SectionHeader 
                  icon={BarChart3} 
                  title={t("help.analytics.title")} 
                  badge={t("help.analytics.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.analytics.deckStats.title")}
                    icon={TrendingUp}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.analytics.deckStats.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.analytics.deckStats.point1")}</li>
                      <li>{t("help.analytics.deckStats.point2")}</li>
                      <li>{t("help.analytics.deckStats.point3")}</li>
                      <li>{t("help.analytics.deckStats.point4")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.analytics.mastery.title")}
                    icon={Crown}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.analytics.mastery.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>{t("help.analytics.mastery.levels")}:</strong> {t("help.analytics.mastery.levelsDesc")}</li>
                      <li><strong>{t("help.analytics.mastery.partners")}:</strong> {t("help.analytics.mastery.partnersDesc")}</li>
                      <li><strong>{t("help.analytics.mastery.matchups")}:</strong> {t("help.analytics.mastery.matchupsDesc")}</li>
                      <li><strong>{t("help.analytics.mastery.tips")}:</strong> {t("help.analytics.mastery.tipsDesc")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.analytics.achievements.title")}
                    icon={Trophy}
                  >
                    <p className="text-muted-foreground">{t("help.analytics.achievements.intro")}</p>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Collection Tab */}
            {filteredSectionIds.has("collection") && (
              <section id="collection" className="scroll-mt-24">
                <SectionHeader 
                  icon={Wallet} 
                  title={t("help.collection.title")} 
                  badge={t("help.collection.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.collection.overview.title")}
                    icon={Wallet}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.collection.overview.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.collection.overview.point1")}</li>
                      <li>{t("help.collection.overview.point2")}</li>
                      <li>{t("help.collection.overview.point3")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.collection.levels.title")}
                    icon={TrendingUp}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.collection.levels.intro")}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-muted/30 rounded-md">
                        <span className="text-gray-400">Common:</span> 1-16
                      </div>
                      <div className="p-2 bg-muted/30 rounded-md">
                        <span className="text-blue-400">Rare:</span> 3-16
                      </div>
                      <div className="p-2 bg-muted/30 rounded-md">
                        <span className="text-purple-400">Epic:</span> 6-16
                      </div>
                      <div className="p-2 bg-muted/30 rounded-md">
                        <span className="text-yellow-400">Legendary:</span> 9-16
                      </div>
                      <div className="p-2 bg-muted/30 rounded-md col-span-2">
                        <span className="text-cyan-400">Champion:</span> 11-16
                      </div>
                    </div>
                  </HelpCard>

                  <HelpCard
                    title={t("help.collection.sync.title")}
                    icon={Zap}
                  >
                    <p className="text-muted-foreground">{t("help.collection.sync.intro")}</p>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Leaderboard Tab */}
            {filteredSectionIds.has("leaderboard") && (
              <section id="leaderboard" className="scroll-mt-24">
                <SectionHeader 
                  icon={Trophy} 
                  title={t("help.leaderboard.title")} 
                  badge={t("help.leaderboard.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.leaderboard.yourRanking.title")}
                    icon={User}
                  >
                    <p className="text-muted-foreground">{t("help.leaderboard.yourRanking.intro")}</p>
                  </HelpCard>

                  <HelpCard
                    title={t("help.leaderboard.global.title")}
                    icon={Globe}
                  >
                    <p className="text-muted-foreground">{t("help.leaderboard.global.intro")}</p>
                  </HelpCard>

                  <HelpCard
                    title={t("help.leaderboard.clan.title")}
                    icon={Users}
                  >
                    <p className="text-muted-foreground">{t("help.leaderboard.clan.intro")}</p>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Tournaments Tab */}
            {filteredSectionIds.has("tournaments") && (
              <section id="tournaments" className="scroll-mt-24">
                <SectionHeader 
                  icon={Crown} 
                  title={t("help.tournaments.title")} 
                  badge={t("help.tournaments.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.tournaments.browse.title")}
                    icon={Crown}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.tournaments.browse.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>{t("help.tournaments.browse.registration")}:</strong> {t("help.tournaments.browse.registrationDesc")}</li>
                      <li><strong>{t("help.tournaments.browse.inProgress")}:</strong> {t("help.tournaments.browse.inProgressDesc")}</li>
                      <li><strong>{t("help.tournaments.browse.completed")}:</strong> {t("help.tournaments.browse.completedDesc")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.tournaments.create.title")}
                    icon={Wrench}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.tournaments.create.intro")}</p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.tournaments.create.step1")}</li>
                      <li>{t("help.tournaments.create.step2")}</li>
                      <li>{t("help.tournaments.create.step3")}</li>
                    </ol>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Clans Tab */}
            {filteredSectionIds.has("clans") && (
              <section id="clans" className="scroll-mt-24">
                <SectionHeader 
                  icon={Users} 
                  title={t("help.clans.title")} 
                  badge={t("help.clans.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.clans.search.title")}
                    icon={Search}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.clans.search.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.clans.search.point1")}</li>
                      <li>{t("help.clans.search.point2")}</li>
                      <li>{t("help.clans.search.point3")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.clans.types.title")}
                    icon={Shield}
                  >
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>{t("help.clans.types.open")}:</strong> {t("help.clans.types.openDesc")}</li>
                      <li><strong>{t("help.clans.types.invite")}:</strong> {t("help.clans.types.inviteDesc")}</li>
                      <li><strong>{t("help.clans.types.closed")}:</strong> {t("help.clans.types.closedDesc")}</li>
                    </ul>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* AI Coach */}
            {filteredSectionIds.has("coach") && (
              <section id="coach" className="scroll-mt-24">
                <SectionHeader 
                  icon={MessageSquare} 
                  title={t("help.coach.title")} 
                  badge={t("help.coach.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.coach.overview.title")}
                    icon={MessageSquare}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.coach.overview.intro")}</p>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.coach.overview.step1")}</li>
                      <li>{t("help.coach.overview.step2")}</li>
                      <li>{t("help.coach.overview.step3")}</li>
                    </ol>
                  </HelpCard>

                  <HelpCard
                    title={t("help.coach.context.title")}
                    icon={Target}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.coach.context.intro")}</p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.coach.context.point1")}</li>
                      <li>{t("help.coach.context.point2")}</li>
                      <li>{t("help.coach.context.point3")}</li>
                      <li>{t("help.coach.context.point4")}</li>
                    </ul>
                  </HelpCard>

                  <HelpCard
                    title={t("help.coach.proactive.title")}
                    icon={Lightbulb}
                  >
                    <p className="text-muted-foreground">{t("help.coach.proactive.intro")}</p>
                  </HelpCard>

                  <HelpCard
                    title={t("help.coach.quota.title")}
                    icon={Zap}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.coach.quota.intro")}</p>
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
                      <p className="text-sm text-primary">{t("help.coach.quota.limit")}</p>
                    </div>
                  </HelpCard>

                  <HelpCard
                    title={t("help.coach.tips.title")}
                    icon={CheckCircle2}
                  >
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>{t("help.coach.tips.tip1")}</li>
                      <li>{t("help.coach.tips.tip2")}</li>
                      <li>{t("help.coach.tips.tip3")}</li>
                      <li>{t("help.coach.tips.tip4")}</li>
                    </ul>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* Additional Features */}
            {filteredSectionIds.has("features") && (
              <section id="features" className="scroll-mt-24">
                <SectionHeader 
                  icon={Zap} 
                  title={t("help.features.title")} 
                  badge={t("help.features.badge")}
                />
                
                <div className="grid gap-6 mt-6">
                  <HelpCard
                    title={t("help.features.language.title")}
                    icon={Globe}
                  >
                    <p className="text-muted-foreground mb-4">{t("help.features.language.intro")}</p>
                    <div className="flex flex-wrap gap-2">
                      {["English", "Español", "Português", "Türkçe", "Français"].map((lang) => (
                        <Badge key={lang} variant="outline">{lang}</Badge>
                      ))}
                    </div>
                  </HelpCard>

                  <HelpCard
                    title={t("help.features.notifications.title")}
                    icon={Bell}
                  >
                    <p className="text-muted-foreground">{t("help.features.notifications.intro")}</p>
                  </HelpCard>

                  <HelpCard
                    title={t("help.features.progress.title")}
                    icon={Zap}
                  >
                    <p className="text-muted-foreground">{t("help.features.progress.intro")}</p>
                  </HelpCard>

                  <HelpCard
                    title={t("help.features.comparison.title")}
                    icon={Users}
                  >
                    <p className="text-muted-foreground">{t("help.features.comparison.intro")}</p>
                  </HelpCard>
                </div>
              </section>
            )}

            {/* FAQ */}
            {filteredSectionIds.has("faq") && (
              <section id="faq" className="scroll-mt-24">
                <SectionHeader 
                  icon={HelpCircle} 
                  title={t("help.faq.title")} 
                  badge={t("help.faq.badge")}
                />
                
                <div className="mt-6">
                  <Accordion type="single" collapsible className="space-y-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <AccordionItem 
                        key={num} 
                        value={`faq-${num}`}
                        className="bg-card/50 border border-border/50 rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          {t(`help.faq.q${num}`)}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {t(`help.faq.a${num}`)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </section>
            )}

            {/* Back to Top */}
            <div className="flex justify-center pt-8">
              <Button
                variant="outline"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4 rotate-90" />
                {t("help.backToTop")}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Section Header Component
const SectionHeader = ({ 
  icon: Icon, 
  title, 
  badge 
}: { 
  icon: React.ElementType; 
  title: string; 
  badge: string;
}) => (
  <div className="flex items-center gap-4">
    <div className="p-3 bg-primary/10 rounded-lg">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <div>
      <Badge variant="outline" className="mb-1 text-xs">{badge}</Badge>
      <h2 className="text-2xl font-rajdhani font-bold text-foreground">{title}</h2>
    </div>
  </div>
);

// Help Card Component
const HelpCard = ({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) => (
  <Card className="bg-card/50 border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export default Help;
