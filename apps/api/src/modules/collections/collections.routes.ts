import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../plugins/require-user.js";
import { createCollectionSchema, updateCollectionSchema } from "./collections.schema.js";
import { collectionsService } from "./collections.service.js";

export async function collectionsRoutes(app: FastifyInstance) {
  app.get<{ Params: { projectId: string } }>("/projects/:projectId/collections", async (request) =>
    collectionsService.list(getCurrentUser(request).id, request.params.projectId),
  );

  app.post<{ Params: { projectId: string } }>(
    "/projects/:projectId/collections",
    async (request, reply) => {
      const input = createCollectionSchema.parse(request.body);
      const collection = await collectionsService.create(
        getCurrentUser(request).id,
        request.params.projectId,
        input,
      );
      reply.status(201).send(collection);
    },
  );

  app.patch<{ Params: { id: string } }>("/collections/:id", async (request) => {
    const input = updateCollectionSchema.parse(request.body);
    return collectionsService.rename(getCurrentUser(request).id, request.params.id, input);
  });

  app.delete<{ Params: { id: string } }>("/collections/:id", async (request, reply) => {
    await collectionsService.remove(getCurrentUser(request).id, request.params.id);
    reply.status(204).send();
  });
}
