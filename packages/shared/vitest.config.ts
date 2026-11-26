import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.stories.tsx",
        "src/**/test-setup.ts",
        "src/generated/**",
        "src/**/index.ts",
      ],
    },
  },
});
