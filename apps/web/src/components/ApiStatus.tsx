import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api/client";
import { API_STATUS_MESSAGES } from "../messages";

export function ApiStatus() {
  const { status } = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: false });
  const text = API_STATUS_MESSAGES[status];
  return (
    <p role="status" className="text-body-small text-ink-muted">
      API: {text}
    </p>
  );
}
