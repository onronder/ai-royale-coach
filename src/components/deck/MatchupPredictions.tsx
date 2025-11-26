import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Sword } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MatchupPrediction {
  archetype: string;
  prediction: 'favorable' | 'even' | 'unfavorable';
  confidence: number;
  keyCards: string[];
  strategy: string;
}

interface MatchupPredictionsProps {
  predictions: MatchupPrediction[];
}

export function MatchupPredictions({ predictions }: MatchupPredictionsProps) {
  const [expandedMatchups, setExpandedMatchups] = useState<Set<string>>(new Set());

  const toggleMatchup = (archetype: string) => {
    setExpandedMatchups(prev => {
      const next = new Set(prev);
      if (next.has(archetype)) {
        next.delete(archetype);
      } else {
        next.add(archetype);
      }
      return next;
    });
  };

  const getPredictionIcon = (prediction: string) => {
    switch (prediction) {
      case 'favorable':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'unfavorable':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-warning" />;
    }
  };

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'favorable':
        return 'bg-success/10 border-success/30 text-success';
      case 'unfavorable':
        return 'bg-destructive/10 border-destructive/30 text-destructive';
      default:
        return 'bg-warning/10 border-warning/30 text-warning';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-success';
    if (confidence >= 60) return 'bg-warning';
    return 'bg-chart-4';
  };

  const favorableCount = predictions.filter(p => p.prediction === 'favorable').length;
  const evenCount = predictions.filter(p => p.prediction === 'even').length;
  const unfavorableCount = predictions.filter(p => p.prediction === 'unfavorable').length;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-success/20 to-success/5 border-success/30">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-success" />
            <p className="text-3xl font-bold text-success">{favorableCount}</p>
            <p className="text-xs text-muted-foreground">Favorable</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-warning/20 to-warning/5 border-warning/30">
          <CardContent className="p-4 text-center">
            <Minus className="w-6 h-6 mx-auto mb-2 text-warning" />
            <p className="text-3xl font-bold text-warning">{evenCount}</p>
            <p className="text-xs text-muted-foreground">Even</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/30">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 mx-auto mb-2 text-destructive" />
            <p className="text-3xl font-bold text-destructive">{unfavorableCount}</p>
            <p className="text-xs text-muted-foreground">Unfavorable</p>
          </CardContent>
        </Card>
      </div>

      {/* Matchup List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sword className="w-4 h-4 text-primary" />
            Meta Archetype Matchups
          </CardTitle>
          <CardDescription>
            AI-powered predictions with confidence scores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {predictions.map((matchup, idx) => {
            const isExpanded = expandedMatchups.has(matchup.archetype);
            
            return (
              <Collapsible key={idx} open={isExpanded} onOpenChange={() => toggleMatchup(matchup.archetype)}>
                <Card className={`border ${getPredictionColor(matchup.prediction)} transition-all hover:shadow-md`}>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getPredictionIcon(matchup.prediction)}
                          <div className="text-left">
                            <h4 className="font-semibold text-sm">{matchup.archetype}</h4>
                            <p className="text-xs text-muted-foreground capitalize">
                              {matchup.prediction} matchup
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Confidence</p>
                            <p className="text-sm font-bold">{matchup.confidence}%</p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Progress 
                          value={matchup.confidence} 
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-3 border-t border-border/50">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 mt-3">Key Cards:</p>
                        <div className="flex flex-wrap gap-2">
                          {matchup.keyCards.map((card, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {card}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Strategy:</p>
                        <p className="text-sm text-foreground/90 leading-relaxed">
                          {matchup.strategy}
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50 border-muted">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground text-center">
            💡 Matchup predictions are based on typical card interactions and meta trends. 
            Actual results depend on skill, timing, and adaptation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
