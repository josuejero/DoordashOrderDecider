import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

const toBool = (value?: string) =>
  value === "1" || value?.toLowerCase() === "true";
const enforceCoverageThresholds =
  toBool(process.env.CI) || toBool(process.env.ENFORCE_COVERAGE);
const coverageThresholds = enforceCoverageThresholds
  ? {
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70,
      "src/lib/decision*.ts": {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
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
      "server/routes/analytics.ts": {
        lines: 80,
        functions: 80,
        branches: 50,
        statements: 80,
      },
      "server/db/analytics/**/*.ts": {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    }
  : undefined;
const coverageEnabled = process.env.DISABLE_COVERAGE !== "1";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [
      "./vitest.setup.ts",
      "./server/__tests__/setup.ts",
      "./src/setupTests.ts",
      "./src/__tests__/setup.ts",
    ],
    globals: true,
    exclude: [
      ...configDefaults.exclude,
      "e2e/**",
      "tests/**",
      "dist-server/**",
    ],
    watchExclude: [
      ...configDefaults.exclude,
      "**/coverage/**",
      "**/e2e/**",
      "**/tests/**",
      "**/dist-server/**",
    ],
    coverage: {
      enabled: coverageEnabled,
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
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
      thresholds: coverageThresholds,
    },
  },
});
