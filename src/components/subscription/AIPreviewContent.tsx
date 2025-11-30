import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

// Sample preview content for deck analysis
export function DeckAnalysisPreview() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('deckAnalysis.deckArchetype', 'Deck Archetype')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary">
              <span className="font-semibold">Cycle Control</span>
            </div>
            <p className="text-sm text-muted-foreground">
              This deck excels at maintaining pressure through fast cycling and efficient elixir trades...
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-chart-1">✓ {t('deckAnalysis.strengths', 'Strengths')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              <li>• Fast cycle capability</li>
              <li>• Strong defensive options</li>
              <li>• Consistent chip damage</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-chart-3">✗ {t('deckAnalysis.weaknesses', 'Weaknesses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              <li>• Vulnerable to heavy beatdown</li>
              <li>• Struggles against spell bait</li>
              <li>• Low tower damage per hit</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Sample preview content for meta analysis
export function MetaAnalysisPreview() {
  const mockData = [
    { archetype: "Hog Cycle", winRate: 54.2, usage: 8.5, trend: "hot" },
    { archetype: "Golem Beatdown", winRate: 51.8, usage: 6.2, trend: "stable" },
    { archetype: "Log Bait", winRate: 52.4, usage: 7.1, trend: "hot" },
  ];
  
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {mockData.map((item, idx) => (
        <Card key={idx} className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{item.archetype}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-chart-1/20 text-chart-1">
                {item.trend === "hot" ? "🔥 Hot" : "→ Stable"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Win Rate</span>
                <p className="font-semibold text-chart-1">{item.winRate}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Usage</span>
                <p className="font-semibold">{item.usage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Sample preview content for card replacements
export function CardReplacementPreview() {
  const mockSuggestions = [
    { card: "Musketeer", synergyImpact: "+15%", metaImpact: "+8%" },
    { card: "Electro Wizard", synergyImpact: "+12%", metaImpact: "+10%" },
  ];
  
  return (
    <div className="space-y-3">
      {mockSuggestions.map((suggestion, idx) => (
        <Card key={idx} className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{suggestion.card}</span>
              <div className="flex gap-3 text-sm">
                <span className="text-chart-1">Synergy: {suggestion.synergyImpact}</span>
                <span className="text-chart-2">Meta: {suggestion.metaImpact}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              This card provides better defensive value and synergizes well with your cycle cards...
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Sample preview content for win rate predictions
export function WinRatePredictionPreview() {
  const mockPredictions = [
    { range: "5000-5500", winRate: 58, confidence: "High" },
    { range: "5500-6000", winRate: 52, confidence: "Medium" },
    { range: "6000-6500", winRate: 45, confidence: "Medium" },
  ];
  
  return (
    <div className="space-y-3">
      {mockPredictions.map((pred, idx) => (
        <Card key={idx} className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{pred.range} 🏆</span>
              <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">
                {pred.confidence} Confidence
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-chart-1 to-chart-2 rounded-full"
                  style={{ width: `${pred.winRate}%` }}
                />
              </div>
              <span className="font-bold text-chart-1">{pred.winRate}%</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
