import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { i18nInit } from "./i18n";

// Wait for i18n to initialize before rendering the app
i18nInit.then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
