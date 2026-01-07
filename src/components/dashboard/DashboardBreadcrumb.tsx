import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface DashboardBreadcrumbProps {
  activeTab: string;
  activeSubTab: string;
}

const tabLabels: Record<string, string> = {
  coach: "dashboard.tabs.coach",
  deck: "dashboard.tabs.deck",
  stats: "dashboard.tabs.stats",
  social: "dashboard.tabs.social",
};

const subTabLabels: Record<string, string> = {
  overview: "dashboard.subtabs.overview",
  matches: "dashboard.subtabs.matches",
  current: "dashboard.subtabs.current",
  builder: "dashboard.subtabs.builder",
  collection: "dashboard.subtabs.collection",
  analytics: "dashboard.subtabs.analytics",
  leaderboard: "dashboard.subtabs.leaderboard",
  clans: "dashboard.subtabs.clans",
  tournaments: "dashboard.subtabs.tournaments",
};

export const DashboardBreadcrumb = ({ activeTab, activeSubTab }: DashboardBreadcrumbProps) => {
  const { t, ready } = useTranslation();

  // Return null while translations are loading
  if (!ready) {
    return null;
  }

  const tabLabel = t(tabLabels[activeTab] || activeTab);
  const subTabLabel = t(subTabLabels[activeSubTab] || activeSubTab);

  return (
    <Breadcrumb className="hidden md:flex mb-4">
      <BreadcrumbList className="text-sm">
        <BreadcrumbItem>
          <span className="text-primary font-medium">{tabLabel}</span>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage className="text-muted-foreground">{subTabLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};
