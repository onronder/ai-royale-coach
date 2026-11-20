import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import i18n, { i18nInit } from "./i18n";
import { captureAcquisitionSource, persistAcquisitionSource } from "./lib/acquisitionSource";
import { supabase } from "./integrations/supabase/client";

captureAcquisitionSource();
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    setTimeout(() => persistAcquisitionSource(session.user.id), 0);
  }
});

void i18nInit.then(() => {
  if (!i18n.hasResourceBundle(i18n.resolvedLanguage || 'en', 'translation')) throw new Error('Translations unavailable');
  createRoot(document.getElementById("root")!).render(<App />);
}).catch(() => {
  const root = document.getElementById('root')!;
  root.textContent = 'Unable to load the application. ';
  const retry = document.createElement('button');
  retry.textContent = 'Reload'; retry.onclick = () => window.location.reload(); root.append(retry);
});
