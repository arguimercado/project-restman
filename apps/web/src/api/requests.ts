import type { AuthConfig, BodyConfig, HttpMethod, KeyValue, SavedRequest } from "@restman/shared";
import { apiClient } from "../lib/apiClient";

export interface RequestInput {
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: AuthConfig;
  body: BodyConfig;
}

export const requestsApi = {
  listByCollection: (collectionId: string) =>
    apiClient.get<SavedRequest[]>(`/collections/${collectionId}/requests`),
  get: (id: string) => apiClient.get<SavedRequest>(`/requests/${id}`),
  create: (collectionId: string, input: RequestInput) =>
    apiClient.post<SavedRequest>(`/collections/${collectionId}/requests`, input),
  update: (id: string, input: RequestInput) =>
    apiClient.patch<SavedRequest>(`/requests/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/requests/${id}`),
};
