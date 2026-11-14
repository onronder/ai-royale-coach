import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Import i18n to trigger initialization
import "./i18n";
import { installTrialLimitInterceptor } from "./lib/trialLimitInterceptor";

installTrialLimitInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
