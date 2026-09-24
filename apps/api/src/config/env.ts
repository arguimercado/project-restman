// Load apps/api/.env before anything reads process.env. Prisma loads it too, but only when its
// client is first imported, which happens after this module is evaluated.
try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy apps/api/.env.example to apps/api/.env and fill it in (Clerk keys: dashboard.clerk.com > API keys).`,
    );
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  /** Comma-separated in .env: the web dev server, plus any other UI (e.g. the desktop app) that calls this API. */
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  clerkSecretKey: required("CLERK_SECRET_KEY"),
  clerkPublishableKey: required("CLERK_PUBLISHABLE_KEY"),
  /** Optional PEM public key. When set, session tokens are verified without a network call. */
  clerkJwtKey: process.env.CLERK_JWT_KEY || undefined,
};
