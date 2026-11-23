import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../lib/api";

export function ApiStatus() {
  const { status } = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: false });
  const text = { pending: "waking up…", success: "ok", error: "unreachable" }[status];
  return (
    <p role="status" className="text-body-small text-ink-muted">
      API: {text}
    </p>
  );
}
