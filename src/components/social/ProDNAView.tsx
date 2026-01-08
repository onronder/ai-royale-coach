import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";
import { useClashRoyaleBattles } from "@/hooks/useClashRoyaleBattles";
import { calculatePlayerDNA, PlayerDNA } from "@/utils/playerDnaCalculator";
import { ProDNACard } from "./ProDNACard";
import { Skeleton } from "@/components/ui/skeleton";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface ProDNAViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerTag: string;
  playerName: string;
}

function DNACardSkeleton() {
  return (
    <div className="w-full max-w-[320px] aspect-[3/4] rounded-2xl bg-gradient-to-br from-gold/10 to-black/50 border border-gold/30 p-6 space-y-4">
      <div className="flex justify-center">
        <Skeleton className="h-6 w-24 bg-gold/20" />
      </div>
      <Skeleton className="h-8 w-40 mx-auto bg-gold/20" />
      <div className="flex justify-center py-4">
        <Skeleton className="h-24 w-24 rounded-full bg-gold/20" />
      </div>
      <Skeleton className="h-5 w-32 mx-auto bg-gold/20" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-8 w-full bg-gold/10" />
        <Skeleton className="h-8 w-full bg-gold/10" />
        <Skeleton className="h-8 w-full bg-gold/10" />
      </div>
    </div>
  );
}

export function ProDNAView({ open, onOpenChange, playerTag, playerName }: ProDNAViewProps) {
  const { data: battles, isLoading } = useClashRoyaleBattles(playerTag);
  const [dna, setDna] = useState<PlayerDNA | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate DNA when battles are available
  const calculatedDna = battles ? calculatePlayerDNA(battles, playerTag) : null;
  const displayDna = calculatedDna || dna;

  // Update local state when calculated
  if (calculatedDna && !dna) {
    setDna(calculatedDna);
  }

  const handleDownload = async () => {
    if (!cardRef.current) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const link = document.createElement("a");
      link.download = `pro-dna-${playerName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
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
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
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
          } catch {
            // User cancelled or share failed, fallback to download
            handleDownload();
          }
        } else {
          // Fallback to download if share not available
          handleDownload();
        }
      }, "image/png");
    } catch (error) {
      console.error("Failed to share card:", error);
      toast.error("Failed to share card");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-card via-background to-card border-gold/30">
        <DialogHeader>
          <DialogTitle className="text-center font-rajdhani text-xl text-gold">
            Your Pro DNA
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {isLoading ? (
            <DNACardSkeleton />
          ) : displayDna ? (
            <div ref={cardRef}>
              <ProDNACard
                dna={displayDna}
                playerName={playerName}
                playerTag={playerTag.startsWith('#') ? playerTag : `#${playerTag}`}
              />
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>Not enough battle data to generate your DNA.</p>
              <p className="text-sm mt-2">Play some matches first!</p>
            </div>
          )}

          {/* Action Buttons */}
          {displayDna && (
            <div className="flex gap-3 w-full max-w-[320px]">
              <Button
                variant="outline"
                className="flex-1 border-gold/30 hover:bg-gold/10 hover:border-gold/50"
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
                className="flex-1 border-gold/30 hover:bg-gold/10 hover:border-gold/50"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProDNAView;
