export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export type AuthType = "none" | "bearer" | "basic" | "apiKey";

export interface AuthConfig {
  type: AuthType;
  bearer?: { token: string };
  basic?: { username: string; password: string };
  apiKey?: { key: string; value: string; addTo: "header" | "query" };
}

export type BodyType = "none" | "json" | "text" | "xml" | "html" | "form-urlencoded";

export interface BodyConfig {
  type: BodyType;
  content?: string;
  formFields?: KeyValue[];
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedRequest {
  id: string;
  collectionId: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: AuthConfig;
  body: BodyConfig;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExecuteRequestPayload {
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: AuthConfig;
  body: BodyConfig;
}

export interface ExecuteResponsePayload {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyIsJson: boolean;
  timeMs: number;
  sizeBytes: number;
}

/** Extension and MIME type of Restman's own collection file format. */
export const RESTMAN_FILE_EXTENSION = ".restman";
export const RESTMAN_MIME_TYPE = "application/x-restman";

export type ImportFormat = "restman" | "openapi";

export interface ImportResult {
  format: ImportFormat;
  collections: Collection[];
  requestCount: number;
  warnings: string[];
}

/** The signed-in developer with the company and team they belong to. */
export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Company role. */
  role: string;
  company: { id: string; name: string };
  team: { id: string; name: string };
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyName: string;
  teamName: string;
}

export type ProjectRole = "owner" | "member";

/** A project as seen by one of its members. */
export interface Project {
  id: string;
  name: string;
  description: string;
  /** The viewing user's role in the project. */
  role: ProjectRole;
  memberCount: number;
  collectionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
}
