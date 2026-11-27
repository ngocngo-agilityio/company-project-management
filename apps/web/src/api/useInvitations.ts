import { useQuery } from "@tanstack/react-query";
import { INVITATIONS_QUERY_KEY } from "../constants";
import { fetchInvitations } from "./client";

/** All invitations. Super Admin only: pass `enabled: false` for anyone else. */
export function useInvitations(enabled = true) {
  return useQuery({ queryKey: INVITATIONS_QUERY_KEY, queryFn: fetchInvitations, enabled });
}
