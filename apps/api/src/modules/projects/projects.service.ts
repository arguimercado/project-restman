import type { Project } from "@restman/shared";
import { prisma } from "../../db/client.js";
import { memberOf } from "./project-access.js";
import type { CreateProjectInput } from "./projects.schema.js";

/** Loads a project together with the caller's own membership and the member/collection counts. */
const withCounts = (userId: string) =>
  ({
    members: { where: { userId }, select: { role: true } },
    _count: { select: { members: true, collections: true } },
  }) as const;

type ProjectRow = Awaited<ReturnType<typeof loadOne>>;

function loadOne(userId: string, id: string) {
  return prisma.project.findFirstOrThrow({
    where: { id, ...memberOf(userId) },
    include: withCounts(userId),
  });
}

function serialize(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    role: row.members[0]?.role === "owner" ? "owner" : "member",
    memberCount: row._count.members,
    collectionCount: row._count.collections,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const projectsService = {
  /** The projects the user is a member of, newest first. */
  async list(userId: string): Promise<Project[]> {
    const rows = await prisma.project.findMany({
      where: memberOf(userId),
      include: withCounts(userId),
      orderBy: { createdAt: "desc" },
    });
    return rows.map(serialize);
  },

  async get(userId: string, id: string): Promise<Project> {
    return serialize(await loadOne(userId, id));
  },

  /** Creates the project and makes the creator its owner. */
  async create(userId: string, input: CreateProjectInput): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        members: { create: { userId, role: "owner" } },
      },
      select: { id: true },
    });
    return serialize(await loadOne(userId, project.id));
  },
};
