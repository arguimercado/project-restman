import type { CurrentUser } from "@restman/shared";
import { apiClient } from "../lib/apiClient";

export const authApi = {
  me: () => apiClient.get<CurrentUser>("/auth/me"),
};
