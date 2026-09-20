import type { FastifyInstance } from "fastify";
import { executeRequestSchema } from "./execute.schema.js";
import { executeRequest } from "./execute.service.js";

export async function executeRoutes(app: FastifyInstance) {
  app.post("/execute", async (request) => {
    const input = executeRequestSchema.parse(request.body);
    return executeRequest(input);
  });
}
