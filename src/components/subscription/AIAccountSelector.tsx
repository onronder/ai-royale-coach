import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Brain, Crown, Trophy, Users, Sparkles, Check } from "lucide-react";
import { useUserAIProfiles } from "@/hooks/usePlayerAIAccess";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIAccountSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountSlots: number;
  onComplete?: () => void;
}

export function AIAccountSelector({ open, onOpenChange, accountSlots, onComplete }: AIAccountSelectorProps) {
  const { t } = useTranslation();
  const { profiles, updateAIAccess, isUpdating, refetch } = useUserAIProfiles();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Initialize selected IDs from current ai_enabled state
  useEffect(() => {
    if (open && profiles.length > 0) {
      const currentlyEnabled = profiles
        .filter(p => p.ai_enabled)
        .map(p => p.id);
      setSelectedIds(currentlyEnabled);
    }
  }, [open, profiles]);

  const handleToggle = (profileId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(profileId)) {
        return prev.filter(id => id !== profileId);
      }
      // Don't allow selecting more than accountSlots
      if (prev.length >= accountSlots) {
        toast.error(t('subscription.aiSelector.maxReached', { count: accountSlots }));
        return prev;
      }
      return [...prev, profileId];
    });
  };

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      toast.error(t('subscription.aiSelector.selectAtLeastOne'));
      return;
    }

    try {
      await updateAIAccess(selectedIds);
      toast.success(t('subscription.aiSelector.saved'));
      await refetch();
      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      console.error('Error saving AI selection:', error);
      toast.error(t('subscription.aiSelector.error'));
    }
  };

  const canSave = selectedIds.length > 0 && selectedIds.length <= accountSlots;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-gold/30 bg-gradient-to-br from-card via-card to-primary/5">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-rajdhani text-embossed">
            {t('subscription.aiSelector.title')}
          </DialogTitle>
          <DialogDescription>
            {t('subscription.aiSelector.description', { count: accountSlots })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Selection Counter */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t('subscription.aiSelector.selected')}
              </span>
            </div>
            <Badge variant={selectedIds.length === accountSlots ? "default" : "outline"}>
              {selectedIds.length} / {accountSlots}
            </Badge>
          </div>

          {/* Profile List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {profiles.map((profile) => {
              const isSelected = selectedIds.includes(profile.id);
              const isDisabled = !isSelected && selectedIds.length >= accountSlots;

              return (
                <div
                  key={profile.id}
                  onClick={() => !isDisabled && handleToggle(profile.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                    isSelected 
                      ? "border-primary/50 bg-primary/10" 
                      : isDisabled
                        ? "border-border/30 bg-muted/30 opacity-50 cursor-not-allowed"
                        : "border-border/50 hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={isDisabled}
                    className="pointer-events-none"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">
                        {profile.player_name || profile.player_tag}
                      </span>
                      {isSelected && (
                        <Badge variant="outline" className="border-primary/50 text-primary text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-gold" />
                        {profile.trophies?.toLocaleString() || '—'}
                      </span>
                      {profile.clan_name && (
                        <span className="truncate">{profile.clan_name}</span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              );
            })}

            {profiles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('subscription.aiSelector.noProfiles')}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating}
            className="w-full sm:w-auto"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || isUpdating}
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80"
          >
            {isUpdating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-background/30 border-t-background mr-2" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t('subscription.aiSelector.confirm')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
