import type { Collection } from "@restman/shared";
import { apiClient } from "../lib/apiClient";

export const collectionsApi = {
  list: (projectId: string) => apiClient.get<Collection[]>(`/projects/${projectId}/collections`),
  create: (projectId: string, name: string) =>
    apiClient.post<Collection>(`/projects/${projectId}/collections`, { name }),
  remove: (id: string) => apiClient.delete<void>(`/collections/${id}`),
};
