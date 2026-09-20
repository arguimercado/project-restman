import type { ExecuteRequestPayload, ExecuteResponsePayload } from "@restman/shared";
import { apiClient } from "../lib/apiClient";

export const executeApi = {
  send: (payload: ExecuteRequestPayload) =>
    apiClient.post<ExecuteResponsePayload>("/execute", payload),
};
