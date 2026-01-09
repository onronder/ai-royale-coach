import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, X, Crown, Flame, Swords, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CardImage } from '@/components/cards/CardImage';
import { cn } from '@/lib/utils';
import { renderArenaCardToCanvas } from '@/utils/renderArenaCard';
import type { SimulationResult } from '@/utils/dreamArenaEngine';
import type { ProPlayer } from '@/data/proPlayers';
import type { ClashRoyaleCard } from '@/services/clashRoyaleApi';

interface ViralMatchResultProps {
  isOpen: boolean;
  onClose: () => void;
  simulationResult: SimulationResult;
  userProfile: {
    name: string;
    deck: ClashRoyaleCard[];
    trophies: number;
  };
  proPlayer: ProPlayer;
}

export const ViralMatchResult: React.FC<ViralMatchResultProps> = ({
  isOpen,
  onClose,
  simulationResult,
  userProfile,
  proPlayer,
}) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);

  const isVictory = simulationResult.winner === 'user';
  const isUpset = isVictory && simulationResult.winProbability < 0.3;
  const winProbabilityPercent = Math.round(simulationResult.winProbability * 100);
  const lastFrame = simulationResult.timeline[simulationResult.timeline.length - 1];

  const handleDownload = async () => {
    setIsGenerating(true);

    try {
      const canvas = await renderArenaCardToCanvas({
        winner: simulationResult.winner,
        winProbability: simulationResult.winProbability,
        userHp: lastFrame?.userHp ?? 0,
        proHp: lastFrame?.proHp ?? 0,
        proName: proPlayer.name,
        proSpecialty: proPlayer.specialty,
        userDeck: userProfile.deck,
        translations: {
          iDefeated: t('dreamArena.iDefeated', { proName: proPlayer.name.toUpperCase() }),
          iLostTo: t('dreamArena.iLostTo', { proName: proPlayer.name }),
          winProbability: t('dreamArena.winProbability'),
          myDeck: t('dreamArena.myDeck'),
          finalHp: t('dreamArena.finalHp'),
          upsetAlert: t('dreamArena.upsetAlert'),
          aiSimulation: t('dreamArena.aiSimulation'),
        },
        scale: 3,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create blob'))),
          'image/png',
          1.0
        );
      });

      const file = new File([blob], 'dream-arena-result.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: t('dreamArena.title'),
          text: isVictory
            ? t('dreamArena.iDefeated', { proName: proPlayer.name })
            : t('dreamArena.iLostTo', { proName: proPlayer.name }),
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dream-arena-${proPlayer.id}-result.png`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(t('dreamArena.imageSaved'));
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(t('dreamArena.downloadFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] p-0 gap-0 bg-transparent border-none overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{t('dreamArena.shareResult')}</DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            'relative w-[420px] h-[720px] mx-auto rounded-2xl overflow-hidden',
            'flex flex-col items-center justify-between p-6'
          )}
          style={{
            background: isVictory
              ? 'linear-gradient(180deg, #1a1508 0%, #2d2006 25%, #3d2a08 50%, #2d2006 75%, #1a1508 100%)'
              : 'linear-gradient(180deg, #1a1a1a 0%, #2d2222 25%, #3d2a2a 50%, #2d2222 75%, #1a1a1a 100%)',
          }}
        >
          <div
            className={cn(
              'absolute inset-0 opacity-30',
              isVictory
                ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/40 via-transparent to-transparent'
                : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-destructive/20 via-transparent to-transparent'
            )}
          />

          <div className="relative z-10 flex flex-col items-center w-full h-full">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center mt-4">
              {isVictory ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Crown className="w-8 h-8 text-gold" />
                    {isUpset && <Flame className="w-6 h-6 text-destructive animate-pulse" />}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-gold tracking-wide" style={{ textShadow: '0 0 20px rgba(255, 215, 0, 0.5)' }}>
                    {t('dreamArena.iDefeated', { proName: proPlayer.name.toUpperCase() })}
                  </h2>
                </>
              ) : (
                <>
                  <Swords className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <h2 className="text-2xl sm:text-3xl font-bold text-muted-foreground">
                    {t('dreamArena.iLostTo', { proName: proPlayer.name })}
                  </h2>
                </>
              )}
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-3 mt-4 px-4 py-3 rounded-xl bg-black/50 border border-white/10">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-crimson to-destructive flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {proPlayer.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-lg text-foreground">{proPlayer.name}</p>
                <p className="text-sm text-muted-foreground">{t(proPlayer.specialty)}</p>
              </div>
            </motion.div>

            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-6">
              {isUpset && (
                <Badge className="bg-destructive/20 text-destructive border-destructive/30 mb-2">
                  <Flame className="w-3 h-3 mr-1" />
                  {t('dreamArena.upsetAlert')}
                </Badge>
              )}
              <div className={cn('text-center px-6 py-3 rounded-xl', isUpset ? 'bg-gold/20 border border-gold/30' : 'bg-black/30')}>
                <p className="text-sm text-muted-foreground mb-1">{t('dreamArena.winProbability')}</p>
                <p className={cn('text-4xl font-black', isUpset ? 'text-gold' : isVictory ? 'text-emerald-400' : 'text-muted-foreground')}>
                  {winProbabilityPercent}%
                </p>
              </div>
            </motion.div>

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-6 w-full">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Swords className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{t('dreamArena.myDeck')}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 px-4">
                {userProfile.deck.slice(0, 8).map((card, index) => (
                  <CardImage key={card.id || index} card={card} size="sm" showLevel={false} />
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">{t('dreamArena.finalHp')}</p>
              <div className="flex items-center justify-center gap-4">
                <span className={cn('text-xl font-bold', isVictory ? 'text-emerald-400' : 'text-destructive')}>{lastFrame?.userHp ?? 0}</span>
                <span className="text-muted-foreground">vs</span>
                <span className={cn('text-xl font-bold', !isVictory ? 'text-emerald-400' : 'text-destructive')}>{lastFrame?.proHp ?? 0}</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-auto pt-4">
              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-black/50">
                <Crown className="w-4 h-4 text-gold" />
                <span className="text-xs font-medium text-muted-foreground">{t('dreamArena.aiSimulation')}</span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="flex gap-3 p-4 bg-background rounded-b-lg">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            {t('dreamArena.close')}
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-gold to-amber-500 text-black hover:from-gold/90 hover:to-amber-500/90" onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            {t('dreamArena.downloadImage')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
