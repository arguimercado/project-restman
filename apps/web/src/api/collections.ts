import type { Collection } from "@restman/shared";
import { apiClient } from "../lib/apiClient";

export const collectionsApi = {
  list: () => apiClient.get<Collection[]>("/collections"),
  create: (name: string) => apiClient.post<Collection>("/collections", { name }),
  rename: (id: string, name: string) =>
    apiClient.patch<Collection>(`/collections/${id}`, { name }),
  remove: (id: string) => apiClient.delete<void>(`/collections/${id}`),
};
