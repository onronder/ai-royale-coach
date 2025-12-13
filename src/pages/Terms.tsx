import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, AlertTriangle, Scale, Globe, Building2 } from "lucide-react";

const Terms = () => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: Building2,
      title: t("legal.terms.affiliationDisclaimer.title"),
      content: t("legal.terms.affiliationDisclaimer.content"),
      highlight: true,
    },
    {
      icon: FileText,
      title: t("legal.terms.serviceDescription.title"),
      content: t("legal.terms.serviceDescription.content"),
    },
    {
      icon: Shield,
      title: t("legal.terms.dataProcessing.title"),
      content: t("legal.terms.dataProcessing.content"),
    },
    {
      icon: AlertTriangle,
      title: t("legal.terms.aiDisclaimer.title"),
      content: t("legal.terms.aiDisclaimer.content"),
      highlight: true,
    },
    {
      icon: Scale,
      title: t("legal.terms.liability.title"),
      content: t("legal.terms.liability.content"),
    },
    {
      icon: Globe,
      title: t("legal.terms.governingLaw.title"),
      content: t("legal.terms.governingLaw.content"),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Terms of Service - AI Royale</title>
        <meta name="description" content="AI Royale Terms of Service. Read our terms and conditions for using the AI-powered Clash Royale coaching platform." />
        <link rel="canonical" href="https://ai-royale.com/terms" />
        <meta property="og:title" content="Terms of Service - AI Royale" />
        <meta property="og:description" content="AI Royale Terms of Service. Read our terms and conditions for using the platform." />
        <meta property="og:url" content="https://ai-royale.com/terms" />
      </Helmet>
      <Navbar user={null} />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t("legal.termsOfService")}
          </h1>
          <p className="text-muted-foreground">
            {t("legal.lastUpdated")}: December 6, 2025
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            {t("legal.terms.companyName")}
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              {t("legal.terms.introduction")}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <Card 
              key={index} 
              className={`border-border/50 backdrop-blur-sm ${
                section.highlight 
                  ? 'bg-destructive/5 border-destructive/30' 
                  : 'bg-card/50'
              }`}
            >
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className={`p-2 rounded-lg ${
                    section.highlight 
                      ? 'bg-destructive/10' 
                      : 'bg-primary/10'
                  }`}>
                    <section.icon className={`h-5 w-5 ${
                      section.highlight 
                        ? 'text-destructive' 
                        : 'text-primary'
                    }`} />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {section.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm mt-8">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-3">
              {t("legal.terms.contact.title")}
            </h3>
            <p className="text-muted-foreground">
              {t("legal.terms.contact.content")}
            </p>
            <p className="text-primary mt-2">
              Fittechs Yazılım Anonim Şirketi
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
