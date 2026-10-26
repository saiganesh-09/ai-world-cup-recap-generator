import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: { provider: "v8", include: ["services/**", "lib/**"] },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
