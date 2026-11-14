import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PricingModal } from "./PricingModal";

export function TrialEndedBanner() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <div role="status" className="sticky top-0 z-50 border-b border-gold/30 bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <Clock className="hidden h-5 w-5 shrink-0 text-gold sm:block" />
          <div className="min-w-0 flex-1">
            <p className="font-rajdhani text-base font-bold leading-tight">{t("trialEnded.title")}</p>
            <p className="text-sm text-muted-foreground">{t("trialEnded.description")}</p>
          </div>
          <Button variant="default" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
            {t("trialEnded.cta")}
          </Button>
        </div>
      </div>
      <PricingModal open={open} onOpenChange={setOpen} />
    </>
  );
}
