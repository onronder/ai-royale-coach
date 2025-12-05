import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFeedback, FeedbackType } from "@/hooks/useFeedback";
import { motion, AnimatePresence } from "framer-motion";

interface FeedbackButtonProps {
  playerTag: string;
  feedbackType: FeedbackType;
  referenceId?: string;
  context?: Record<string, unknown>;
  size?: "sm" | "default";
  className?: string;
}

export function FeedbackButton({
  playerTag,
  feedbackType,
  referenceId,
  context,
  size = "sm",
  className
}: FeedbackButtonProps) {
  const [selected, setSelected] = useState<'up' | 'down' | null>(null);
  const { submitFeedback, isSubmitting } = useFeedback();

  const handleFeedback = (helpful: boolean) => {
    const newSelection = helpful ? 'up' : 'down';
    if (selected === newSelection) return;
    
    setSelected(newSelection);
    submitFeedback({
      playerTag,
      feedbackType,
      referenceId,
      helpful,
      context
    });
  };

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const buttonSize = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={selected || 'none'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              buttonSize,
              "rounded-full transition-all",
              selected === 'up' 
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" 
                : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10"
            )}
            onClick={() => handleFeedback(true)}
            disabled={isSubmitting || selected !== null}
          >
            <ThumbsUp className={iconSize} />
          </Button>
        </motion.div>
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={selected || 'none'}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.15, delay: 0.05 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              buttonSize,
              "rounded-full transition-all",
              selected === 'down' 
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                : "text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
            )}
            onClick={() => handleFeedback(false)}
            disabled={isSubmitting || selected !== null}
          >
            <ThumbsDown className={iconSize} />
          </Button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
