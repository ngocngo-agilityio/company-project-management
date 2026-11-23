import { Navigate, type RouteObject } from "react-router";
import { AppLayout, type RouteHandle } from "./components/AppLayout";

function Placeholder({ text }: { text: string }) {
  return <p className="text-body text-ink-muted">{text}</p>;
}

function handle(title: string): RouteHandle {
  return { title };
}

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: "projects", handle: handle("Projects"), element: <Placeholder text="Your projects will appear here." /> },
      {
        path: "my-cards",
        handle: handle("My cards"),
        element: <Placeholder text="Cards assigned to you will appear here." />,
      },
      {
        path: "people",
        handle: handle("People"),
        element: <Placeholder text="People in your workspace will appear here." />,
      },
      { path: "*", handle: handle("Page not found"), element: <Placeholder text="This page does not exist." /> },
    ],
  },
];
