import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    testTimeout: 30_000,
    env: {
      // Tests never touch real external services
      OPENAI_API_KEY: "",
      SPORTS_API_KEY: "",
    },
  },
});
