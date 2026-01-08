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
  <div className="flex items-center gap-2.5">
    <div 
      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
      style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
    >
      <Icon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#d4af37' }}>{label}</span>
        <span className="text-sm font-black text-white tabular-nums">{value}</span>
      </div>
      <div 
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212, 175, 55, 0.25)' }}
      >
        <div 
          className="h-full rounded-full"
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
    <div 
      className="relative select-none"
      style={{ 
        width: '320px', 
        height: '440px',
        padding: '3px',
        background: 'linear-gradient(135deg, #d4af37 0%, #f5d87a 30%, #d4af37 50%, #b8963c 70%, #d4af37 100%)',
        borderRadius: '16px',
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
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32"
          style={{ 
            background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.25) 0%, transparent 70%)',
          }}
        />

        {/* Content Container */}
        <div className="relative h-full flex flex-col px-4 py-3">
          {/* Header Badge */}
          <div className="flex justify-center">
            <div 
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full"
              style={{ 
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1))',
                border: '1px solid rgba(212, 175, 55, 0.5)'
              }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#d4af37' }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#d4af37' }}>
                Player DNA
              </span>
            </div>
          </div>

          {/* Archetype Title */}
          <h2 
            className="text-center mt-3 text-2xl font-black uppercase tracking-wide"
            style={{ 
              color: '#d4af37',
              textShadow: '0 0 20px rgba(212, 175, 55, 0.5), 0 2px 4px rgba(0,0,0,0.8)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {archetype}
          </h2>

          {/* Avatar Section */}
          <div className="flex justify-center mt-4 mb-3">
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
                className="relative w-24 h-24 rounded-full flex items-center justify-center"
                style={{ 
                  background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.3) 0%, rgba(139, 107, 35, 0.3) 100%)',
                  border: '3px solid #d4af37',
                  boxShadow: '0 0 20px rgba(212, 175, 55, 0.3), inset 0 0 20px rgba(212, 175, 55, 0.1)'
                }}
              >
                <Crown 
                  className="w-12 h-12" 
                  style={{ color: '#d4af37', filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))' }} 
                />
              </div>
              
              {/* Score Badge */}
              <div 
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full"
                style={{ 
                  background: 'linear-gradient(180deg, #f5d87a 0%, #d4af37 50%, #b8963c 100%)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
                }}
              >
                <span className="text-sm font-black" style={{ color: '#1a1508' }}>{avgScore}</span>
              </div>
            </div>
          </div>

          {/* Player Info */}
          <div className="text-center mt-2">
            <h3 
              className="text-xl font-bold truncate"
              style={{ color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
            >
              {playerName}
            </h3>
            <p 
              className="text-xs font-mono mt-0.5"
              style={{ color: 'rgba(212, 175, 55, 0.6)' }}
            >
              {playerTag}
            </p>
          </div>

          {/* Stats Section */}
          <div className="flex-1 flex flex-col justify-center space-y-3 mt-3">
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

          {/* Similar Pro Section */}
          <div 
            className="mt-3 py-2.5 rounded-lg text-center"
            style={{ 
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}
          >
            <span className="text-xs" style={{ color: 'rgba(212, 175, 55, 0.6)' }}>Similar to: </span>
            <span className="text-sm font-bold" style={{ color: '#d4af37' }}>{similarPro}</span>
          </div>

          {/* Footer Branding */}
          <div className="flex items-center justify-end gap-1.5 mt-2">
            <Crown className="w-3 h-3" style={{ color: 'rgba(212, 175, 55, 0.5)' }} />
            <span 
              className="text-[9px] font-bold uppercase tracking-wider"
              style={{ color: 'rgba(212, 175, 55, 0.5)' }}
            >
              AI Royale Coach
            </span>
          </div>
        </div>

        {/* Corner Accents */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t border-l rounded-tl" style={{ borderColor: 'rgba(212, 175, 55, 0.35)' }} />
        <div className="absolute top-3 right-3 w-4 h-4 border-t border-r rounded-tr" style={{ borderColor: 'rgba(212, 175, 55, 0.35)' }} />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l rounded-bl" style={{ borderColor: 'rgba(212, 175, 55, 0.35)' }} />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r rounded-br" style={{ borderColor: 'rgba(212, 175, 55, 0.35)' }} />
      </div>
    </div>
  );
}

export default ProDNACard;
