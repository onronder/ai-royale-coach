import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { useClashRoyaleBattles } from "@/hooks/useClashRoyaleBattles";
import { calculatePlayerDNA, PlayerDNA } from "@/utils/playerDnaCalculator";
import { ProDNACard } from "./ProDNACard";
import { Skeleton } from "@/components/ui/skeleton";
import { renderDnaCardToCanvas } from "@/utils/renderDnaCard";
import { toast } from "sonner";

interface ProDNAViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerTag: string;
  playerName: string;
}

function DNACardSkeleton() {
  return (
    <div className="w-[280px] mx-auto">
      <div 
        className="rounded-2xl p-4 space-y-3"
        style={{ 
          width: '280px',
          height: '400px',
          background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.1) 0%, rgba(0,0,0,0.3) 100%)',
          border: '2px solid rgba(212, 175, 55, 0.3)'
        }}
      >
        <div className="flex justify-center">
          <Skeleton className="h-5 w-20 bg-gold/20" />
        </div>
        <Skeleton className="h-6 w-32 mx-auto bg-gold/20" />
        <div className="flex justify-center py-3">
          <Skeleton className="h-16 w-16 rounded-full bg-gold/20" />
        </div>
        <Skeleton className="h-4 w-24 mx-auto bg-gold/20" />
        <div className="space-y-2 pt-3">
          <Skeleton className="h-8 w-full bg-gold/10" />
          <Skeleton className="h-8 w-full bg-gold/10" />
          <Skeleton className="h-8 w-full bg-gold/10" />
        </div>
      </div>
    </div>
  );
}

export function ProDNAView({ open, onOpenChange, playerTag, playerName }: ProDNAViewProps) {
  const { data: battles, isLoading } = useClashRoyaleBattles(playerTag);
  const [dna, setDna] = useState<PlayerDNA | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Calculate DNA when battles are available
  const calculatedDna = battles ? calculatePlayerDNA(battles, playerTag) : null;
  const displayDna = calculatedDna || dna;

  // Update local state when calculated
  if (calculatedDna && !dna) {
    setDna(calculatedDna);
  }

  const handleDownload = async () => {
    if (!displayDna) return;
    
    setIsDownloading(true);
    
    try {
      const formattedTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
      const canvas = await renderDnaCardToCanvas({
        dna: displayDna,
        playerName,
        playerTag: formattedTag,
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = `pro-dna-${playerName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      
      toast.success("DNA card downloaded!");
    } catch (error) {
      console.error("Failed to download card:", error);
      toast.error("Failed to download card");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!displayDna) return;
    
    try {
      const formattedTag = playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
      const canvas = await renderDnaCardToCanvas({
        dna: displayDna,
        playerName,
        playerTag: formattedTag,
        scale: 2,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `pro-dna-${playerName}.png`, { type: "image/png" });
          try {
            await navigator.share({
              files: [file],
              title: `${playerName}'s Pro DNA`,
              text: "Check out my Clash Royale Pro DNA!",
            });
            toast.success("Shared successfully!");
          } catch {
            // User cancelled or share failed, try download
            const link = document.createElement("a");
            link.download = `pro-dna-${playerName.replace(/\s+/g, "-").toLowerCase()}.png`;
            link.href = canvas.toDataURL("image/png", 1.0);
            link.click();
          }
        } else {
          // No native share, download instead
          const link = document.createElement("a");
          link.download = `pro-dna-${playerName.replace(/\s+/g, "-").toLowerCase()}.png`;
          link.href = canvas.toDataURL("image/png", 1.0);
          link.click();
        }
      }, "image/png", 1.0);
    } catch (error) {
      console.error("Failed to share card:", error);
      toast.error("Failed to share card");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="w-[95vw] max-w-[340px] p-4 bg-background/95 backdrop-blur-lg border-gold/20 flex flex-col"
        style={{ 
          maxHeight: 'calc(100dvh - 2rem)',
        }}
      >
        <DialogHeader className="pb-2 flex-shrink-0">
          <DialogTitle className="text-center font-rajdhani text-base text-gold">
            Your Pro DNA
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="flex flex-col items-center py-2">
            {isLoading ? (
              <DNACardSkeleton />
            ) : displayDna ? (
              <ProDNACard
                dna={displayDna}
                playerName={playerName}
                playerTag={playerTag.startsWith('#') ? playerTag : `#${playerTag}`}
              />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>Not enough battle data to generate your DNA.</p>
                <p className="text-sm mt-2">Play some matches first!</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - fixed at bottom */}
        {displayDna && (
          <div className="flex gap-3 w-full pt-3 flex-shrink-0 border-t border-border/50">
            <Button
              variant="outline"
              className="flex-1 min-h-[44px] border-gold/30 hover:bg-gold/10 hover:border-gold/50"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
            <Button
              variant="outline"
              className="flex-1 min-h-[44px] border-gold/30 hover:bg-gold/10 hover:border-gold/50"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ProDNAView;
