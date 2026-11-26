import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api/client";
import { HEALTH_QUERY_KEY } from "../constants/query-keys";
import { API_STATUS_MESSAGES } from "../constants/status-messages";

export function ApiStatus() {
  const { status } = useQuery({ queryKey: HEALTH_QUERY_KEY, queryFn: fetchHealth, retry: false });
  const text = API_STATUS_MESSAGES[status];
  return (
    <p role="status" className="text-body-small text-ink-muted">
      API: {text}
    </p>
  );
}
