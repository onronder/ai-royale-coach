import { defineConfig, loadEnv } from "vite";
import { validateBackendEnvironment } from "./src/lib/backendEnvironment";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { execFileSync } from "node:child_process";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
  validateBackendEnvironment(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_PROJECT_ID, env.VITE_SUPABASE_PUBLISHABLE_KEY!);
  let revision = process.env.GITHUB_SHA || 'unknown';
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim()) revision += '-dirty';
  } catch { /* source archive */ }
  return ({
  define: { 'import.meta.env.VITE_APP_REVISION': JSON.stringify(revision) },
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
