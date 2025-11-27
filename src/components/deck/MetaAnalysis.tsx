import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataLoader } from "@/components/ui/data-loader";
import { TrendingUp, TrendingDown, Flame, Snowflake } from "lucide-react";

interface MetaTrend {
  archetype: string;
  win_rate: number;
  usage_rate: number;
  trend: "hot" | "cold" | "stable";
  change_7d: number;
  popularity: number;
}

export function MetaAnalysis() {
  const { data: metaData, isLoading } = useQuery({
    queryKey: ["meta-trends"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analyze-meta-trends");
      if (error) throw error;
      return data.trends as MetaTrend[];
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  if (isLoading) {
    return <DataLoader context="analytics" variant="card" customMessage="Analyzing tournament meta trends..." />;
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "hot": return Flame;
      case "cold": return Snowflake;
      default: return TrendingUp;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "hot": return "text-destructive";
      case "cold": return "text-info";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-heading text-foreground">Tournament Meta Analysis</h2>
        <p className="text-sm text-muted-foreground">Current archetype trends and win rates</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metaData?.map((trend) => {
          const TrendIcon = getTrendIcon(trend.trend);
          const trendColor = getTrendColor(trend.trend);

          return (
            <Card key={trend.archetype} className="hover:shadow-glow transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{trend.archetype}</CardTitle>
                  <TrendIcon className={`h-5 w-5 ${trendColor}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <Badge variant="default">{trend.win_rate.toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Usage</span>
                  <Badge variant="secondary">{trend.usage_rate.toFixed(1)}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">7-Day Change</span>
                  <div className="flex items-center gap-1">
                    {trend.change_7d > 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <span className={trend.change_7d > 0 ? "text-success" : "text-destructive"}>
                      {trend.change_7d > 0 ? "+" : ""}{trend.change_7d.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground capitalize">{trend.trend} Trend</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < Math.floor(trend.popularity / 20) ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
