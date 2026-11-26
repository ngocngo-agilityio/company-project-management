import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "./client";

export const ME_QUERY_KEY = ["me"] as const;

/** How long the answer counts as fresh before it is fetched again. */
const ME_STALE_TIME_MS = 30_000;

/** The signed-in person (`null` when there is no session). The session itself lives in the HttpOnly cookie. */
export function useMe() {
  return useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, retry: false, staleTime: ME_STALE_TIME_MS });
}
