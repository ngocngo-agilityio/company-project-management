import { useQuery } from "@tanstack/react-query";
import { ME_QUERY_KEY } from "../constants";
import { ME_STALE_TIME_MS } from "../constants";
import { writeSessionHint } from "../utils";
import { fetchMe } from "./client";

/** Asks the API, then keeps the "had a session" hint in step. A failed request leaves the hint alone. */
async function fetchMeAndRememberSession() {
  const me = await fetchMe();
  writeSessionHint(me !== null);
  return me;
}

/** The signed-in person (`null` when there is no session). The session itself lives in the HttpOnly cookie. */
export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchMeAndRememberSession,
    retry: false,
    staleTime: ME_STALE_TIME_MS,
  });
}
