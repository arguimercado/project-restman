import type {
  AcceptInviteResult,
  CreateInvitePayload,
  ProjectInvite,
  ProjectInvitePreview,
} from "@restman/shared";
import { apiClient } from "../lib/apiClient";

export const invitationsApi = {
  list: (projectId: string) => apiClient.get<ProjectInvite[]>(`/projects/${projectId}/invites`),
  create: (projectId: string, payload: CreateInvitePayload) =>
    apiClient.post<ProjectInvite>(`/projects/${projectId}/invites`, payload),
  revoke: (projectId: string, inviteId: string) =>
    apiClient.delete<void>(`/projects/${projectId}/invites/${inviteId}`),
  preview: (token: string) => apiClient.get<ProjectInvitePreview>(`/invites/${token}`),
  accept: (token: string) => apiClient.post<AcceptInviteResult>(`/invites/${token}/accept`),
};
