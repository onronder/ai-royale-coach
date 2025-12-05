import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Crown, 
  Gamepad2, 
  LayoutDashboard, 
  MessageCircle, 
  Sparkles,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  {
    key: "welcome",
    icon: Crown,
    color: "text-gold",
    bgColor: "bg-gold/20",
  },
  {
    key: "playerTag",
    icon: Gamepad2,
    color: "text-primary",
    bgColor: "bg-primary/20",
  },
  {
    key: "dashboard",
    icon: LayoutDashboard,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/20",
  },
  {
    key: "aiCoach",
    icon: MessageCircle,
    color: "text-purple-400",
    bgColor: "bg-purple-400/20",
  },
  {
    key: "trial",
    icon: Sparkles,
    color: "text-gold",
    bgColor: "bg-gold/20",
  },
];

export function OnboardingModal({ open, onComplete, onSkip }: OnboardingModalProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onSkip}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-card border-gold/30">
        {/* Header with progress */}
        <div className="relative p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {t('onboarding.stepOf', { current: currentStep + 1, total: steps.length })}
            </span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center text-center"
            >
              {/* Icon */}
              <div className={`w-20 h-20 rounded-2xl ${step.bgColor} flex items-center justify-center mb-6`}>
                <Icon className={`h-10 w-10 ${step.color}`} />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold font-rajdhani mb-3">
                {t(`onboarding.steps.${step.key}.title`)}
              </h2>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed max-w-sm">
                {t(`onboarding.steps.${step.key}.description`)}
              </p>

              {/* Dashboard features list for dashboard step */}
              {step.key === "dashboard" && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  {['stats', 'matches', 'deck', 'builder', 'cards', 'ranks', 'tourneys', 'clans', 'analytics'].map((tab) => (
                    <div key={tab} className="px-2 py-1 rounded bg-muted/50 text-muted-foreground">
                      {t(`dashboard.tabs.${tab}`)}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer with navigation */}
        <div className="p-4 border-t border-border/50 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('onboarding.back')}
          </Button>

          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep 
                    ? 'bg-gold' 
                    : index < currentStep 
                      ? 'bg-gold/50' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className="gap-1 bg-gold hover:bg-gold/90 text-black"
          >
            {currentStep === steps.length - 1 
              ? t('onboarding.getStarted') 
              : t('onboarding.next')}
            {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
