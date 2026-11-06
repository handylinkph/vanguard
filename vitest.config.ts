import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/server-only-stub.ts") } },
  test: {
    projects: [
      { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" } },
      { extends: true, test: { name: "db", include: ["tests/db/**/*.test.ts"], globalSetup: ["tests/db/global-setup.ts"], fileParallelism: false, testTimeout: 30000 } },
    ],
  },
});
