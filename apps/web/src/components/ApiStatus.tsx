import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api";
import { HEALTH_QUERY_KEY } from "../constants";
import { API_STATUS_MESSAGES } from "../constants";

export function ApiStatus() {
  const { status } = useQuery({ queryKey: HEALTH_QUERY_KEY, queryFn: fetchHealth, retry: false });
  const text = API_STATUS_MESSAGES[status];
  return (
    <p role="status" className="text-body-small text-ink-muted">
      API: {text}
    </p>
  );
}
