import { z } from "zod";

export const methodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export const keyValueSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  enabled: z.boolean(),
});

export const authSchema = z.object({
  type: z.enum(["none", "bearer", "basic", "apiKey"]),
  bearer: z.object({ token: z.string() }).optional(),
  basic: z.object({ username: z.string(), password: z.string() }).optional(),
  apiKey: z
    .object({ key: z.string(), value: z.string(), addTo: z.enum(["header", "query"]) })
    .optional(),
});

export const bodySchema = z.object({
  type: z.enum(["none", "json", "text", "xml", "html", "form-urlencoded"]),
  content: z.string().optional(),
  formFields: z.array(keyValueSchema).optional(),
});
