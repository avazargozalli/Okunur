import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/cli.ts", "src/data/**"],
      thresholds: {
        lines: 90,
        branches: 90,
      },
    },
  },
});
