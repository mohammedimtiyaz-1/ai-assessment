import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "tests/**", "playwright-report/**", "test-results/**"],
    setupFiles: [],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: false,
      exclude: [
        "node_modules/",
        ".next/",
        "coverage/",
        "playwright-report/",
        "test-results/",
        "src/**/__tests__/**",
        "src/components/ui/",
        "*.config.*",
        "*.test.ts",
        "*.test.tsx",
        "src/middleware.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
