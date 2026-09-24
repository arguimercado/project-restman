import { prisma } from "../../db/client.js";
import { HttpError } from "../../errors.js";

/**
 * Prisma filter for "projects this user is a member of". Every project-scoped query includes it, so
 * a project the caller isn't a member of behaves as if it did not exist (404, never 403).
 */
export function memberOf(userId: string) {
  return { members: { some: { userId } } };
}

/** Throws Prisma's not-found (mapped to 404) unless the user is a member of the project. */
export async function assertProjectMember(userId: string, projectId: string) {
  await prisma.project.findFirstOrThrow({
    where: { id: projectId, ...memberOf(userId) },
    select: { id: true },
  });
}

/**
 * Not a member: 404 (same as `assertProjectMember`). A member but not the owner: 403 — owner-only
 * actions (inviting, revoking) should say so rather than pretending the project doesn't exist.
 */
export async function assertProjectOwner(userId: string, projectId: string) {
  const membership = await prisma.projectMember.findUniqueOrThrow({
    where: { projectId_userId: { projectId, userId } },
  });
  if (membership.role !== "owner") {
    throw new HttpError(403, "Only the project owner can do this");
  }
}
