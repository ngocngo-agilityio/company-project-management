import "@fontsource-variable/figtree";
import "@fontsource-variable/sora";
import type { Decorator, Preview } from "@storybook/react-vite";
import { useLayoutEffect } from "react";
import "./preview.css";

/** The a11y test projects set this at build time so each story is checked in one theme. */
declare const __STORY_THEME__: "light" | "dark" | undefined;
const forcedTheme = typeof __STORY_THEME__ === "undefined" ? undefined : __STORY_THEME__;

function ThemeSetter({ theme }: { theme: string }) {
  useLayoutEffect(() => {
    document.documentElement.dataset["theme"] = theme;
  }, [theme]);
  return null;
}

const withTheme: Decorator = (Story, context) => {
  const theme = forcedTheme ?? (context.globals["theme"] as string | undefined) ?? "light";
  return (
    <>
      <ThemeSetter theme={theme} />
      <Story />
    </>
  );
};

const preview: Preview = {
  tags: ["autodocs"],
  decorators: [withTheme],
  initialGlobals: { theme: "light" },
  globalTypes: {
    theme: {
      description: "Design System theme",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: "centered",
    // Any accessibility violation fails the story test (and so the pull request).
    a11y: { test: "error" },
  },
};

export default preview;
