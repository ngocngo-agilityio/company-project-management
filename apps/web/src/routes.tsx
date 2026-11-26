import { WEB_ROUTES } from "@board/shared";
import { Navigate, type RouteObject } from "react-router";
import { AppLayout } from "./components/AppLayout";
import type { RouteHandle } from "./types/route-handle";
import { RequireAuth } from "./components/RequireAuth";
import { SignIn } from "./pages/SignIn";

function Placeholder({ text }: { text: string }) {
  return <p className="text-body text-ink-muted">{text}</p>;
}

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
            element: <Placeholder text="Your projects will appear here." />,
          },
          {
            path: relative(WEB_ROUTES.MY_CARDS),
            handle: handle("My cards"),
            element: <Placeholder text="Cards assigned to you will appear here." />,
          },
          {
            path: relative(WEB_ROUTES.PEOPLE),
            handle: handle("People"),
            element: <Placeholder text="People in your workspace will appear here." />,
          },
          { path: "*", handle: handle("Page not found"), element: <Placeholder text="This page does not exist." /> },
        ],
      },
    ],
  },
];
