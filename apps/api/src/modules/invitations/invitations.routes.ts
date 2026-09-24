import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../plugins/require-user.js";
import { createInviteSchema } from "./invitations.schema.js";
import { invitationsService } from "./invitations.service.js";

export async function invitationsRoutes(app: FastifyInstance) {
  app.get<{ Params: { projectId: string } }>("/projects/:projectId/invites", async (request) =>
    invitationsService.list(getCurrentUser(request).id, request.params.projectId),
  );

  app.post<{ Params: { projectId: string } }>("/projects/:projectId/invites", async (request, reply) => {
    const input = createInviteSchema.parse(request.body);
    const invite = await invitationsService.invite(getCurrentUser(request).id, request.params.projectId, input);
    reply.status(201).send(invite);
  });

  app.delete<{ Params: { projectId: string; inviteId: string } }>(
    "/projects/:projectId/invites/:inviteId",
    async (request, reply) => {
      await invitationsService.revoke(
        getCurrentUser(request).id,
        request.params.projectId,
        request.params.inviteId,
      );
      reply.status(204).send();
    },
  );

  // Not project-scoped: the token alone identifies the invite, and the caller isn't a member yet.
  app.get<{ Params: { token: string } }>("/invites/:token", async (request) =>
    invitationsService.preview(request.params.token),
  );

  app.post<{ Params: { token: string } }>("/invites/:token/accept", async (request) => {
    const user = getCurrentUser(request);
    return invitationsService.accept(user.id, user.email, request.params.token);
  });
}
