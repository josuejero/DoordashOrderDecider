import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [
      "./src/setupTests.ts",
      "./src/__tests__/setup.ts", // Add this line
    ],
    globals: true,
    coverage: {
      // Turn coverage on when you run vitest with --coverage
      enabled: true,
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",

      // Focus coverage on the Phase 2 areas
      include: [
        "src/lib/decision.ts",
        "src/lib/decisionExplanation.ts",
        "src/lib/history*.ts",
        "src/lib/analyticsApi.ts",
        "src/hooks/useAnalyticsData.ts",
        "src/components/AnalyticsDashboard.tsx",
        "src/components/analytics/**/*.tsx",
        "server/routes/analytics.ts",
        "server/db/analytics/**/*.ts",
      ],

      // Global floor plus stricter thresholds for key areas
      thresholds: {
        // global minimums
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,

        // decision engine
        "src/lib/decision*.ts": {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },

        // history + analytics helpers
        "src/lib/history*.ts": {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85,
        },
        "src/lib/analyticsApi.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
        "src/hooks/useAnalyticsData.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },

        // analytics endpoints & DB
        "server/routes/analytics.ts": {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
        "server/db/analytics/**/*.ts": {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
      },
    },
  },
});
