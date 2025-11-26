import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ElixirTradeScenario {
  yourCard: string;
  yourCost: number;
  enemyCard: string;
  enemyCost: number;
  tradeValue: number;
  description: string;
}

interface ElixirAnalysisData {
  avgElixir: number;
  cycleSpeed: 'fast' | 'medium' | 'slow';
  defensiveCost: number;
  offensiveCost: number;
  elixirDistribution: { cost: number; count: number }[];
  tradeScenarios: ElixirTradeScenario[];
}

interface ElixirAnalysisCardProps {
  analysis: ElixirAnalysisData;
}

export function ElixirAnalysisCard({ analysis }: ElixirAnalysisCardProps) {
  const cycleSpeedColors = {
    fast: 'hsl(var(--success))',
    medium: 'hsl(var(--warning))',
    slow: 'hsl(var(--destructive))'
  };

  const splitData = [
    { name: 'Defensive', value: analysis.defensiveCost, color: 'hsl(var(--chart-4))' },
    { name: 'Offensive', value: analysis.offensiveCost, color: 'hsl(var(--accent))' }
  ];

  const getTradeIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-success" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTradeColor = (value: number) => {
    if (value > 0) return 'text-success';
    if (value < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-card to-card-elevated border-primary/20">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-3xl font-bold text-primary">{analysis.avgElixir.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Avg Elixir</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-card-elevated border-accent/20">
          <CardContent className="p-4 text-center">
            <div className="w-6 h-6 mx-auto mb-2 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                 style={{ backgroundColor: cycleSpeedColors[analysis.cycleSpeed], color: 'hsl(var(--background))' }}>
              {analysis.cycleSpeed[0]}
            </div>
            <p className="text-xl font-bold capitalize">{analysis.cycleSpeed}</p>
            <p className="text-xs text-muted-foreground">Cycle Speed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card-elevated border-chart-4/20">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Def/Off Split</div>
            <p className="text-xl font-bold">
              {analysis.defensiveCost} / {analysis.offensiveCost}
            </p>
            <p className="text-xs text-muted-foreground">Elixir</p>
          </CardContent>
        </Card>
      </div>

      {/* Elixir Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Elixir Distribution Curve</CardTitle>
          <CardDescription>Card cost distribution across your deck</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analysis.elixirDistribution}>
              <defs>
                <linearGradient id="elixirGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="cost" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
                label={{ value: 'Elixir Cost', position: 'insideBottom', offset: -5, style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
                label={{ value: 'Cards', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelFormatter={(value) => `${value} elixir`}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#elixirGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Def/Off Split Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Defensive vs Offensive Balance</CardTitle>
          <CardDescription>Total elixir allocation by role</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={splitData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {splitData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value) => `${value} elixir`}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trade Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Common Elixir Trade Scenarios</CardTitle>
          <CardDescription>Predicted exchanges against popular enemy cards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analysis.tradeScenarios.map((trade, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {trade.yourCard} ({trade.yourCost})
                    </span>
                    <span className="text-muted-foreground text-xs">→</span>
                    <span className="font-medium text-sm">
                      {trade.enemyCard} ({trade.enemyCost})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{trade.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  {getTradeIcon(trade.tradeValue)}
                  <Badge 
                    variant={trade.tradeValue > 0 ? 'default' : trade.tradeValue < 0 ? 'destructive' : 'outline'}
                    className={getTradeColor(trade.tradeValue)}
                  >
                    {trade.tradeValue > 0 ? '+' : ''}{trade.tradeValue}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
