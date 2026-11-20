import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Check, Copy, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BLACK_FRIDAY, isBlackFridayActive, timeLeft } from "@/lib/campaign";

const DISMISS_KEY = "bf2026-strip-dismissed";

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

function CodeChip({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(BLACK_FRIDAY.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  return (
    <button type="button" onClick={copy} aria-label={t("campaign.copy")}
      className={`inline-flex items-center gap-2 rounded-md border border-dashed border-gold/70 bg-gold/10 font-mono font-bold tracking-widest text-gold transition-colors hover:bg-gold/20 ${compact ? "px-2 py-0.5 text-xs" : "px-4 py-2 text-base md:text-lg"}`}>
      {BLACK_FRIDAY.code}
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 opacity-70" />}
      {!compact && <span className="sr-only">{copied ? t("campaign.copied") : t("campaign.copy")}</span>}
    </button>
  );
}

function Countdown({ now }: { now: number }) {
  const { t } = useTranslation();
  const l = timeLeft(now);
  const units = [[l.days, t("campaign.d")], [l.hours, t("campaign.h")], [l.minutes, t("campaign.m")], [l.seconds, t("campaign.s")]] as const;
  return (
    <div className="flex items-center gap-2" aria-label={t("campaign.endsIn")}>
      {units.map(([v, u], i) => (
        <div key={i} className="min-w-[3.25rem] rounded-lg border border-border/60 bg-background/60 px-2 py-1.5 text-center">
          <div className="font-rajdhani text-2xl font-bold tabular-nums leading-none text-foreground">{String(v).padStart(2, "0")}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{u}</div>
        </div>
      ))}
    </div>
  );
}

/** Large landing-page hero banner. */
export function BlackFridayHero({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation();
  const now = useNow();
  if (!isBlackFridayActive(now)) return null;
  return (
    <section className="relative overflow-hidden border-b border-gold/30 bg-gradient-to-br from-background via-card to-background">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="container relative mx-auto flex flex-col items-center gap-6 px-4 py-8 md:flex-row md:justify-between md:py-10">
        <div className="text-center md:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-background">
            <Flame className="h-3.5 w-3.5" /> {t("campaign.badge")}
          </span>
          <h2 className="mt-3 font-rajdhani text-4xl font-bold uppercase leading-none text-foreground md:text-6xl">
            <span className="bg-gradient-to-r from-gold to-accent bg-clip-text text-transparent">{t("campaign.title")}</span>
          </h2>
          <p className="mt-2 text-muted-foreground md:text-lg">{t("campaign.subtitle")}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <span className="text-sm text-muted-foreground">{t("campaign.code")}</span>
            <CodeChip />
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">{t("campaign.endsIn")}</span>
          <Countdown now={now} />
          <Button asChild size="lg" className="w-full bg-gold font-bold text-background hover:bg-gold/90">
            <Link to={signedIn ? "/dashboard" : "/auth"}>{t("campaign.cta")}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Thin dismissible strip for the signed-in app. */
export function BlackFridayStrip() {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; } });
  if (hidden || !isBlackFridayActive()) return null;
  return (
    <div className="relative flex items-center justify-center gap-2 border-b border-gold/30 bg-gradient-to-r from-gold/15 via-accent/10 to-gold/15 px-10 py-1.5 text-center text-xs md:text-sm">
      <Flame className="hidden h-4 w-4 shrink-0 text-gold sm:block" />
      <span className="font-semibold text-foreground">{t("campaign.strip")}</span>
      <CodeChip compact />
      <button type="button" aria-label={t("campaign.dismiss")} className="absolute right-2 rounded p-1 text-muted-foreground hover:text-foreground"
        onClick={() => { setHidden(true); try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } }}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Highlight inside the pricing dialog. */
export function BlackFridayPricingNote() {
  const { t } = useTranslation();
  if (!isBlackFridayActive()) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-gold/50 bg-gold/10 p-3 text-center sm:flex-row sm:justify-between sm:text-left">
      <div>
        <div className="font-rajdhani text-lg font-bold uppercase text-gold">{t("campaign.badge")} · {t("campaign.title")}</div>
        <div className="text-xs text-muted-foreground">{t("campaign.subtitle")}</div>
      </div>
      <CodeChip compact />
    </div>
  );
}
