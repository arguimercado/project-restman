import { z } from "zod";
import { authSchema, bodySchema, keyValueSchema, methodSchema } from "../../schemas/http.js";

export const executeRequestSchema = z.object({
  method: methodSchema,
  url: z.string().min(1),
  params: z.array(keyValueSchema).default([]),
  headers: z.array(keyValueSchema).default([]),
  auth: authSchema.default({ type: "none" }),
  body: bodySchema.default({ type: "none" }),
});

export type ExecuteRequestInput = z.infer<typeof executeRequestSchema>;
