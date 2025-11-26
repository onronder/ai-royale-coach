import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, AlertTriangle, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CardSynergyPair {
  card1: string;
  card2: string;
  rating: number;
  explanation: string;
}

interface SynergyMatrixData {
  pairs: CardSynergyPair[];
  overallScore: number;
  topSynergies: string[];
  antiSynergies: string[];
}

interface SynergyMatrixProps {
  analysis: SynergyMatrixData;
  cardNames: string[];
}

export function SynergyMatrix({ analysis, cardNames }: SynergyMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<CardSynergyPair | null>(null);

  const getSynergyPair = (card1: string, card2: string): CardSynergyPair | undefined => {
    return analysis.pairs.find(
      p => (p.card1 === card1 && p.card2 === card2) || (p.card1 === card2 && p.card2 === card1)
    );
  };

  const getSynergyColor = (rating: number): string => {
    if (rating >= 4.5) return 'bg-gradient-to-br from-success/80 to-success hover:from-success hover:to-success/80';
    if (rating >= 3.5) return 'bg-gradient-to-br from-chart-2/60 to-chart-2/40 hover:from-chart-2/80 hover:to-chart-2/60';
    if (rating >= 2.5) return 'bg-gradient-to-br from-muted to-muted/60 hover:from-muted/80 hover:to-muted';
    return 'bg-gradient-to-br from-destructive/60 to-destructive/40 hover:from-destructive/80 hover:to-destructive/60';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < rating ? 'fill-gold text-gold' : 'text-muted-foreground/40'}`}
      />
    ));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <Card className="bg-gradient-to-br from-card via-card-elevated to-card border-primary/20">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
          <p className={`text-5xl font-bold mb-2 ${getScoreColor(analysis.overallScore)}`}>
            {analysis.overallScore}
          </p>
          <p className="text-sm text-muted-foreground">Overall Synergy Score</p>
          <div className="mt-4 flex justify-center gap-1">
            {renderStars(Math.round(analysis.overallScore / 20))}
          </div>
        </CardContent>
      </Card>

      {/* Top & Anti Synergies */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-success" />
              Top Synergies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.topSynergies.map((syn, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-success/10 rounded-lg border border-success/20">
                <Badge variant="outline" className="text-success border-success/50">#{idx + 1}</Badge>
                <span className="text-sm font-medium">{syn}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Anti-Synergies
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.antiSynergies.length > 0 ? (
              analysis.antiSynergies.map((anti, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg border border-warning/20">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm">{anti}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No significant anti-synergies detected! 🎉
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Synergy Matrix Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Card Synergy Matrix</CardTitle>
          <CardDescription>
            Interactive heatmap showing synergy ratings between all card pairs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-xs font-medium text-muted-foreground"></th>
                      {cardNames.map((card, idx) => (
                        <th key={idx} className="p-2 text-xs font-medium text-muted-foreground max-w-[60px] truncate" title={card}>
                          {card.split(' ').map(w => w[0]).join('')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cardNames.map((card1, i) => (
                      <tr key={i}>
                        <td className="p-2 text-xs font-medium text-muted-foreground max-w-[60px] truncate" title={card1}>
                          {card1.split(' ').map(w => w[0]).join('')}
                        </td>
                        {cardNames.map((card2, j) => {
                          if (i === j) {
                            return (
                              <td key={j} className="p-1">
                                <div className="w-10 h-10 bg-muted/20 rounded flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">-</span>
                                </div>
                              </td>
                            );
                          }

                          const pair = getSynergyPair(card1, card2);
                          if (!pair) return <td key={j} className="p-1"><div className="w-10 h-10"></div></td>;

                          return (
                            <td key={j} className="p-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`w-10 h-10 rounded cursor-pointer flex items-center justify-center transition-all ${getSynergyColor(pair.rating)}`}
                                    onMouseEnter={() => setHoveredCell(pair)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                  >
                                    <span className="text-xs font-bold text-background">
                                      {pair.rating.toFixed(1)}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-2">
                                    <div className="font-semibold text-sm">
                                      {pair.card1} × {pair.card2}
                                    </div>
                                    <div className="flex gap-1">
                                      {renderStars(pair.rating)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {pair.explanation}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-success"></div>
                <span>Strong (4.5-5)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-chart-2/60"></div>
                <span>Good (3.5-4.4)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted"></div>
                <span>Neutral (2.5-3.4)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-destructive/60"></div>
                <span>Weak (1-2.4)</span>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Hovered Cell Details */}
      {hoveredCell && (
        <Card className="border-primary/40 shadow-primary-glow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold">
                {hoveredCell.card1} × {hoveredCell.card2}
              </h4>
              <div className="flex gap-1">
                {renderStars(hoveredCell.rating)}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{hoveredCell.explanation}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
