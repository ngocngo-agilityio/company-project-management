import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PROJECTS_QUERY_KEY } from "../constants";
import { createProject } from "./client";

/** Creates a project, then refetches the list instead of editing it by hand. */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
  });
}
