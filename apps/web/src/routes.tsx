import { WEB_ROUTES } from "@board/shared";
import { Navigate, type RouteObject } from "react-router";
import { AppLayout, NotFound } from "./components";
import type { RouteHandle } from "./types";
import { RequireAuth } from "./components";
import { People } from "./pages/People";
import { ProjectBoard } from "./pages/ProjectBoard";
import { Projects } from "./pages/Projects";
import { SignIn } from "./pages/SignIn";

/** React Router child routes have no leading slash. */
const relative = (path: string) => path.replace(/^\//, "");

function handle(title: string): RouteHandle {
  return { title };
}

export const appRoutes: RouteObject[] = [
  { path: WEB_ROUTES.LOGIN, element: <SignIn /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: WEB_ROUTES.HOME,
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to={WEB_ROUTES.PROJECTS} replace /> },
          {
            path: relative(WEB_ROUTES.PROJECTS),
            handle: handle("Projects"),
            element: <Projects />,
          },
          {
            path: relative(WEB_ROUTES.PEOPLE),
            handle: handle("People"),
            element: <People />,
          },
          {
            path: relative(WEB_ROUTES.PROJECT),
            handle: handle("Project"),
            element: <ProjectBoard />,
          },
          { path: "*", handle: handle("Page not found"), element: <NotFound /> },
        ],
      },
    ],
  },
];
