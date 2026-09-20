import type { CurrentUser, RegisterPayload } from "@restman/shared";
import { apiClient } from "../lib/apiClient";

export const authApi = {
  /** Creates the developer, their company and their team. Public: needs no session. */
  register: (payload: RegisterPayload) => apiClient.post<CurrentUser>("/auth/register", payload),
  me: () => apiClient.get<CurrentUser>("/auth/me"),
};
