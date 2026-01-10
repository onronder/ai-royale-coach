import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Eye, 
  Dna, 
  Swords, 
  Shield, 
  CreditCard, 
  Bug, 
  Gift, 
  Crown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ChangelogEntry {
  version: string;
  date: string;
  type: "feature" | "fix" | "security" | "announcement";
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  link?: string;
}

const changelog: ChangelogEntry[] = [
  {
    version: "2.5.0",
    date: "2026-01-10",
    type: "feature",
    titleKey: "changelog.entries.newTrial.title",
    descriptionKey: "changelog.entries.newTrial.description",
    icon: <Gift className="h-5 w-5" />,
    badgeVariant: "default",
    link: "/auth",
  },
  {
    version: "2.4.2",
    date: "2026-01-08",
    type: "security",
    titleKey: "changelog.entries.fraudPrevention.title",
    descriptionKey: "changelog.entries.fraudPrevention.description",
    icon: <Shield className="h-5 w-5" />,
    badgeVariant: "destructive",
  },
  {
    version: "2.4.1",
    date: "2026-01-05",
    type: "fix",
    titleKey: "changelog.entries.licensingFix.title",
    descriptionKey: "changelog.entries.licensingFix.description",
    icon: <Bug className="h-5 w-5" />,
    badgeVariant: "outline",
  },
  {
    version: "2.4.0",
    date: "2026-01-03",
    type: "feature",
    titleKey: "changelog.entries.paymentIntegration.title",
    descriptionKey: "changelog.entries.paymentIntegration.description",
    icon: <CreditCard className="h-5 w-5" />,
    badgeVariant: "default",
    link: "/settings",
  },
  {
    version: "2.3.0",
    date: "2025-12-20",
    type: "feature",
    titleKey: "changelog.entries.dreamArena.title",
    descriptionKey: "changelog.entries.dreamArena.description",
    icon: <Swords className="h-5 w-5" />,
    badgeVariant: "default",
    link: "/arena",
  },
  {
    version: "2.2.0",
    date: "2025-12-15",
    type: "feature",
    titleKey: "changelog.entries.proDna.title",
    descriptionKey: "changelog.entries.proDna.description",
    icon: <Dna className="h-5 w-5" />,
    badgeVariant: "default",
    link: "/dashboard?tab=analytics",
  },
  {
    version: "2.1.0",
    date: "2025-12-01",
    type: "feature",
    titleKey: "changelog.entries.oracle.title",
    descriptionKey: "changelog.entries.oracle.description",
    icon: <Eye className="h-5 w-5" />,
    badgeVariant: "default",
    link: "/oracle",
  },
  {
    version: "2.0.0",
    date: "2025-11-15",
    type: "announcement",
    titleKey: "changelog.entries.aiRoyalePro.title",
    descriptionKey: "changelog.entries.aiRoyalePro.description",
    icon: <Crown className="h-5 w-5" />,
    badgeVariant: "default",
  },
];

const getTypeBadge = (type: ChangelogEntry["type"], t: (key: string) => string) => {
  const config = {
    feature: { label: t("changelog.types.feature"), className: "bg-primary text-primary-foreground" },
    fix: { label: t("changelog.types.fix"), className: "bg-amber-500 text-white" },
    security: { label: t("changelog.types.security"), className: "bg-destructive text-destructive-foreground" },
    announcement: { label: t("changelog.types.announcement"), className: "bg-gold text-gold-foreground" },
  };
  return config[type];
};

export default function Changelog() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("changelog.meta.title")} | AI Royale</title>
        <meta name="description" content={t("changelog.meta.description")} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-card/30 flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{t("changelog.badge")}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {t("changelog.title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("changelog.subtitle")}
            </p>
          </motion.div>

          {/* Important Notices Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  <CardTitle className="text-amber-500">{t("changelog.notices.title")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{t("changelog.notices.licensing.title")}</p>
                    <p className="text-sm text-muted-foreground">{t("changelog.notices.licensing.description")}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{t("changelog.notices.fraud.title")}</p>
                    <p className="text-sm text-muted-foreground">{t("changelog.notices.fraud.description")}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{t("changelog.notices.trial.title")}</p>
                    <p className="text-sm text-muted-foreground">{t("changelog.notices.trial.description")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Changelog Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden md:block" />

            <div className="space-y-6">
              {changelog.map((entry, index) => {
                const typeBadge = getTypeBadge(entry.type, t);
                
                return (
                  <motion.div
                    key={entry.version}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Card className="ml-0 md:ml-14 relative hover:shadow-lg transition-shadow">
                      {/* Timeline dot */}
                      <div className="absolute -left-14 top-6 hidden md:flex items-center justify-center w-12 h-12 rounded-full bg-card border-2 border-border">
                        <div className={`p-2 rounded-full ${
                          entry.type === "feature" ? "bg-primary/10 text-primary" :
                          entry.type === "fix" ? "bg-amber-500/10 text-amber-500" :
                          entry.type === "security" ? "bg-destructive/10 text-destructive" :
                          "bg-gold/10 text-gold"
                        }`}>
                          {entry.icon}
                        </div>
                      </div>

                      <CardHeader>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <Badge variant="outline" className="font-mono">
                            v{entry.version}
                          </Badge>
                          <Badge className={typeBadge.className}>
                            {typeBadge.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                        </div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <span className="md:hidden">{entry.icon}</span>
                          {t(entry.titleKey)}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {t(entry.descriptionKey)}
                        </CardDescription>
                      </CardHeader>

                      {entry.link && (
                        <CardContent className="pt-0">
                          <Link
                            to={entry.link}
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <CheckCircle className="h-4 w-4" />
                            {t("changelog.tryFeature")}
                          </Link>
                        </CardContent>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 text-center"
          >
            <p className="text-muted-foreground mb-4">{t("changelog.cta.text")}</p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="h-5 w-5" />
              {t("changelog.cta.button")}
            </Link>
          </motion.div>
        </main>

        <Footer />
      </div>
    </>
  );
}
