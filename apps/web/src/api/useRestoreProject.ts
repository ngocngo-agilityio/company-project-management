import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PROJECTS_QUERY_KEY } from "../constants";
import { restoreProject } from "./client";

/** Restores an archived project, then refetches the list instead of editing it by hand. */
export function useRestoreProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
  });
}
