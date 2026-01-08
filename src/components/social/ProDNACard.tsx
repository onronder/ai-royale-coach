import { Crown, Sword, Shield, Shuffle, Sparkles } from "lucide-react";
import type { PlayerDNA } from "@/utils/playerDnaCalculator";
import { cn } from "@/lib/utils";

interface ProDNACardProps {
  dna: PlayerDNA;
  playerName: string;
  playerTag: string;
}

const StatBar = ({ label, value, icon: Icon, color }: { 
  label: string; 
  value: number; 
  icon: React.ElementType;
  color: string;
}) => (
  <div className="flex items-center gap-3">
    <div className={cn("p-1.5 rounded-md", color)}>
      <Icon className="w-4 h-4 text-black" />
    </div>
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-gold/80">{label}</span>
        <span className="text-sm font-bold text-white">{value}</span>
      </div>
      <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-gold/30">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  </div>
);

export function ProDNACard({ dna, playerName, playerTag }: ProDNACardProps) {
  const { stats, archetype, similarPro, description } = dna;

  return (
    <div className="relative w-full max-w-[320px] aspect-[3/4] select-none">
      {/* Outer Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-gold/40 via-amber-500/20 to-gold/40 blur-xl rounded-2xl" />
      
      {/* Card Container */}
      <div className="relative h-full bg-gradient-to-br from-[#1a1a0f] via-[#0d0d08] to-[#1a1a0f] rounded-2xl border-2 border-gold/60 overflow-hidden shadow-[0_0_30px_rgba(255,215,0,0.3)]">
        
        {/* Decorative Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(255,215,0,0.3)_0%,_transparent_50%)]" />
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-gold/20 to-transparent" />
        </div>

        {/* Top Section - Archetype */}
        <div className="relative pt-4 px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/20 rounded-full border border-gold/40">
            <Sparkles className="w-3 h-3 text-gold" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold">Player DNA</span>
          </div>
          
          <h2 className="mt-3 text-2xl font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-gold via-amber-200 to-gold drop-shadow-lg" style={{ fontFamily: 'system-ui' }}>
            {archetype}
          </h2>
        </div>

        {/* Center - Avatar Area */}
        <div className="relative flex justify-center py-4">
          <div className="relative">
            {/* Avatar Glow Ring */}
            <div className="absolute inset-0 bg-gradient-to-br from-gold/40 to-amber-600/40 rounded-full blur-md scale-110" />
            
            {/* Avatar Container */}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gold/30 to-amber-900/50 border-2 border-gold/60 flex items-center justify-center shadow-lg">
              <Crown className="w-12 h-12 text-gold drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]" />
            </div>
            
            {/* Rating Badge */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-gold via-amber-300 to-gold rounded-full border border-amber-200">
              <span className="text-xs font-black text-black">
                {Math.round((stats.aggression + stats.defense + stats.versatility) / 3)}
              </span>
            </div>
          </div>
        </div>

        {/* Player Info */}
        <div className="text-center px-4 -mt-1">
          <h3 className="text-lg font-bold text-white truncate">{playerName}</h3>
          <p className="text-xs text-gold/60 font-mono">{playerTag}</p>
        </div>

        {/* Stats Section */}
        <div className="px-5 py-4 space-y-3">
          <StatBar 
            label="AGG" 
            value={stats.aggression} 
            icon={Sword}
            color="bg-gradient-to-r from-red-500 to-orange-500"
          />
          <StatBar 
            label="DEF" 
            value={stats.defense} 
            icon={Shield}
            color="bg-gradient-to-r from-blue-500 to-cyan-500"
          />
          <StatBar 
            label="VER" 
            value={stats.versatility} 
            icon={Shuffle}
            color="bg-gradient-to-r from-purple-500 to-pink-500"
          />
        </div>

        {/* Similar Pro */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-center gap-2 py-2 bg-black/40 rounded-lg border border-gold/20">
            <span className="text-xs text-gold/60">Similar to:</span>
            <span className="text-sm font-bold text-gold">{similarPro}</span>
          </div>
        </div>

        {/* Footer Branding */}
        <div className="absolute bottom-2 right-3 flex items-center gap-1 opacity-60">
          <Crown className="w-3 h-3 text-gold" />
          <span className="text-[8px] font-bold uppercase tracking-wider text-gold">AI Royale Coach</span>
        </div>

        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold/60 rounded-tl-2xl" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gold/60 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gold/60 rounded-bl-2xl" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold/60 rounded-br-2xl" />
      </div>
    </div>
  );
}

export default ProDNACard;
