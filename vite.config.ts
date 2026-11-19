import { defineConfig, loadEnv } from "vite";
import { validateBackendEnvironment } from "./src/lib/backendEnvironment";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
  validateBackendEnvironment(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_PROJECT_ID, env.VITE_SUPABASE_PUBLISHABLE_KEY!);
  return ({
  server: {
    host: "::",
    port: 8080,
  },
  esbuild: {
    // Strip console.log in production, keep console.error/warn for debugging
    pure: mode === 'production' ? ['console.log'] : [],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
});
