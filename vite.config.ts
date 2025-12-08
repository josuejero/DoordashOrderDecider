import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: "auto",
      registerType: "autoUpdate",
      includeAssets: [
        "offline.html",
        "ios-icon-180.png",
        "maskable-512.png",
      ],
      manifest: {
        id: "/",
        name: "DoorDash Order Decider",
        short_name: "Decider",
        description:
          "Offline-first DoorDash order accept/reject helper with analytics + ML hooks.",
        theme_color: "#111827",
        background_color: "#111827",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        categories: ["productivity", "finance", "navigation"],
        shortcuts: [
          {
            name: "Quick log",
            short_name: "Log offer",
            description: "Jump straight into entering an offer payout and ETA.",
            url: "/?payout=0&finish=00:00",
          },
          {
            name: "History",
            short_name: "History",
            description: "View synced history and analytics.",
            url: "/#history",
          },
        ],
        icons: [
          { src: "/ios-icon-180.png", sizes: "180x180", type: "image/png" },
          {
            src: "/maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
  }
});
