import { useState } from "react";
import { 
  Search, Swords, BarChart3, Bot, 
  ChevronDown, Zap, Target, TrendingUp, 
  MessageSquare, Shield, Users, Trophy,
  Sparkles, Crown, Star, Layers,
  Activity, GitCompare, Network, GraduationCap,
  Medal, Clock, Crosshair, Brain
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeatureCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  glowColor: string;
  features: Feature[];
}

const featureCategories: FeatureCategory[] = [
  {
    id: "analysis",
    title: "Smart Analysis",
    subtitle: "Deep AI insights from every battle",
    icon: <Search className="h-7 w-7" />,
    gradient: "from-primary via-primary-glow to-primary",
    borderColor: "border-primary/30 hover:border-primary/60",
    glowColor: "shadow-[0_0_30px_hsl(190,100%,50%,0.3)]",
    features: [
      { icon: <Activity className="h-5 w-5" />, title: "Battle History Analysis", description: "Deep dive into your recent matches with AI-powered insights" },
      { icon: <Crosshair className="h-5 w-5" />, title: "Match Replay Insights", description: "AI identifies key moments and turning points" },
      { icon: <Shield className="h-5 w-5" />, title: "Counter-Deck Analysis", description: "Know exactly what beats your opponent's deck" },
      { icon: <Target className="h-5 w-5" />, title: "Matchup Predictions", description: "Win probability against common archetypes" },
      { icon: <GitCompare className="h-5 w-5" />, title: "Deck Comparison Tool", description: "Side-by-side analysis of any two decks" },
      { icon: <Users className="h-5 w-5" />, title: "Clan & Tournament Stats", description: "Track performance in clan wars and tournaments" },
    ]
  },
  {
    id: "deck",
    title: "Deck Optimisation",
    subtitle: "Build the perfect deck for your playstyle",
    icon: <Swords className="h-7 w-7" />,
    gradient: "from-gold via-warning to-gold",
    borderColor: "border-gold/30 hover:border-gold/60",
    glowColor: "shadow-[0_0_30px_hsl(45,100%,50%,0.3)]",
    features: [
      { icon: <Layers className="h-5 w-5" />, title: "Visual Deck Builder", description: "Drag-and-drop deck creation interface" },
      { icon: <Zap className="h-5 w-5" />, title: "Card Replacement Suggester", description: "Find optimal card swaps to improve your deck" },
      { icon: <Crown className="h-5 w-5" />, title: "Pre-built Meta Templates", description: "Top ladder decks ready to use instantly" },
      { icon: <Network className="h-5 w-5" />, title: "Synergy Matrix", description: "Discover powerful card combinations" },
      { icon: <Star className="h-5 w-5" />, title: "Elixir Trade Analysis", description: "Master elixir efficiency and value" },
      { icon: <TrendingUp className="h-5 w-5" />, title: "Meta Trend Analysis", description: "Stay ahead of meta shifts and balance changes" },
    ]
  },
  {
    id: "tracking",
    title: "Performance Tracking",
    subtitle: "Monitor your progress over time",
    icon: <BarChart3 className="h-7 w-7" />,
    gradient: "from-emerald via-success to-emerald",
    borderColor: "border-emerald/30 hover:border-emerald/60",
    glowColor: "shadow-[0_0_30px_hsl(155,100%,40%,0.3)]",
    features: [
      { icon: <Trophy className="h-5 w-5" />, title: "Trophy Progress Charts", description: "Visualize your climb through the arenas" },
      { icon: <BarChart3 className="h-5 w-5" />, title: "Win Rate Analytics", description: "Track performance trends over days and weeks" },
      { icon: <Activity className="h-5 w-5" />, title: "Deck Usage Statistics", description: "See which decks work best for you" },
      { icon: <Layers className="h-5 w-5" />, title: "Card Collection Tracker", description: "Manage your inventory and upgrades" },
      { icon: <Star className="h-5 w-5" />, title: "Card Mastery System", description: "Track individual card performance and mastery" },
      { icon: <Medal className="h-5 w-5" />, title: "Achievement Badges", description: "Unlock skill milestones and show off progress" },
    ]
  },
  {
    id: "ai",
    title: "AI Powered",
    subtitle: "Your personal Clash Royale coach",
    icon: <Bot className="h-7 w-7" />,
    gradient: "from-royal via-legendary to-royal",
    borderColor: "border-royal/30 hover:border-royal/60",
    glowColor: "shadow-[0_0_30px_hsl(270,100%,60%,0.3)]",
    features: [
      { icon: <MessageSquare className="h-5 w-5" />, title: "AI Coach Chat", description: "Ask anything about strategy and get expert advice" },
      { icon: <Brain className="h-5 w-5" />, title: "Personalized Analysis", description: "Insights tailored to your specific playstyle" },
      { icon: <GraduationCap className="h-5 w-5" />, title: "Match-by-Match Coaching", description: "Learn from every game with detailed breakdowns" },
      { icon: <Target className="h-5 w-5" />, title: "Strategic Recommendations", description: "AI suggests improvements based on your data" },
      { icon: <Shield className="h-5 w-5" />, title: "Counter-Strategy Generation", description: "Build decks designed to beat specific opponents" },
      { icon: <Clock className="h-5 w-5" />, title: "Real-time Tips", description: "Context-aware suggestions during gameplay" },
    ]
  }
];

export function FeatureShowcase() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-card/30 via-background to-card/20 border-t border-border/50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-royal/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/20 border border-gold/30 mb-6">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="text-sm font-rajdhani font-semibold text-gold uppercase tracking-wider">Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold font-rajdhani mb-4 text-embossed">
            EVERYTHING YOU NEED
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Click on any category to explore our powerful features
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {featureCategories.map((category, categoryIndex) => (
            <div
              key={category.id}
              className={cn(
                "group relative rounded-2xl border-2 bg-card/50 backdrop-blur-sm transition-all duration-500 cursor-pointer overflow-hidden",
                category.borderColor,
                expandedId === category.id && category.glowColor,
                expandedId === category.id ? "md:col-span-2" : ""
              )}
              onClick={() => toggleExpand(category.id)}
              style={{ 
                animationDelay: `${categoryIndex * 100}ms`,
              }}
            >
              {/* Gradient overlay on hover */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                `bg-gradient-to-br ${category.gradient}`
              )} style={{ opacity: expandedId === category.id ? 0.05 : undefined }} />
              
              {/* Card Header */}
              <div className="p-6 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
                    `bg-gradient-to-br ${category.gradient}`,
                    expandedId === category.id && "scale-110"
                  )}>
                    <div className="text-background">
                      {category.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-rajdhani font-bold text-foreground group-hover:text-foreground/90 transition-colors">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronDown className={cn(
                  "h-6 w-6 text-muted-foreground transition-transform duration-300",
                  expandedId === category.id && "rotate-180"
                )} />
              </div>

              {/* Expanded Content */}
              <div className={cn(
                "grid transition-all duration-500 ease-out",
                expandedId === category.id 
                  ? "grid-rows-[1fr] opacity-100" 
                  : "grid-rows-[0fr] opacity-0"
              )}>
                <div className="overflow-hidden">
                  <div className="px-6 pb-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.features.map((feature, featureIndex) => (
                        <div
                          key={feature.title}
                          className={cn(
                            "p-4 rounded-xl bg-background/50 border border-border/50 hover:border-border transition-all duration-300 hover:-translate-y-1",
                            expandedId === category.id && "animate-fade-in"
                          )}
                          style={{ 
                            animationDelay: `${featureIndex * 50}ms`,
                            animationFillMode: 'backwards'
                          }}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                            `bg-gradient-to-br ${category.gradient}`
                          )}>
                            <div className="text-background">
                              {feature.icon}
                            </div>
                          </div>
                          <h4 className="font-rajdhani font-bold text-foreground mb-1">
                            {feature.title}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
