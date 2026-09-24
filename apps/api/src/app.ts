import cors from "@fastify/cors";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { protectedAuthRoutes, publicAuthRoutes } from "./modules/auth/auth.routes.js";
import { collectionsRoutes } from "./modules/collections/collections.routes.js";
import { executeRoutes } from "./modules/execute/execute.routes.js";
import { invitationsRoutes } from "./modules/invitations/invitations.routes.js";
import { projectsRoutes } from "./modules/projects/projects.routes.js";
import { requestsRoutes } from "./modules/requests/requests.routes.js";
import { transferRoutes } from "./modules/transfer/transfer.routes.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { requireUser } from "./plugins/require-user.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: (origin, cb) => {
      // No Origin header (non-browser clients), or an allow-listed one. A packaged Electron app
      // loaded over file:// sends the literal string "null" as its Origin.
      if (!origin || origin === "null" || env.corsOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("Not allowed by CORS"), false);
    },
  });
  registerErrorHandler(app);

  app.get("/health", async () => ({ status: "ok" }));

  app.register(
    async (instance) => {
      // Public: registration is the only route usable without a session.
      await instance.register(publicAuthRoutes);

      // Everything else needs a signed-in, registered user.
      await instance.register(async (protectedScope) => {
        requireUser(protectedScope);
        await protectedScope.register(protectedAuthRoutes);
        await protectedScope.register(projectsRoutes);
        await protectedScope.register(invitationsRoutes);
        await protectedScope.register(collectionsRoutes);
        await protectedScope.register(requestsRoutes);
        await protectedScope.register(executeRoutes);
        await protectedScope.register(transferRoutes);
      });
    },
    { prefix: "/api" },
  );

  return app;
}
