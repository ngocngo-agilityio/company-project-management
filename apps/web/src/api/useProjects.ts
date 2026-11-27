import { useQuery } from "@tanstack/react-query";
import { PROJECTS_QUERY_KEY } from "../constants";
import { fetchProjects } from "./client";

/** Projects of the signed-in person. */
export function useProjects() {
  return useQuery({ queryKey: PROJECTS_QUERY_KEY, queryFn: fetchProjects });
}
