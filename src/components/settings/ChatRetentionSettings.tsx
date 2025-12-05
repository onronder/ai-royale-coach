import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ChatRetentionSettingsProps {
  userId: string;
  currentRetention: number | null;
  onUpdate: () => void;
}

const RETENTION_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "forever", label: "Keep forever" },
];

export function ChatRetentionSettings({ userId, currentRetention, onUpdate }: ChatRetentionSettingsProps) {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [retention, setRetention] = useState<string>(
    currentRetention === null ? "forever" : String(currentRetention)
  );

  const handleRetentionChange = async (value: string) => {
    setRetention(value);
    setIsUpdating(true);

    try {
      const newRetention = value === "forever" ? null : parseInt(value, 10);
      
      const { error } = await supabase
        .from("profiles")
        .update({ chat_retention_days: newRetention })
        .eq("id", userId);

      if (error) throw error;

      toast.success(t('settings.chatRetention.updated'));
      onUpdate();
    } catch (error) {
      console.error("Error updating retention:", error);
      toast.error(t('settings.chatRetention.updateFailed'));
      // Revert on error
      setRetention(currentRetention === null ? "forever" : String(currentRetention));
    } finally {
      setIsUpdating(false);
    }
  };

  const getRetentionLabel = () => {
    const option = RETENTION_OPTIONS.find(o => o.value === retention);
    return option ? t(`settings.chatRetention.options.${option.value}`) : retention;
  };

  return (
    <Card variant="arena">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          {t('settings.chatRetention.title')}
        </CardTitle>
        <CardDescription>{t('settings.chatRetention.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t('settings.chatRetention.keepMessages')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Select value={retention} onValueChange={handleRetentionChange} disabled={isUpdating}>
              <SelectTrigger className="w-[140px]">
                <SelectValue>{getRetentionLabel()}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(`settings.chatRetention.options.${option.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          {retention === "forever" 
            ? t('settings.chatRetention.foreverNote')
            : t('settings.chatRetention.retentionNote', { days: retention })
          }
        </p>
      </CardContent>
    </Card>
  );
}
