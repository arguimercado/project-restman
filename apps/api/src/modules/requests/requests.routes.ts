import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../plugins/require-user.js";
import { upsertRequestSchema } from "./requests.schema.js";
import { requestsService } from "./requests.service.js";

export async function requestsRoutes(app: FastifyInstance) {
  app.get<{ Params: { collectionId: string } }>(
    "/collections/:collectionId/requests",
    async (request) =>
      requestsService.listByCollection(getCurrentUser(request).team.id, request.params.collectionId),
  );

  app.post<{ Params: { collectionId: string } }>(
    "/collections/:collectionId/requests",
    async (request, reply) => {
      const input = upsertRequestSchema.parse(request.body);
      const created = await requestsService.create(
        getCurrentUser(request).team.id,
        request.params.collectionId,
        input,
      );
      reply.status(201).send(created);
    },
  );

  app.get<{ Params: { id: string } }>("/requests/:id", async (request) =>
    requestsService.get(getCurrentUser(request).team.id, request.params.id),
  );

  app.patch<{ Params: { id: string } }>("/requests/:id", async (request) => {
    const input = upsertRequestSchema.parse(request.body);
    return requestsService.update(getCurrentUser(request).team.id, request.params.id, input);
  });

  app.delete<{ Params: { id: string } }>("/requests/:id", async (request, reply) => {
    await requestsService.remove(getCurrentUser(request).team.id, request.params.id);
    reply.status(204).send();
  });
}
