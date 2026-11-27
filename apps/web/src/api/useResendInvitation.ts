import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVITATIONS_QUERY_KEY } from "../constants";
import { resendInvitation } from "./client";

/** Starts 14 more days for an invitation. Refetches on success and on a 409, so the list shows the real status. */
export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resendInvitation,
    onSettled: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY }),
  });
}
