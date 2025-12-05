import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackRating } from "./FeedbackRating";
import { useFeedback, FeedbackType } from "@/hooks/useFeedback";
import { MessageSquare } from "lucide-react";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerTag: string;
  feedbackType: FeedbackType;
  referenceId?: string;
  context?: Record<string, unknown>;
  title?: string;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  playerTag,
  feedbackType,
  referenceId,
  context,
  title
}: FeedbackDialogProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { submitFeedback, isSubmitting } = useFeedback();

  const handleSubmit = () => {
    if (rating === 0) return;
    
    submitFeedback({
      playerTag,
      feedbackType,
      referenceId,
      rating,
      helpful: rating >= 4,
      comment: comment.trim() || undefined,
      context
    });
    
    // Reset and close
    setRating(0);
    setComment("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setRating(0);
    setComment("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-primary/20 bg-card/95 backdrop-blur">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            {title || t('feedback.rateResponse')}
          </DialogTitle>
          <DialogDescription>
            {t('feedback.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('feedback.howHelpful')}
            </span>
            <FeedbackRating
              value={rating}
              onChange={setRating}
              size="lg"
            />
            {rating > 0 && (
              <span className="text-sm font-medium text-primary">
                {rating === 1 && t('feedback.ratings.poor')}
                {rating === 2 && t('feedback.ratings.fair')}
                {rating === 3 && t('feedback.ratings.good')}
                {rating === 4 && t('feedback.ratings.great')}
                {rating === 5 && t('feedback.ratings.excellent')}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              {t('feedback.commentOptional')}
            </label>
            <Textarea
              placeholder={t('feedback.commentPlaceholder')}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none bg-background/50"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0 || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? t('common.loading') : t('feedback.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
