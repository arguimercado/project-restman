import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { getCurrentUser } from "../../plugins/require-user.js";
import { registerSchema } from "./auth.schema.js";
import { authService } from "./auth.service.js";

/** Public routes: anyone may register, so this endpoint is rate limited per IP. */
export async function publicAuthRoutes(app: FastifyInstance) {
  
  await app.register(rateLimit, { global: false });

  app.post(
    "/auth/register",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = registerSchema.parse(request.body);
      const user = await authService.register(input, request.log);
      reply.status(201).send(user);
    },
  );
}

/** Routes for a signed-in, registered user. */
export async function protectedAuthRoutes(app: FastifyInstance) {
  app.get("/auth/me", async (request) => getCurrentUser(request));
}
