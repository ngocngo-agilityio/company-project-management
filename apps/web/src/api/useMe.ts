import { useQuery } from "@tanstack/react-query";
import { ME_QUERY_KEY } from "../constants/query-keys";
import { ME_STALE_TIME_MS } from "../constants/timing";
import { fetchMe } from "./client";

/** The signed-in person (`null` when there is no session). The session itself lives in the HttpOnly cookie. */
export function useMe() {
  return useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, retry: false, staleTime: ME_STALE_TIME_MS });
}
