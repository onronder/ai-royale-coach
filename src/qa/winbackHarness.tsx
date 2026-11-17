// TEMPORARY QA harness (removed after screenshots).
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import "../index.css";
import i18n from "../i18n";
import { WinbackCampaignPanel } from "@/components/admin/WinbackCampaignPanel";
const lang = new URLSearchParams(location.search).get("lang") ?? "en";
i18n.changeLanguage(lang);
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={new QueryClient()}><TooltipProvider><div className="p-4 bg-background min-h-screen"><WinbackCampaignPanel /></div></TooltipProvider></QueryClientProvider>);
