import { createClerkClient } from "@clerk/backend";
import { env } from "../config/env.js";

export const clerkClient = createClerkClient({
  secretKey: env.clerkSecretKey,
  publishableKey: env.clerkPublishableKey,
  jwtKey: env.clerkJwtKey,
});
