import { LucideIcon, BarChart3, LineChart, PieChart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ChartEmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  variant?: "bar" | "line" | "pie" | "trend";
  height?: number;
  className?: string;
}

const variantIcons = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  trend: TrendingUp,
};

export function ChartEmptyState({ 
  icon,
  title,
  description,
  variant = "bar",
  height = 200,
  className 
}: ChartEmptyStateProps) {
  const { t } = useTranslation();
  
  const Icon = icon || variantIcons[variant];
  const displayTitle = title || t('charts.noData', 'No data available');
  const displayDescription = description || t('charts.noDataDescription', 'Start playing to see your statistics here');

  return (
    <div 
      className={cn(
        "w-full flex flex-col items-center justify-center text-center gap-4 py-8",
        className
      )}
      style={{ minHeight: height }}
    >
      {/* Decorative background */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 blur-2xl rounded-full scale-150" />
        <div className="relative rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 border border-border/50">
          <Icon className="w-10 h-10 text-muted-foreground/60" />
        </div>
      </div>
      
      <div className="space-y-1.5 max-w-[250px]">
        <p className="font-medium text-foreground/80 text-sm">
          {displayTitle}
        </p>
        <p className="text-xs text-muted-foreground">
          {displayDescription}
        </p>
      </div>
      
      {/* Decorative mini chart illustration */}
      <div className="flex items-end gap-1 opacity-30 mt-2">
        <div className="w-2 h-4 bg-muted-foreground/40 rounded-sm" />
        <div className="w-2 h-6 bg-muted-foreground/40 rounded-sm" />
        <div className="w-2 h-3 bg-muted-foreground/40 rounded-sm" />
        <div className="w-2 h-8 bg-muted-foreground/40 rounded-sm" />
        <div className="w-2 h-5 bg-muted-foreground/40 rounded-sm" />
      </div>
    </div>
  );
}
