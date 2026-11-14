import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Import i18n to trigger initialization
import "./i18n";
import { installTrialLimitInterceptor } from "./lib/trialLimitInterceptor";
import { captureAcquisitionSource, persistAcquisitionSource } from "./lib/acquisitionSource";
import { supabase } from "./integrations/supabase/client";

installTrialLimitInterceptor();
captureAcquisitionSource();
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    setTimeout(() => persistAcquisitionSource(session.user.id), 0);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
