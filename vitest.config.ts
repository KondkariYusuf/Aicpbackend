import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"]
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["tests/setup-env.ts"],
    include: ["tests/**/*.test.ts"]
  }
});
