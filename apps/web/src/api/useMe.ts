import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "./client";

export const ME_QUERY_KEY = ["me"] as const;

/** The signed-in person (`null` when there is no session). The session itself lives in the HttpOnly cookie. */
export function useMe() {
  return useQuery({ queryKey: ME_QUERY_KEY, queryFn: fetchMe, retry: false, staleTime: 30_000 });
}
