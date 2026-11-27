import { useMutation, useQueryClient } from "@tanstack/react-query";
import { INVITATIONS_QUERY_KEY } from "../constants";
import { createInvitation } from "./client";

/** Invites a person, then refetches the list instead of editing it by hand. */
export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_QUERY_KEY }),
  });
}
