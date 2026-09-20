import { Prisma } from "@prisma/client";
import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";

/** Prisma's "record not found" (`findFirstOrThrow`, or `update`/`delete` matching no row). */
function isNotFound(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | ZodError, _request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        error: "ValidationError",
        issues: error.issues,
      });
      return;
    }

    // A row that doesn't exist, or that belongs to another team, looks the same to the caller.
    if (isNotFound(error)) {
      reply.status(404).send({ error: "NotFound", message: "Not found" });
      return;
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      app.log.error(error);
    }

    reply.status(statusCode).send({
      error: statusCode === 500 ? "InternalServerError" : error.name,
      message: error.message,
    });
  });
}
