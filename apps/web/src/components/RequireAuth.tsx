import { Navigate, Outlet } from "react-router";
import { useMe } from "../api/useMe";
import { FullPageStatus } from "./FullPageStatus";

/** Guards private routes. Without a session the person goes to /login. This is only UX; the API checks too. */
export function RequireAuth() {
  const { data, isPending, isError, refetch } = useMe();
  if (isPending) return <FullPageStatus message="Checking your session…" />;
  if (isError) return <FullPageStatus message="We could not check your session." onRetry={() => void refetch()} />;
  if (data === null) return <Navigate to="/login" replace />;
  return <Outlet />;
}
