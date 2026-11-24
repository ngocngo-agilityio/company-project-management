import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/** Same story checks, once per theme: the Design System has a light and a dark token set. */
function storybookProject(theme: "light" | "dark") {
  return {
    extends: true,
    define: { __STORY_THEME__: JSON.stringify(theme) },
    plugins: [storybookTest({ configDir: ".storybook" })],
    test: {
      name: `storybook-${theme}`,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: "chromium" as const }],
      },
    },
  };
}

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./src/test-setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      storybookProject("light"),
      storybookProject("dark"),
    ],
  },
});
