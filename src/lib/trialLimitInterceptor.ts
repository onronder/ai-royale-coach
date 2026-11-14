import { toast } from "sonner";
import i18n from "@/i18n";

/**
 * Watches backend function responses and shows a localized toast when a
 * trial user hits the shared "1 AI analysis per 24 hours" limit.
 */
export function installTrialLimitInterceptor() {
  if (typeof window === "undefined" || (window as any).__trialLimitInstalled) return;
  (window as any).__trialLimitInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
      if (response.status === 429 && url.includes("/functions/v1/")) {
        const body = await response.clone().json().catch(() => null);
        if (body?.trial_limit) {
          const time = body.next_available_at
            ? new Date(body.next_available_at).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" })
            : "";
          toast.error(i18n.t("trialLimit.title"), {
            id: "trial-limit",
            description: i18n.t("trialLimit.description", { time }),
            duration: 10000,
            action: { label: i18n.t("trialLimit.cta"), onClick: () => { window.location.href = "/settings"; } },
          });
        }
      }
    } catch {
      // never break the original request
    }
    return response;
  };
}
