import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Radar, Sparkles, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WhatsNewModalProps {
  open: boolean;
  onDismiss: () => void;
  playerTag?: string;
}

const features = [
  {
    id: "oracle",
    icon: Eye,
    gradient: "from-emerald-500/20 via-emerald-600/10 to-transparent",
    iconColor: "text-emerald-400",
    glowColor: "shadow-emerald-500/20",
    ctaAction: "oracle",
  },
  {
    id: "quickscan",
    icon: Radar,
    gradient: "from-amber-500/20 via-amber-600/10 to-transparent",
    iconColor: "text-amber-400",
    glowColor: "shadow-amber-500/20",
    ctaAction: "matches",
  },
];

export function WhatsNewModal({ open, onDismiss, playerTag }: WhatsNewModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentFeature = features[currentIndex];

  const handleNext = () => {
    if (currentIndex < features.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCta = () => {
    onDismiss();
    if (currentFeature.ctaAction === "oracle" && playerTag) {
      navigate(`/oracle?player=${playerTag}`);
    } else if (currentFeature.ctaAction === "matches" && playerTag) {
      navigate(`/player/${playerTag}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-primary/20 bg-card/95 backdrop-blur-xl">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 bg-muted/50 hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Header */}
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </motion.div>
            <DialogTitle className="text-lg font-rajdhani uppercase tracking-wide">
              {t('whatsNew.title')}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Feature Card */}
        <div className="relative px-6 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFeature.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "relative rounded-xl border border-border/50 p-6 overflow-hidden",
                "bg-gradient-to-br",
                currentFeature.gradient
              )}
            >
              {/* Glow effect */}
              <div
                className={cn(
                  "absolute inset-0 opacity-30 blur-3xl",
                  currentFeature.gradient
                )}
              />

              {/* Content */}
              <div className="relative z-10 space-y-4">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className={cn(
                    "inline-flex items-center justify-center w-14 h-14 rounded-xl",
                    "bg-background/50 backdrop-blur-sm border border-border/50",
                    currentFeature.glowColor,
                    "shadow-lg"
                  )}
                >
                  <currentFeature.icon
                    className={cn("h-7 w-7", currentFeature.iconColor)}
                  />
                </motion.div>

                {/* Text */}
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-rajdhani uppercase tracking-wide">
                    {t(`whatsNew.features.${currentFeature.id}.title`)}
                  </h3>
                  <p className={cn("text-sm font-medium", currentFeature.iconColor)}>
                    {t(`whatsNew.features.${currentFeature.id}.subtitle`)}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`whatsNew.features.${currentFeature.id}.description`)}
                </p>

                {/* CTA Button */}
                <Button
                  onClick={handleCta}
                  variant={currentIndex === 0 ? "glow" : "golden"}
                  className="w-full mt-2"
                >
                  {t(`whatsNew.features.${currentFeature.id}.cta`)}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 pb-6">
          {/* Prev/Next Arrows */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {features.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  idx === currentIndex
                    ? "bg-primary w-4"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === features.length - 1}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Dismiss link */}
        <div className="border-t border-border/50 p-4">
          <button
            onClick={onDismiss}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('whatsNew.gotIt')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
