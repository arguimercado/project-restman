import type { Project } from "@restman/shared";
import { apiClient } from "../lib/apiClient";

export const projectsApi = {
  list: () => apiClient.get<Project[]>("/projects"),
  get: (id: string) => apiClient.get<Project>(`/projects/${id}`),
};
