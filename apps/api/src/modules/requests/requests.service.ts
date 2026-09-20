import type { Request as RequestRow } from "@prisma/client";
import { prisma } from "../../db/client.js";
import type { UpsertRequestInput } from "./requests.schema.js";

export function serialize(row: RequestRow) {
  return {
    id: row.id,
    collectionId: row.collectionId,
    name: row.name,
    method: row.method,
    url: row.url,
    params: JSON.parse(row.paramsJson),
    headers: JSON.parse(row.headersJson),
    auth: JSON.parse(row.authJson),
    body: JSON.parse(row.bodyJson),
    order: row.order,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// A request belongs to a team through its collection. Every query is scoped to `teamId`:
// a row of another team behaves as if it did not exist.
export const requestsService = {
  async listByCollection(teamId: string, collectionId: string) {
    const rows = await prisma.request.findMany({
      where: { collectionId, collection: { teamId } },
      orderBy: { order: "asc" },
    });
    return rows.map(serialize);
  },

  async get(teamId: string, id: string) {
    const row = await prisma.request.findFirstOrThrow({ where: { id, collection: { teamId } } });
    return serialize(row);
  },

  async create(teamId: string, collectionId: string, input: UpsertRequestInput) {
    await prisma.collection.findFirstOrThrow({
      where: { id: collectionId, teamId },
      select: { id: true },
    });
    const count = await prisma.request.count({ where: { collectionId } });
    const row = await prisma.request.create({
      data: {
        collectionId,
        name: input.name,
        method: input.method,
        url: input.url,
        paramsJson: JSON.stringify(input.params),
        headersJson: JSON.stringify(input.headers),
        authJson: JSON.stringify(input.auth),
        bodyJson: JSON.stringify(input.body),
        order: count,
      },
    });
    return serialize(row);
  },

  async update(teamId: string, id: string, input: UpsertRequestInput) {
    const row = await prisma.request.update({
      where: { id, collection: { teamId } },
      data: {
        name: input.name,
        method: input.method,
        url: input.url,
        paramsJson: JSON.stringify(input.params),
        headersJson: JSON.stringify(input.headers),
        authJson: JSON.stringify(input.auth),
        bodyJson: JSON.stringify(input.body),
      },
    });
    return serialize(row);
  },

  async remove(teamId: string, id: string) {
    await prisma.request.delete({ where: { id, collection: { teamId } } });
  },
};
