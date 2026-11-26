import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/generated/**", "**/storybook-static/**", "**/coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["apps/web/**", "packages/ui/**"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: reactHooks.configs.recommended.rules,
  },
  // web and backend must not import each other; share code via @board/shared
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@board/backend", "@board/backend/*", "**/apps/backend/**", "../**/backend/**"],
        },
      ],
    },
  },
  {
    files: ["apps/backend/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["@board/web", "@board/web/*", "**/apps/web/**", "../**/web/**"],
        },
      ],
    },
  },
  // must stay last: turns off ESLint rules that conflict with Prettier
  prettier,
);
