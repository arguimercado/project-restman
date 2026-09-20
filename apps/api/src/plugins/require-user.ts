import type { CurrentUser } from "@restman/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { clerkClient } from "../auth/clerk.js";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import { HttpError } from "../errors.js";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: CurrentUser | null;
  }
}

/** The authenticated user of a request. Only valid on routes registered behind `requireUser`. */
export function getCurrentUser(request: FastifyRequest): CurrentUser {
  if (!request.currentUser) throw new HttpError(401, "Sign in to continue");
  return request.currentUser;
}

// Clerk verifies a plain Web `Request`. Only the bearer token is forwarded: cookies are ignored so
// the API never takes part in Clerk's browser handshake and always answers 401, never a redirect.
function toWebRequest(request: FastifyRequest) {
  const headers = new Headers();
  if (request.headers.authorization) headers.set("authorization", request.headers.authorization);
  return new Request(`${request.protocol}://${request.hostname}${request.url}`, {
    method: request.method,
    headers,
  });
}

async function authenticate(request: FastifyRequest) {
  const state = await clerkClient.authenticateRequest(toWebRequest(request), {
    acceptsToken: "session_token",
    authorizedParties: [env.corsOrigin],
    jwtKey: env.clerkJwtKey,
  });

  const auth = state.isAuthenticated ? state.toAuth() : null;
  if (!auth?.userId) throw new HttpError(401, "Sign in to continue");

  const user = await prisma.user.findUnique({
    where: { clerkUserId: auth.userId },
    include: { company: true, team: true },
  });
  // A Clerk account created outside our registration flow has no profile and no company/team.
  if (!user) {
    throw new HttpError(403, "This account is not registered. Register your company and team first.");
  }

  request.currentUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    company: { id: user.company.id, name: user.company.name },
    team: { id: user.team.id, name: user.team.name },
  };
}

/** Requires a signed-in, registered user for every route of the given (encapsulated) instance. */
export function requireUser(app: FastifyInstance) {
  app.decorateRequest("currentUser", null);
  app.addHook("preHandler", authenticate);
}
