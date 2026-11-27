import { useQuery } from "@tanstack/react-query";
import { ACTIVE_PEOPLE_QUERY_KEY } from "../constants";
import { fetchActivePeople } from "./client";

/** Active people, for the Owner picker. Super Admin only: pass `enabled: false` for anyone else. */
export function useActivePeople(enabled = true) {
  return useQuery({ queryKey: ACTIVE_PEOPLE_QUERY_KEY, queryFn: fetchActivePeople, enabled });
}
