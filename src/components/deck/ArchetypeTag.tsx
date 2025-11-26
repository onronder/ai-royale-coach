import { Badge } from "@/components/ui/badge";
import { Sword, Shield, Zap, Castle, Flame } from "lucide-react";

interface ArchetypeTagProps {
  playstyle: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const playstyleIcons = {
  control: Shield,
  beatdown: Sword,
  cycle: Zap,
  siege: Castle,
  bridge_spam: Flame,
};

const playstyleColors = {
  control: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  beatdown: "bg-red-500/10 text-red-500 border-red-500/20",
  cycle: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  siege: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  bridge_spam: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

export function ArchetypeTag({ playstyle, name, size = 'md' }: ArchetypeTagProps) {
  const Icon = playstyleIcons[playstyle as keyof typeof playstyleIcons] || Shield;
  const colorClass = playstyleColors[playstyle as keyof typeof playstyleColors] || playstyleColors.control;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge variant="outline" className={`${colorClass} ${sizeClasses[size]} font-medium`}>
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1.5`} />
      {name}
    </Badge>
  );
}
