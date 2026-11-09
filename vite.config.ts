// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    base: '/inertgasapp/', //
    plugins: [
      mcpPlugin(),
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        manifest: false,
        devOptions: { enabled: false },
        filename: "sw.js",
        workbox: {
          globPatterns: ["**/*.{js,css,png,svg,webmanifest}"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "pages",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 50 },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === "https://fonts.googleapis.com" ||
                url.origin === "https://fonts.gstatic.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "fonts", expiration: { maxEntries: 20 } },
            },
          ],
        },
      }),
    ],
  },
});
