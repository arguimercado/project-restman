const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider | null = null;

/** Registers where session tokens come from (Clerk's `getToken`). Requests are unauthenticated until set. */
export function setTokenProvider(provider: TokenProvider | null) {
  tokenProvider = provider;
}

interface ErrorPayload {
  message?: string;
  issues?: { path: (string | number)[]; message: string }[];
}

function errorMessage(payload: ErrorPayload) {
  if (payload.message) return payload.message;
  // Validation errors carry `issues` instead of a message.
  if (payload.issues?.length) {
    return payload.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  }
  return "Request failed";
}

async function send(path: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers);
  const token = await tokenProvider?.();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    const payload: ErrorPayload = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new ApiError(response.status, errorMessage(payload));
  }
  return response;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Fastify rejects a JSON content-type on an empty body (e.g. DELETE), so only set it with one.
  const headers =
    options?.headers ?? (options?.body !== undefined ? { "Content-Type": "application/json" } : {});
  const response = await send(path, { ...options, headers });

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  postFile: <T>(path: string, file: Blob) =>
    request<T>(path, {
      method: "POST",
      body: file,
      headers: { "Content-Type": "application/octet-stream" },
    }),
  getBlob: async (path: string) => (await send(path)).blob(),
};
