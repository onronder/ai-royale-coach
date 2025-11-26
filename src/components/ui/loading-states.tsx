import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="w-12 h-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchCardSkeleton() {
  return (
    <Card className="p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </Card>
  );
}

export function DeckGridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="w-20 h-28 rounded-lg animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
      <Skeleton className="h-10 w-48 mx-auto" />
    </div>
  );
}

export function PlayerHeaderSkeleton() {
  return (
    <div className="border-b border-border bg-card p-4 animate-pulse">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-6 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}

export function PageTransition({ 
  children, 
  delay = 0 
}: { 
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div 
      className="animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function StaggeredList({ 
  children,
  staggerDelay = 50 
}: { 
  children: React.ReactNode[];
  staggerDelay?: number;
}) {
  return (
    <>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-slide-up"
          style={{ animationDelay: `${index * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </>
  );
}

export function LoadingSpinner({ size = "default" }: { size?: "sm" | "default" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-8 w-8",
    lg: "h-12 w-12"
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div className={cn(
        "rounded-full border-4 border-primary/20 border-t-primary animate-spin",
        sizeClasses[size]
      )} />
    </div>
  );
}

export function ContentLoader({ 
  lines = 3,
  className 
}: { 
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4 w-full animate-pulse"
          style={{ 
            animationDelay: `${i * 100}ms`,
            width: i === lines - 1 ? '75%' : '100%'
          }}
        />
      ))}
    </div>
  );
}
