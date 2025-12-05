import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        rajdhani: ['Rajdhani', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: {
          DEFAULT: "hsl(var(--background))",
          accent: "hsl(var(--background-accent))",
        },
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          elevated: "hsl(var(--card-elevated))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          foreground: "hsl(var(--gold-foreground))",
        },
        royal: {
          DEFAULT: "hsl(var(--royal))",
          foreground: "hsl(var(--royal-foreground))",
        },
        crimson: {
          DEFAULT: "hsl(var(--crimson))",
          foreground: "hsl(var(--crimson-foreground))",
        },
        emerald: {
          DEFAULT: "hsl(var(--emerald))",
          foreground: "hsl(var(--emerald-foreground))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-surface': 'var(--gradient-surface)',
        'gradient-legendary': 'var(--gradient-legendary)',
        'gradient-gold': 'var(--gradient-gold)',
        'gradient-arena': 'var(--gradient-arena)',
        'gradient-royal': 'var(--gradient-royal)',
        'gradient-victory': 'var(--gradient-victory)',
        'gradient-battle': 'var(--gradient-battle)',
        'gradient-card-shine': 'var(--gradient-card-shine)',
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'primary-glow': 'var(--shadow-primary-glow)',
        'accent-glow': 'var(--shadow-accent-glow)',
        'soft': 'var(--shadow-soft)',
        'md': 'var(--shadow-md)',
        'victory': 'var(--shadow-victory)',
        'defeat': 'var(--shadow-defeat)',
        'gold': 'var(--shadow-gold)',
        'royal': 'var(--shadow-royal)',
        'emboss': 'var(--shadow-emboss)',
        'inset': 'var(--shadow-inset)',
      },
      transitionProperty: {
        'smooth': 'var(--transition-smooth)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px hsl(190 100% 50% / 0.3)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 40px hsl(190 100% 50% / 0.5)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "golden-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 20px hsl(45 100% 55% / 0.3)",
            borderColor: "hsl(45 100% 55% / 0.4)"
          },
          "50%": { 
            boxShadow: "0 0 40px hsl(45 100% 55% / 0.5)",
            borderColor: "hsl(45 100% 55% / 0.7)"
          },
        },
        "trophy-shine": {
          "0%": { filter: "drop-shadow(0 0 4px hsl(45 100% 55% / 0.5))" },
          "50%": { filter: "drop-shadow(0 0 12px hsl(45 100% 55% / 0.8))" },
          "100%": { filter: "drop-shadow(0 0 4px hsl(45 100% 55% / 0.5))" },
        },
        "arena-entrance": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(10px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "hover-lift": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-4px)" },
        },
        "victory-burst": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.1)", opacity: "0.8" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "particle-float": {
          "0%": { transform: "translateY(100vh) translateX(0) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateY(-100vh) translateX(100px) rotate(720deg)", opacity: "0" },
        },
        "particle-glow": {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.5)" },
        },
        "parallax-slow": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-20px)" },
        },
        "parallax-medium": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-40px)" },
        },
        "parallax-fast": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-60px)" },
        },
        "drift-left": {
          "0%, 100%": { transform: "translateX(0) translateY(0)" },
          "50%": { transform: "translateX(-30px) translateY(-15px)" },
        },
        "drift-right": {
          "0%, 100%": { transform: "translateX(0) translateY(0)" },
          "50%": { transform: "translateX(30px) translateY(-15px)" },
        },
        "ember-rise": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-100px) scale(0.5)", opacity: "0" },
        },
        "sparkle": {
          "0%, 100%": { opacity: "0", transform: "scale(0)" },
          "50%": { opacity: "1", transform: "scale(1)" },
        },
        "active-card-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 25px hsl(190 100% 50% / 0.45), inset 0 1px 0 hsl(190 100% 50% / 0.2)",
            borderColor: "hsl(190 100% 50% / 0.6)"
          },
          "50%": { 
            boxShadow: "0 0 40px hsl(190 100% 50% / 0.7), inset 0 1px 0 hsl(190 100% 50% / 0.3)",
            borderColor: "hsl(190 100% 50% / 0.9)"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "golden-pulse": "golden-pulse 2.5s ease-in-out infinite",
        "trophy-shine": "trophy-shine 2s ease-in-out infinite",
        "arena-entrance": "arena-entrance 0.4s ease-out",
        "hover-lift": "hover-lift 0.2s ease-out forwards",
        "victory-burst": "victory-burst 0.5s ease-out",
        "particle-float": "particle-float 15s linear infinite",
        "particle-glow": "particle-glow 3s ease-in-out infinite",
        "parallax-slow": "parallax-slow 20s ease-in-out infinite alternate",
        "parallax-medium": "parallax-medium 15s ease-in-out infinite alternate",
        "parallax-fast": "parallax-fast 10s ease-in-out infinite alternate",
        "drift-left": "drift-left 8s ease-in-out infinite",
        "drift-right": "drift-right 8s ease-in-out infinite",
        "ember-rise": "ember-rise 4s ease-out infinite",
        "sparkle": "sparkle 2s ease-in-out infinite",
        "active-card-glow": "active-card-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
