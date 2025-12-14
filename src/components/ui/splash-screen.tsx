import { Crown, Sparkles, Swords } from "lucide-react";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background arena-bg overflow-hidden">
      {/* Animated Background Particles */}
      <div className="floating-particles">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Decorative Corner Elements */}
      <div className="absolute top-10 left-10 opacity-20 animate-float">
        <Sparkles className="w-12 h-12 text-gold" />
      </div>
      <div className="absolute top-10 right-10 opacity-20 animate-float" style={{ animationDelay: "0.5s" }}>
        <Swords className="w-12 h-12 text-primary" />
      </div>
      <div className="absolute bottom-10 left-10 opacity-20 animate-float" style={{ animationDelay: "1s" }}>
        <Crown className="w-12 h-12 text-gold" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-20 animate-float" style={{ animationDelay: "1.5s" }}>
        <Sparkles className="w-12 h-12 text-primary" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Animated Logo Crown */}
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-primary/30 blur-3xl animate-pulse-glow" />
          <div className="relative p-8 rounded-full bg-gradient-to-br from-primary/20 to-gold/20 border-2 border-primary/40 shadow-glow animate-scale-in">
            <Crown className="w-20 h-20 md:w-24 md:h-24 text-gold animate-trophy-shine" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl md:text-5xl font-rajdhani font-black tracking-tight mb-4 animate-fade-in">
          <span className="text-transparent bg-clip-text bg-gradient-primary">AI</span>
          <span className="text-foreground ml-2">ROYALE</span>
        </h1>

        {/* Tagline */}
        <p className="text-lg text-muted-foreground font-medium mb-8 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Your AI-Powered Battle Coach
        </p>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-4 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          {/* Animated Dots */}
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          
          {/* Loading Text */}
          <p className="text-sm text-muted-foreground">
            Preparing the arena...
          </p>
        </div>

        {/* Bottom Glow Effect */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-32 bg-primary/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
