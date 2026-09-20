import { prisma } from "../../db/client.js";
import { assertProjectMember, memberOf } from "../projects/project-access.js";
import type { CreateCollectionInput, UpdateCollectionInput } from "./collections.schema.js";

// Every query is scoped to projects `userId` is a member of: a collection of any other project
// behaves as if it did not exist.
export const collectionsService = {
  list(userId: string, projectId: string) {
    return prisma.collection.findMany({
      where: { projectId, project: memberOf(userId) },
      orderBy: { createdAt: "asc" },
    });
  },
  async create(userId: string, projectId: string, input: CreateCollectionInput) {
    await assertProjectMember(userId, projectId);
    return prisma.collection.create({ data: { name: input.name, projectId } });
  },
  rename(userId: string, id: string, input: UpdateCollectionInput) {
    return prisma.collection.update({
      where: { id, project: memberOf(userId) },
      data: { name: input.name },
    });
  },
  remove(userId: string, id: string) {
    return prisma.collection.delete({ where: { id, project: memberOf(userId) } });
  },
};
