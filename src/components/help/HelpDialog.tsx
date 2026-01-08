import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  BookOpen, ChevronRight, Home, User, BarChart3, Swords, 
  Wrench, TrendingUp, Wallet, Trophy, Users, Shield,
  MessageSquare, Bell, Globe, Settings, HelpCircle, Search,
  Crown, Target, Zap, Lightbulb, CheckCircle2, Eye, Gamepad2,
  Fingerprint, Medal
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSection?: string;
}

// Helper components
const SectionHeader = ({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 rounded-lg bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <div>
      <h2 className="text-xl font-rajdhani font-bold text-foreground">{title}</h2>
      {badge && <Badge variant="secondary" className="text-xs mt-1">{badge}</Badge>}
    </div>
  </div>
);

const HelpCard = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export function HelpDialog({ open, onOpenChange, initialSection }: HelpDialogProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState(initialSection || "getting-started");

  // Define sections with searchable keywords
  const sections = [
    { 
      id: "getting-started", 
      icon: Home, 
      label: t("help.sections.gettingStarted"),
      keywords: ["account", "tag", "player tag", "sign up", "register", "login"]
    },
    { 
      id: "dashboard", 
      icon: BarChart3, 
      label: t("help.sections.dashboard"),
      keywords: ["tabs", "navigation", "sync", "refresh", "data"]
    },
    { 
      id: "matches", 
      icon: Swords, 
      label: t("help.sections.matches"),
      keywords: ["battle", "history", "opponent", "crowns", "analysis"]
    },
    { 
      id: "deck", 
      icon: Wallet, 
      label: t("help.sections.deck"),
      keywords: ["cards", "elixir", "recommendations", "current deck"]
    },
    { 
      id: "builder", 
      icon: Wrench, 
      label: t("help.sections.builder"),
      keywords: ["build", "create", "templates", "compare", "save deck"]
    },
    { 
      id: "analytics", 
      icon: TrendingUp, 
      label: t("help.sections.analytics"),
      keywords: ["statistics", "mastery", "achievements", "trends", "performance"]
    },
    { 
      id: "collection", 
      icon: Wallet, 
      label: t("help.sections.collection"),
      keywords: ["cards", "rarity", "level", "upgrade"]
    },
    { 
      id: "leaderboard", 
      icon: Trophy, 
      label: t("help.sections.leaderboard"),
      keywords: ["ranking", "top players", "global", "position"]
    },
    { 
      id: "tournaments", 
      icon: Crown, 
      label: t("help.sections.tournaments"),
      keywords: ["tournament", "compete", "prize", "registration"]
    },
    { 
      id: "clans", 
      icon: Users, 
      label: t("help.sections.clans"),
      keywords: ["clan", "members", "war", "join"]
    },
    { 
      id: "oracle", 
      icon: Eye, 
      label: t("help.sections.oracle"),
      keywords: ["oracle", "opponent", "prediction", "deck prediction", "counter"]
    },
    { 
      id: "dream-arena", 
      icon: Gamepad2, 
      label: t("help.sections.dreamArena"),
      keywords: ["arena", "pro", "challenge", "simulation", "dream"]
    },
    { 
      id: "pro-dna", 
      icon: Fingerprint, 
      label: t("help.sections.proDna"),
      keywords: ["dna", "profile", "card", "share", "fingerprint"]
    },
    { 
      id: "achievements", 
      icon: Medal, 
      label: t("help.sections.achievements"),
      keywords: ["achievement", "badge", "unlock", "milestone"]
    },
    { 
      id: "coach", 
      icon: MessageSquare, 
      label: t("help.sections.coach"),
      keywords: ["AI", "coach", "chat", "advice", "tips", "strategy"]
    },
    { 
      id: "features", 
      icon: Zap, 
      label: t("help.sections.features"),
      keywords: ["language", "notifications", "progress", "comparison", "settings"]
    },
    { 
      id: "faq", 
      icon: HelpCircle, 
      label: t("help.sections.faq"),
      keywords: ["question", "answer", "problem", "issue", "help", "support"]
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
    const element = document.getElementById(`help-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    if (initialSection && open) {
      setActiveSection(initialSection);
      setTimeout(() => scrollToSection(initialSection), 100);
    }
  }, [initialSection, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            {t("help.title")}
          </SheetTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("help.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </SheetHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-48 border-r border-border/50 p-2 hidden sm:block">
            <ScrollArea className="h-full">
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
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left",
                        activeSection === section.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <section.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{section.label}</span>
                    </button>
                  ))
                )}
              </nav>
            </ScrollArea>
          </div>

          {/* Main Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-8">
              {/* Getting Started */}
              {filteredSectionIds.has("getting-started") && (
                <section id="help-getting-started" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Home} 
                    title={t("help.gettingStarted.title")} 
                    badge={t("help.gettingStarted.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.gettingStarted.findTag.title")} icon={Target}>
                      <p className="text-muted-foreground text-sm mb-3">{t("help.gettingStarted.findTag.intro")}</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                        <li>{t("help.gettingStarted.findTag.step1")}</li>
                        <li>{t("help.gettingStarted.findTag.step2")}</li>
                        <li>{t("help.gettingStarted.findTag.step3")}</li>
                      </ol>
                    </HelpCard>
                    <HelpCard title={t("help.gettingStarted.multiAccount.title")} icon={Users}>
                      <p className="text-muted-foreground text-sm">{t("help.gettingStarted.multiAccount.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Dashboard */}
              {filteredSectionIds.has("dashboard") && (
                <section id="help-dashboard" className="scroll-mt-4">
                  <SectionHeader 
                    icon={BarChart3} 
                    title={t("help.dashboard.title")} 
                    badge={t("help.dashboard.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.dashboard.overview.title")} icon={BarChart3}>
                      <p className="text-muted-foreground text-sm mb-3">{t("help.dashboard.overview.intro")}</p>
                      <div className="flex flex-wrap gap-2">
                        {["coach", "deck", "social"].map((tab) => (
                          <Badge key={tab} variant="outline" className="text-xs">
                            {t(`help.dashboard.mainTabs.${tab}`)}
                          </Badge>
                        ))}
                      </div>
                    </HelpCard>
                    <HelpCard title={t("help.dashboard.sync.title")} icon={Zap}>
                      <p className="text-muted-foreground text-sm">{t("help.dashboard.sync.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Oracle */}
              {filteredSectionIds.has("oracle") && (
                <section id="help-oracle" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Eye} 
                    title={t("help.oracle.title")} 
                    badge={t("help.oracle.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.oracle.overview.title")} icon={Eye}>
                      <p className="text-muted-foreground text-sm mb-3">{t("help.oracle.overview.intro")}</p>
                    </HelpCard>
                    <HelpCard title={t("help.oracle.howToUse.title")} icon={Target}>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                        <li>{t("help.oracle.howToUse.step1")}</li>
                        <li>{t("help.oracle.howToUse.step2")}</li>
                        <li>{t("help.oracle.howToUse.step3")}</li>
                      </ol>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Dream Arena */}
              {filteredSectionIds.has("dream-arena") && (
                <section id="help-dream-arena" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Gamepad2} 
                    title={t("help.dreamArena.title")} 
                    badge={t("help.dreamArena.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.dreamArena.overview.title")} icon={Gamepad2}>
                      <p className="text-muted-foreground text-sm mb-3">{t("help.dreamArena.overview.intro")}</p>
                    </HelpCard>
                    <HelpCard title={t("help.dreamArena.howToUse.title")} icon={Target}>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                        <li>{t("help.dreamArena.howToUse.step1")}</li>
                        <li>{t("help.dreamArena.howToUse.step2")}</li>
                        <li>{t("help.dreamArena.howToUse.step3")}</li>
                      </ol>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Pro DNA */}
              {filteredSectionIds.has("pro-dna") && (
                <section id="help-pro-dna" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Fingerprint} 
                    title={t("help.proDna.title")} 
                    badge={t("help.proDna.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.proDna.overview.title")} icon={Fingerprint}>
                      <p className="text-muted-foreground text-sm">{t("help.proDna.overview.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Achievements */}
              {filteredSectionIds.has("achievements") && (
                <section id="help-achievements" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Medal} 
                    title={t("help.achievements.title")} 
                    badge={t("help.achievements.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.achievements.overview.title")} icon={Medal}>
                      <p className="text-muted-foreground text-sm">{t("help.achievements.overview.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Matches */}
              {filteredSectionIds.has("matches") && (
                <section id="help-matches" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Swords} 
                    title={t("help.matches.title")} 
                    badge={t("help.matches.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.matches.history.title")} icon={Swords}>
                      <p className="text-muted-foreground text-sm">{t("help.matches.history.intro")}</p>
                    </HelpCard>
                    <HelpCard title={t("help.matches.discuss.title")} icon={MessageSquare}>
                      <p className="text-muted-foreground text-sm">{t("help.matches.discuss.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Deck */}
              {filteredSectionIds.has("deck") && (
                <section id="help-deck" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Wallet} 
                    title={t("help.deck.title")} 
                    badge={t("help.deck.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.deck.current.title")} icon={Wallet}>
                      <p className="text-muted-foreground text-sm">{t("help.deck.current.intro")}</p>
                    </HelpCard>
                    <HelpCard title={t("help.deck.recommendations.title")} icon={Lightbulb}>
                      <p className="text-muted-foreground text-sm">{t("help.deck.recommendations.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Builder */}
              {filteredSectionIds.has("builder") && (
                <section id="help-builder" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Wrench} 
                    title={t("help.builder.title")} 
                    badge={t("help.builder.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.builder.create.title")} icon={Wrench}>
                      <p className="text-muted-foreground text-sm">{t("help.builder.create.intro")}</p>
                    </HelpCard>
                    <HelpCard title={t("help.builder.templates.title")} icon={Crown}>
                      <p className="text-muted-foreground text-sm">{t("help.builder.templates.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Analytics */}
              {filteredSectionIds.has("analytics") && (
                <section id="help-analytics" className="scroll-mt-4">
                  <SectionHeader 
                    icon={TrendingUp} 
                    title={t("help.analytics.title")} 
                    badge={t("help.analytics.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.analytics.deckStats.title")} icon={TrendingUp}>
                      <p className="text-muted-foreground text-sm">{t("help.analytics.deckStats.intro")}</p>
                    </HelpCard>
                    <HelpCard title={t("help.analytics.mastery.title")} icon={Medal}>
                      <p className="text-muted-foreground text-sm">{t("help.analytics.mastery.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Collection */}
              {filteredSectionIds.has("collection") && (
                <section id="help-collection" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Wallet} 
                    title={t("help.collection.title")} 
                    badge={t("help.collection.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.collection.overview.title")} icon={Wallet}>
                      <p className="text-muted-foreground text-sm">{t("help.collection.overview.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Leaderboard */}
              {filteredSectionIds.has("leaderboard") && (
                <section id="help-leaderboard" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Trophy} 
                    title={t("help.leaderboard.title")} 
                    badge={t("help.leaderboard.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.leaderboard.yourRanking.title")} icon={Trophy}>
                      <p className="text-muted-foreground text-sm">{t("help.leaderboard.yourRanking.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Tournaments */}
              {filteredSectionIds.has("tournaments") && (
                <section id="help-tournaments" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Crown} 
                    title={t("help.tournaments.title")} 
                    badge={t("help.tournaments.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.tournaments.browse.title")} icon={Crown}>
                      <p className="text-muted-foreground text-sm">{t("help.tournaments.browse.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Clans */}
              {filteredSectionIds.has("clans") && (
                <section id="help-clans" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Users} 
                    title={t("help.clans.title")} 
                    badge={t("help.clans.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.clans.search.title")} icon={Users}>
                      <p className="text-muted-foreground text-sm">{t("help.clans.search.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* AI Coach */}
              {filteredSectionIds.has("coach") && (
                <section id="help-coach" className="scroll-mt-4">
                  <SectionHeader 
                    icon={MessageSquare} 
                    title={t("help.coach.title")} 
                    badge={t("help.coach.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.coach.overview.title")} icon={MessageSquare}>
                      <p className="text-muted-foreground text-sm mb-3">{t("help.coach.overview.intro")}</p>
                      <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-sm">
                        <li>{t("help.coach.overview.step1")}</li>
                        <li>{t("help.coach.overview.step2")}</li>
                        <li>{t("help.coach.overview.step3")}</li>
                      </ol>
                    </HelpCard>
                    <HelpCard title={t("help.coach.quota.title")} icon={Zap}>
                      <p className="text-muted-foreground text-sm">{t("help.coach.quota.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* Features */}
              {filteredSectionIds.has("features") && (
                <section id="help-features" className="scroll-mt-4">
                  <SectionHeader 
                    icon={Zap} 
                    title={t("help.features.title")} 
                    badge={t("help.features.badge")}
                  />
                  <div className="grid gap-4">
                    <HelpCard title={t("help.features.language.title")} icon={Globe}>
                      <p className="text-muted-foreground text-sm">{t("help.features.language.intro")}</p>
                    </HelpCard>
                    <HelpCard title={t("help.features.notifications.title")} icon={Bell}>
                      <p className="text-muted-foreground text-sm">{t("help.features.notifications.intro")}</p>
                    </HelpCard>
                  </div>
                </section>
              )}

              {/* FAQ */}
              {filteredSectionIds.has("faq") && (
                <section id="help-faq" className="scroll-mt-4">
                  <SectionHeader 
                    icon={HelpCircle} 
                    title={t("help.faq.title")} 
                    badge={t("help.faq.badge")}
                  />
                  <Accordion type="single" collapsible className="w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <AccordionItem key={num} value={`q${num}`}>
                        <AccordionTrigger className="text-sm text-left">
                          {t(`help.faq.q${num}`)}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground text-sm">
                          {t(`help.faq.a${num}`)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
