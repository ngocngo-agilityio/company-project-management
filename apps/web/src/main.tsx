import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router";
import { WEB_ROUTES } from "@board/shared";
import { createQueryClient } from "./api";
import { appRoutes } from "./routes";
import { writeSessionHint } from "./utils";
import "./index.css";

const router = createBrowserRouter(appRoutes);
const queryClient = createQueryClient(() => {
  writeSessionHint(false);
  void router.navigate(WEB_ROUTES.LOGIN, { replace: true });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
