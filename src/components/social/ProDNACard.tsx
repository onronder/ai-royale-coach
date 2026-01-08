import { Crown, Sword, Shield, Shuffle, Sparkles } from "lucide-react";
import type { PlayerDNA } from "@/utils/playerDnaCalculator";

interface ProDNACardProps {
  dna: PlayerDNA;
  playerName: string;
  playerTag: string;
}

const StatBar = ({ label, value, icon: Icon, gradientFrom, gradientTo }: { 
  label: string; 
  value: number; 
  icon: React.ElementType;
  gradientFrom: string;
  gradientTo: string;
}) => (
  <div className="flex items-center gap-2">
    <div 
      className="w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
    >
      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-0.5 sm:mb-1">
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest" style={{ color: '#d4af37' }}>{label}</span>
        <span className="text-xs sm:text-sm font-black text-white tabular-nums">{value}</span>
      </div>
      <div 
        className="h-1.5 sm:h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212, 175, 55, 0.25)' }}
      >
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${value}%`,
            background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`
          }}
        />
      </div>
    </div>
  </div>
);

export function ProDNACard({ dna, playerName, playerTag }: ProDNACardProps) {
  const { stats, archetype, similarPro } = dna;
  const avgScore = Math.round((stats.aggression + stats.defense + stats.versatility) / 3);

  return (
    // Responsive outer wrapper with padding for glow effects
    <div className="w-full max-w-[280px] sm:max-w-[320px] mx-auto p-1">
      {/* Card with aspect ratio - FIFA card style 2:3 ratio */}
      <div 
        className="relative select-none w-full aspect-[320/440]"
        style={{ 
          padding: '3px',
          background: 'linear-gradient(135deg, #d4af37 0%, #f5d87a 30%, #d4af37 50%, #b8963c 70%, #d4af37 100%)',
          borderRadius: '16px',
          boxShadow: '0 0 30px rgba(212, 175, 55, 0.3), 0 10px 40px rgba(0,0,0,0.4)'
        }}
      >
        {/* Inner Card */}
        <div 
          className="relative w-full h-full overflow-hidden"
          style={{ 
            background: 'linear-gradient(180deg, #1a1508 0%, #0d0a04 50%, #1a1508 100%)',
            borderRadius: '13px',
          }}
        >
          {/* Top Glow Effect */}
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 w-40 sm:w-48 h-24 sm:h-32"
            style={{ 
              background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.25) 0%, transparent 70%)',
            }}
          />

          {/* Content Container - percentage based heights */}
          <div className="relative h-full flex flex-col px-3 sm:px-4 py-2 sm:py-3">
            {/* Header Badge - ~7% height */}
            <div className="flex justify-center" style={{ flex: '0 0 7%' }}>
              <div 
                className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))',
                  border: '1px solid rgba(212, 175, 55, 0.5)'
                }}
              >
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: '#d4af37' }} />
                <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em]" style={{ color: '#d4af37' }}>
                  Player DNA
                </span>
              </div>
            </div>

            {/* Archetype Title - ~8% height */}
            <div className="flex items-center justify-center" style={{ flex: '0 0 8%' }}>
              <h2 
                className="text-center text-lg sm:text-2xl font-black uppercase tracking-wide truncate max-w-full"
                style={{ 
                  color: '#d4af37',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.5), 0 2px 4px rgba(0,0,0,0.8)',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                {archetype}
              </h2>
            </div>

            {/* Avatar Section - ~25% height */}
            <div className="flex justify-center items-center" style={{ flex: '0 0 25%' }}>
              <div className="relative">
                {/* Outer Glow Ring */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{ 
                    background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%)',
                    transform: 'scale(1.3)'
                  }}
                />
                
                {/* Avatar Circle */}
                <div 
                  className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center"
                  style={{ 
                    background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.3) 0%, rgba(139, 107, 35, 0.3) 100%)',
                    border: '2px solid #d4af37',
                    boxShadow: '0 0 20px rgba(212, 175, 55, 0.3), inset 0 0 20px rgba(212, 175, 55, 0.1)'
                  }}
                >
                  <Crown 
                    className="w-8 h-8 sm:w-10 sm:h-10" 
                    style={{ color: '#d4af37', filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))' }} 
                  />
                </div>
                
                {/* Score Badge */}
                <div 
                  className="absolute -bottom-1.5 sm:-bottom-2 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-0.5 sm:py-1 rounded-full"
                  style={{ 
                    background: 'linear-gradient(180deg, #f5d87a 0%, #d4af37 50%, #b8963c 100%)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                  }}
                >
                  <span className="text-xs sm:text-sm font-black" style={{ color: '#1a1508' }}>{avgScore}</span>
                </div>
              </div>
            </div>

            {/* Player Info - ~10% height */}
            <div className="text-center flex flex-col justify-center" style={{ flex: '0 0 10%' }}>
              <h3 
                className="text-base sm:text-lg font-bold truncate px-2"
                style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              >
                {playerName}
              </h3>
              <p 
                className="text-[10px] sm:text-xs font-mono"
                style={{ color: 'rgba(212, 175, 55, 0.6)' }}
              >
                {playerTag}
              </p>
            </div>

            {/* Stats Section - ~28% height */}
            <div className="flex flex-col justify-center gap-2 sm:gap-3" style={{ flex: '0 0 28%' }}>
              <StatBar 
                label="AGG" 
                value={stats.aggression} 
                icon={Sword}
                gradientFrom="#ef4444"
                gradientTo="#f97316"
              />
              <StatBar 
                label="DEF" 
                value={stats.defense} 
                icon={Shield}
                gradientFrom="#3b82f6"
                gradientTo="#06b6d4"
              />
              <StatBar 
                label="VER" 
                value={stats.versatility} 
                icon={Shuffle}
                gradientFrom="#a855f7"
                gradientTo="#ec4899"
              />
            </div>

            {/* Similar Pro Section - ~10% height */}
            <div 
              className="flex items-center justify-center py-1.5 sm:py-2 rounded-lg"
              style={{ 
                flex: '0 0 10%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }}
            >
              <span className="text-[10px] sm:text-xs" style={{ color: 'rgba(212, 175, 55, 0.6)' }}>Similar to: </span>
              <span className="text-xs sm:text-sm font-bold ml-1" style={{ color: '#d4af37' }}>{similarPro}</span>
            </div>

            {/* Footer Branding - ~5% height */}
            <div className="flex items-center justify-end gap-1 sm:gap-1.5" style={{ flex: '0 0 5%' }}>
              <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: 'rgba(212, 175, 55, 0.5)' }} />
              <span 
                className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider"
                style={{ color: 'rgba(212, 175, 55, 0.5)' }}
              >
                AI Royale Coach
              </span>
            </div>
          </div>

          {/* Corner Accents */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 w-3 h-3 sm:w-4 sm:h-4 border-t border-l rounded-tl" style={{ borderColor: 'rgba(212, 175, 55, 0.35)' }} />
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-3 h-3 sm:w-4 sm:h-4 border-t border-r rounded-tr" style={{ borderColor: 'rgba(212, 175, 55, 0.35)' }} />
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 w-3 h-3 sm:w-4 sm:h-4 border-b border-l rounded-bl" style={{ borderColor: 'rgba(212, 175, 55, 0.35)' }} />
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 w-3 h-3 sm:w-4 sm:h-4 border-b border-r rounded-br" style={{ borderColor: 'rgba(212, 175, 55, 0.35)' }} />
        </div>
      </div>
    </div>
  );
}

export default ProDNACard;
