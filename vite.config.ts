// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Habilita HTTPS local (com certificado auto-assinado) apenas quando HTTPS=true,
// permitindo testar recursos que exigem contexto seguro (camera) pelo IP da rede.
const useHttps = process.env.HTTPS === "true";

export default defineConfig({
  vite: {
    base: process.env.GITHUB_PAGES ? "/lajesfit/" : "/",
    plugins: useHttps ? [basicSsl()] : [],
  },
  nitro: {
    preset: "vercel",
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
