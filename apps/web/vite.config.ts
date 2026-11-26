import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // Same repo-root .env the backend reads, so the proxy follows its PORT/HOST.
  const rootDir = fileURLToPath(new URL("../..", import.meta.url));
  const env = loadEnv(mode, rootDir, "");
  const bindHost = env.HOST || "127.0.0.1";
  // Wildcard bind addresses are not connectable; target loopback instead. Bracket IPv6 literals.
  const connectHost = bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost === "::" ? "::1" : bindHost;
  const host = connectHost.includes(":") && !connectHost.startsWith("[") ? `[${connectHost}]` : connectHost;
  const port = env.PORT || "3000";

  return {
    // VITE_* variables (e.g. VITE_API_URL) come from the repo-root .env too.
    envDir: rootDir,
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      // Same paths as production (/health, /api/*, /auth/*), so the session cookie stays on one origin.
      proxy: Object.fromEntries(["/health", "/api", "/auth"].map((path) => [path, `http://${host}:${port}`])),
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      exclude: ["e2e/**", "node_modules/**", "dist/**"],
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
  };
});
