import { prisma } from "../../db/client.js";
import type { CreateCollectionInput, UpdateCollectionInput } from "./collections.schema.js";

// Every query is scoped to `teamId`: a row of another team behaves as if it did not exist.
export const collectionsService = {
  list(teamId: string) {
    return prisma.collection.findMany({ where: { teamId }, orderBy: { createdAt: "asc" } });
  },
  create(teamId: string, input: CreateCollectionInput) {
    return prisma.collection.create({ data: { name: input.name, teamId } });
  },
  rename(teamId: string, id: string, input: UpdateCollectionInput) {
    return prisma.collection.update({ where: { id, teamId }, data: { name: input.name } });
  },
  remove(teamId: string, id: string) {
    return prisma.collection.delete({ where: { id, teamId } });
  },
};
