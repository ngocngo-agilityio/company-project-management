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
      proxy: {
        "/api": {
          target: `http://${host}:${port}`,
          rewrite: (path: string) => path.replace(/^\/api/, ""),
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
    },
  };
});
