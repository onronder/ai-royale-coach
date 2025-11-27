import { Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({ message = "Loading...", className }: PageLoaderProps) {
  return (
    <div className={cn("min-h-screen flex items-center justify-center arena-bg", className)}>
      <div className="flex flex-col items-center gap-4">
        {/* Animated Logo */}
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gold/30 border-t-gold"></div>
          <Crown className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 text-gold animate-pulse" />
        </div>
        
        {/* Loading Text */}
        <div className="text-center">
          <p className="text-foreground font-rajdhani font-semibold text-lg">{message}</p>
          <p className="text-muted-foreground text-sm mt-1">Please wait a moment...</p>
        </div>

        {/* Loading Dots Animation */}
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

export function DashboardLoader() {
  return <PageLoader message="Loading your dashboard" />;
}

export function AuthLoader() {
  return <PageLoader message="Verifying authentication" />;
}
