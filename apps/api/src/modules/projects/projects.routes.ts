import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../plugins/require-user.js";
import { createProjectSchema } from "./projects.schema.js";
import { projectsService } from "./projects.service.js";

export async function projectsRoutes(app: FastifyInstance) {
  app.get("/projects", async (request) => projectsService.list(getCurrentUser(request).id));

  app.post("/projects", async (request, reply) => {
    const input = createProjectSchema.parse(request.body);
    const project = await projectsService.create(getCurrentUser(request).id, input);
    reply.status(201).send(project);
  });

  app.get<{ Params: { projectId: string } }>("/projects/:projectId", async (request) =>
    projectsService.get(getCurrentUser(request).id, request.params.projectId),
  );
}
