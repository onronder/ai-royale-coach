import { useTranslation } from "react-i18next";
import { useAllOperations, operationLabels } from "@/hooks/useAllOperations";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Ban,
  Sparkles,
  RefreshCw,
  BarChart2,
  Trophy,
  X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const iconMap = {
  Sparkles,
  RefreshCw,
  BarChart2,
  Trophy,
  Activity,
};

export function GlobalProgressCenter() {
  const { t } = useTranslation();
  const { operations, activeCount, isLoading, cancelOperation, isCancelling } = useAllOperations();

  if (isLoading) return null;

  const runningOps = operations.filter((op) => op.status === "running");
  const recentOps = operations.filter((op) => op.status !== "running");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "cancelled":
        return <Ban className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getOperationIcon = (operationType: string) => {
    const config = operationLabels[operationType];
    if (!config) return Activity;
    return iconMap[config.icon as keyof typeof iconMap] || Activity;
  };

  const getOperationLabel = (operationType: string) => {
    return operationLabels[operationType]?.label || operationType.replace(/_/g, " ");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {activeCount > 0 ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Activity className="h-5 w-5" />
          )}
          {activeCount > 0 && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs shadow-glow"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b border-border">
          <h3 className="font-rajdhani font-bold text-lg">{t('progress.activeTasks')}</h3>
          <p className="text-sm text-muted-foreground">
            {activeCount === 0 ? t('progress.noActiveOperations') : t('progress.operationsRunning', { count: activeCount })}
          </p>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {/* Running Operations */}
            {runningOps.length > 0 && (
              <div className="space-y-3">
                {runningOps.map((op) => {
                  const Icon = getOperationIcon(op.operation_type);
                  const percentage = Math.round((op.progress / op.total) * 100);
                  const elapsed = formatDistanceToNow(new Date(op.started_at), { addSuffix: true });

                  return (
                    <div 
                      key={op.id} 
                      className="p-3 rounded-lg border border-border bg-card/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {getOperationLabel(op.operation_type)}
                            </p>
                          <p className="text-xs text-muted-foreground truncate">
                              {op.current_step || t('progress.processing')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => cancelOperation(op.id)}
                          disabled={isCancelling}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {op.progress}/{op.total}
                          </span>
                          <span className="font-medium">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {t('progress.started')} {elapsed}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent Operations */}
            {recentOps.length > 0 && (
              <div className="space-y-2">
                {runningOps.length > 0 && (
                  <h4 className="text-sm font-medium text-muted-foreground">{t('progress.recent')}</h4>
                )}
                {recentOps.map((op) => {
                  const Icon = getOperationIcon(op.operation_type);
                  const timeAgo = formatDistanceToNow(
                    new Date(op.completed_at || op.updated_at), 
                    { addSuffix: true }
                  );

                  return (
                    <div 
                      key={op.id} 
                      className="p-2 rounded-lg border border-border/50 bg-card/30 flex items-center gap-2"
                    >
                      {getStatusIcon(op.status)}
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {getOperationLabel(op.operation_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {op.status === "failed" && op.error ? op.error : timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {operations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t('progress.noOperationsYet')}</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
