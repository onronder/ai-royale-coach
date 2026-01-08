import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

// Sample preview content for deck analysis
export function DeckAnalysisPreview() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      <Card className="bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('aiPreview.deckArchetype')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary">
              <span className="font-semibold">{t('aiPreview.cycleControl')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('aiPreview.cycleDescription')}
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-chart-1">✓ {t('aiPreview.strengths')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              <li>• {t('aiPreview.strengthsList.fastCycle')}</li>
              <li>• {t('aiPreview.strengthsList.strongDefense')}</li>
              <li>• {t('aiPreview.strengthsList.consistentChip')}</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-chart-3">✗ {t('aiPreview.weaknesses')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              <li>• {t('aiPreview.weaknessesList.heavyBeatdown')}</li>
              <li>• {t('aiPreview.weaknessesList.spellBait')}</li>
              <li>• {t('aiPreview.weaknessesList.lowTowerDamage')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Sample preview content for meta analysis
export function MetaAnalysisPreview() {
  const { t } = useTranslation();
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
                {item.trend === "hot" ? `🔥 ${t('aiPreview.hot')}` : `→ ${t('aiPreview.stable')}`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('aiPreview.winRate')}</span>
                <p className="font-semibold text-chart-1">{item.winRate}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('aiPreview.usage')}</span>
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
  const { t } = useTranslation();
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
                <span className="text-chart-1">{t('aiPreview.synergy')}: {suggestion.synergyImpact}</span>
                <span className="text-chart-2">{t('aiPreview.meta')}: {suggestion.metaImpact}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {t('aiPreview.betterDefensiveValue')}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Sample preview content for win rate predictions
export function WinRatePredictionPreview() {
  const { t } = useTranslation();
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
                {pred.confidence} {t('aiPreview.confidence')}
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
