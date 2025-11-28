import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  progress: number;
  total: number;
  currentStep?: string;
  status: "running" | "completed" | "failed";
  startedAt?: string;
  className?: string;
  variant?: "default" | "compact" | "detailed";
}

export function ProgressIndicator({
  progress,
  total,
  currentStep,
  status,
  startedAt,
  className,
  variant = "default",
}: ProgressIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  const percentage = Math.round((progress / total) * 100);

  useEffect(() => {
    if (!startedAt || status !== "running") return;

    const startTime = new Date(startedAt).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000); // seconds
      setElapsedTime(elapsed);

      // Estimate time remaining based on current progress
      if (progress > 0) {
        const timePerUnit = elapsed / progress;
        const remaining = Math.ceil((total - progress) * timePerUnit);
        setEstimatedTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, progress, total, status]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {status === "running" && (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        )}
        {status === "completed" && (
          <Check className="h-4 w-4 text-success" />
        )}
        {status === "failed" && (
          <AlertCircle className="h-4 w-4 text-destructive" />
        )}
        <div className="flex-1">
          <Progress value={percentage} className="h-2" />
        </div>
        <span className="text-sm font-rajdhani font-semibold text-foreground min-w-[3rem] text-right">
          {percentage}%
        </span>
      </div>
    );
  }

  return (
    <Card className={cn("bg-card/50 border-primary/20 backdrop-blur-sm", className)}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status === "running" && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              {status === "completed" && (
                <Check className="h-5 w-5 text-success" />
              )}
              {status === "failed" && (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-rajdhani font-semibold text-foreground">
                {status === "running" && "Processing..."}
                {status === "completed" && "Completed"}
                {status === "failed" && "Failed"}
              </span>
            </div>
            <span className="text-2xl font-rajdhani font-bold text-primary">
              {percentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <Progress value={percentage} className="h-3" />

          {/* Progress Details */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {progress} / {total}
              {currentStep && ` - ${currentStep}`}
            </span>
            {status === "running" && estimatedTimeRemaining !== null && (
              <span className="font-medium">
                ~{formatTime(estimatedTimeRemaining)} remaining
              </span>
            )}
          </div>

          {/* Elapsed Time (Detailed variant only) */}
          {variant === "detailed" && status === "running" && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Elapsed Time</span>
                <span className="font-mono">{formatTime(elapsedTime)}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
