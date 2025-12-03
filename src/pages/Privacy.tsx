import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Database, Eye, Clock, Users, Mail } from "lucide-react";

const Privacy = () => {
  const { t } = useTranslation();

  const sections = [
    {
      icon: ShieldCheck,
      title: t("legal.privacy.noSensitiveData.title"),
      content: t("legal.privacy.noSensitiveData.content"),
    },
    {
      icon: Database,
      title: t("legal.privacy.dataWeCollect.title"),
      content: t("legal.privacy.dataWeCollect.content"),
    },
    {
      icon: Eye,
      title: t("legal.privacy.howWeUseData.title"),
      content: t("legal.privacy.howWeUseData.content"),
    },
    {
      icon: Clock,
      title: t("legal.privacy.dataRetention.title"),
      content: t("legal.privacy.dataRetention.content"),
    },
    {
      icon: Users,
      title: t("legal.privacy.thirdParty.title"),
      content: t("legal.privacy.thirdParty.content"),
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={null} />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {t("legal.privacyPolicy")}
          </h1>
          <p className="text-muted-foreground">
            {t("legal.lastUpdated")}: December 3, 2025
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            {t("legal.privacy.companyName")}
          </p>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              {t("legal.privacy.introduction")}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <section.icon className="h-5 w-5 text-primary" />
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

        {/* KVKK Compliance Section */}
        <Card className="border-primary/30 bg-primary/5 backdrop-blur-sm mt-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              {t("legal.privacy.kvkk.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {t("legal.privacy.kvkk.content")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm mt-8">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              {t("legal.privacy.contact.title")}
            </h3>
            <p className="text-muted-foreground">
              {t("legal.privacy.contact.content")}
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

export default Privacy;
