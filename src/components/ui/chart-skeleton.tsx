import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartSkeletonProps {
  variant?: "bar" | "line" | "pie" | "area";
  height?: number;
  className?: string;
}

export function ChartSkeleton({ 
  variant = "bar", 
  height = 300,
  className 
}: ChartSkeletonProps) {
  return (
    <div 
      className={cn("w-full flex flex-col gap-3 p-4", className)}
      style={{ minHeight: height }}
    >
      {/* Y-axis labels */}
      <div className="flex gap-4 h-full">
        <div className="flex flex-col justify-between py-4">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-8" />
        </div>
        
        {/* Chart area */}
        <div className="flex-1 flex items-end gap-2 pb-8">
          {variant === "bar" && (
            <>
              <Skeleton className="flex-1 h-[60%] rounded-t-md" />
              <Skeleton className="flex-1 h-[80%] rounded-t-md" />
              <Skeleton className="flex-1 h-[45%] rounded-t-md" />
              <Skeleton className="flex-1 h-[70%] rounded-t-md" />
              <Skeleton className="flex-1 h-[55%] rounded-t-md" />
              <Skeleton className="flex-1 h-[90%] rounded-t-md" />
              <Skeleton className="flex-1 h-[65%] rounded-t-md" />
            </>
          )}
          
          {(variant === "line" || variant === "area") && (
            <div className="flex-1 relative h-full">
              <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                <path
                  d="M 0 40 Q 15 30, 25 35 T 50 25 T 75 30 T 100 20"
                  fill="none"
                  className="stroke-muted"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
                {variant === "area" && (
                  <path
                    d="M 0 40 Q 15 30, 25 35 T 50 25 T 75 30 T 100 20 L 100 50 L 0 50 Z"
                    className="fill-muted/30"
                  />
                )}
              </svg>
              {/* Dots */}
              <div className="absolute inset-0 flex items-center justify-around">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="w-2 h-2 rounded-full" />
              </div>
            </div>
          )}
          
          {variant === "pie" && (
            <div className="flex-1 flex items-center justify-center">
              <div className="relative">
                <Skeleton className="w-32 h-32 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-background" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* X-axis labels */}
      {variant !== "pie" && (
        <div className="flex gap-4 pl-12">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      )}
    </div>
  );
}
