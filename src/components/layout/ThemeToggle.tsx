import { Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="w-10 h-10 rounded-lg bg-card/50 border border-border/50 flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        "relative w-10 h-10 rounded-lg border flex items-center justify-center",
        "transition-all duration-300 overflow-hidden group",
        isDark 
          ? "bg-card/50 border-border/50 hover:border-gold/50 hover:bg-card" 
          : "bg-primary/10 border-primary/30 hover:border-primary/50 hover:bg-primary/20"
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Background glow effect */}
      <div className={cn(
        "absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        isDark 
          ? "bg-gradient-to-br from-gold/10 to-transparent" 
          : "bg-gradient-to-br from-primary/20 to-transparent"
      )} />
      
      {/* Sun icon */}
      <Sun className={cn(
        "h-5 w-5 absolute transition-all duration-500",
        isDark 
          ? "opacity-0 rotate-90 scale-50 text-gold" 
          : "opacity-100 rotate-0 scale-100 text-primary"
      )} />
      
      {/* Moon icon */}
      <Moon className={cn(
        "h-5 w-5 absolute transition-all duration-500",
        isDark 
          ? "opacity-100 rotate-0 scale-100 text-gold" 
          : "opacity-0 -rotate-90 scale-50 text-primary"
      )} />

      {/* Sparkle particles on hover */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <span
            key={i}
            className={cn(
              "absolute w-1 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
              isDark ? "bg-gold/60" : "bg-primary/60"
            )}
            style={{
              left: `${20 + i * 25}%`,
              top: `${30 + (i % 2) * 40}%`,
              animation: `sparkle 1.5s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </button>
  );
}
