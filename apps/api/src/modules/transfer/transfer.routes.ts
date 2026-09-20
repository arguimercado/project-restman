import { RESTMAN_MIME_TYPE } from "@restman/shared";
import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../plugins/require-user.js";
import { ImportError } from "./restman-file.js";
import { transferService } from "./transfer.service.js";

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

export async function transferRoutes(app: FastifyInstance) {
  // Import bodies are raw file bytes. Scoped to this plugin so other routes keep JSON-only parsing.
  app.addContentTypeParser(
    "application/octet-stream",
    { parseAs: "buffer", bodyLimit: MAX_IMPORT_BYTES },
    (_request, body, done) => done(null, body),
  );

  app.get<{ Querystring: { ids?: string } }>("/export", async (request, reply) => {
    const ids = request.query.ids?.split(",").filter(Boolean);
    const file = await transferService.exportFile(getCurrentUser(request).team.id, ids);
    reply
      .header("Content-Type", RESTMAN_MIME_TYPE)
      .header("Cache-Control", "no-store")
      .send(file);
  });

  app.post("/import", { bodyLimit: MAX_IMPORT_BYTES }, async (request, reply) => {
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      throw new ImportError("The file is empty");
    }
    const result = await transferService.importFile(getCurrentUser(request).team.id, request.body);
    reply.status(201).send(result);
  });
}
