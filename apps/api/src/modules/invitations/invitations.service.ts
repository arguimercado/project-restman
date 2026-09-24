import { randomBytes } from "node:crypto";
import type { AcceptInviteResult, ProjectInvite, ProjectInvitePreview } from "@restman/shared";
import { prisma } from "../../db/client.js";
import { HttpError } from "../../errors.js";
import { assertProjectOwner } from "../projects/project-access.js";
import type { CreateInviteInput } from "./invitations.schema.js";

const INVITE_TTL_DAYS = 7;

const withInvitedBy = {
  invitedBy: { select: { firstName: true, lastName: true } },
} as const;

type InviteRow = Awaited<ReturnType<typeof create>>;

function serialize(row: InviteRow): ProjectInvite {
  return {
    id: row.id,
    projectId: row.projectId,
    email: row.email,
    token: row.token,
    status: row.status as ProjectInvite["status"],
    expiresAt: row.expiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    invitedBy: { firstName: row.invitedBy.firstName, lastName: row.invitedBy.lastName },
  };
}

async function create(projectId: string, invitedById: string, email: string) {
  return prisma.projectInvite.create({
    data: {
      projectId,
      email,
      invitedById,
      token: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
    include: withInvitedBy,
  });
}

export const invitationsService = {
  /** Pending invites for a project, for its owner to review or re-share. */
  async list(userId: string, projectId: string): Promise<ProjectInvite[]> {
    await assertProjectOwner(userId, projectId);
    const rows = await prisma.projectInvite.findMany({
      where: { projectId, status: "pending" },
      include: withInvitedBy,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(serialize);
  },

  /** Creates an invite for the given email. Owner-only. */
  async invite(userId: string, projectId: string, input: CreateInviteInput): Promise<ProjectInvite> {
    await assertProjectOwner(userId, projectId);

    const alreadyMember = await prisma.projectMember.findFirst({
      where: { projectId, user: { email: input.email } },
      select: { userId: true },
    });
    if (alreadyMember) throw new HttpError(409, "That developer is already a member of this project");

    const pending = await prisma.projectInvite.findFirst({
      where: { projectId, email: input.email, status: "pending" },
      select: { id: true },
    });
    if (pending) throw new HttpError(409, "There is already a pending invite for that email");

    return serialize(await create(projectId, userId, input.email));
  },

  /** Revokes a pending invite. Owner-only; revoking an already-used invite is a no-op. */
  async revoke(userId: string, projectId: string, inviteId: string): Promise<void> {
    await assertProjectOwner(userId, projectId);
    await prisma.projectInvite.updateMany({
      where: { id: inviteId, projectId, status: "pending" },
      data: { status: "revoked" },
    });
  },

  /** What the accept page shows before the invited developer commits — no membership check yet. */
  async preview(token: string): Promise<ProjectInvitePreview> {
    const invite = await prisma.projectInvite.findUnique({
      where: { token },
      include: {
        project: { select: { name: true } },
        invitedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!invite) throw new HttpError(404, "This invite link is invalid");

    const status: ProjectInvite["status"] =
      invite.status === "pending" && invite.expiresAt < new Date()
        ? "expired"
        : (invite.status as ProjectInvite["status"]);

    return {
      projectName: invite.project.name,
      email: invite.email,
      invitedBy: `${invite.invitedBy.firstName} ${invite.invitedBy.lastName}`,
      status,
    };
  },

  /** Adds the caller to the project and consumes the invite. Fails unless the emails match. */
  async accept(userId: string, userEmail: string, token: string): Promise<AcceptInviteResult> {
    const invite = await prisma.projectInvite.findUnique({ where: { token } });
    if (!invite) throw new HttpError(404, "This invite link is invalid");
    if (invite.status === "revoked") throw new HttpError(410, "This invite has been revoked");
    if (invite.status === "accepted") throw new HttpError(410, "This invite has already been used");
    if (invite.expiresAt < new Date()) throw new HttpError(410, "This invite has expired");
    if (invite.email !== userEmail.toLowerCase()) {
      throw new HttpError(403, "This invite was sent to a different email address");
    }

    await prisma.$transaction([
      prisma.projectMember.upsert({
        where: { projectId_userId: { projectId: invite.projectId, userId } },
        create: { projectId: invite.projectId, userId, role: invite.role },
        update: {},
      }),
      prisma.projectInvite.update({
        where: { id: invite.id },
        data: { status: "accepted", acceptedAt: new Date() },
      }),
    ]);

    return { projectId: invite.projectId };
  },
};
