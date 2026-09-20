import type { ImportResult } from "@restman/shared";
import { parse as parseYaml } from "yaml";
import { prisma } from "../../db/client.js";
import { serialize } from "../requests/requests.service.js";
import { convertOpenApi } from "./openapi.js";
import {
  decodeRestmanFile,
  encodeRestmanFile,
  ImportError,
  isRestmanFile,
  type CollectionDraft,
} from "./restman-file.js";

function parseTextDocument(buffer: Buffer): unknown {
  const text = buffer.toString("utf8").replace(/^﻿/, "");
  try {
    return JSON.parse(text);
  } catch {
    // not JSON, try YAML
  }
  try {
    return parseYaml(text);
  } catch {
    throw new ImportError("File is not a Restman file, or valid JSON/YAML");
  }
}

function toCollectionCreate(teamId: string, draft: CollectionDraft) {
  return prisma.collection.create({
    data: {
      name: draft.name,
      teamId,
      requests: {
        create: draft.requests.map((r, order) => ({
          name: r.name,
          method: r.method,
          url: r.url,
          paramsJson: JSON.stringify(r.params),
          headersJson: JSON.stringify(r.headers),
          authJson: JSON.stringify(r.auth),
          bodyJson: JSON.stringify(r.body),
          order,
        })),
      },
    },
  });
}

export const transferService = {
  /** Encodes the given collections (or every collection) of the team as a `.restman` file. */
  async exportFile(teamId: string, ids?: string[]): Promise<Buffer> {
    const rows = await prisma.collection.findMany({
      where: { teamId, ...(ids?.length ? { id: { in: ids } } : {}) },
      orderBy: { createdAt: "asc" },
      include: { requests: { orderBy: { order: "asc" } } },
    });
    if (rows.length === 0) {
      throw Object.assign(new Error("No collections to export"), { statusCode: 404 });
    }

    return encodeRestmanFile(
      rows.map((row) => ({
        name: row.name,
        requests: row.requests.map((request) => {
          const { name, method, url, params, headers, auth, body } = serialize(request);
          return {
            name,
            method: method as CollectionDraft["requests"][number]["method"],
            url,
            params,
            headers,
            auth,
            body,
          };
        }),
      })),
    );
  },

  /** Detects the format (.restman or OpenAPI 3.x JSON/YAML) and saves it as new collections of the team. */
  async importFile(teamId: string, buffer: Buffer): Promise<ImportResult> {
    let format: ImportResult["format"];
    let drafts: CollectionDraft[];
    let warnings: string[] = [];

    if (isRestmanFile(buffer)) {
      format = "restman";
      drafts = decodeRestmanFile(buffer);
    } else {
      const doc = parseTextDocument(buffer);
      if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
        throw new ImportError("Unrecognized file. Expected a .restman file or an OpenAPI 3.x document.");
      }
      const record = doc as Record<string, unknown>;
      if (typeof record.openapi === "string" && record.openapi.startsWith("3.")) {
        format = "openapi";
        const converted = convertOpenApi(record);
        if (converted.collection.requests.length === 0) {
          throw new ImportError("The OpenAPI document has no operations to import");
        }
        drafts = [converted.collection];
        warnings = converted.warnings;
      } else if (record.swagger) {
        throw new ImportError("Swagger / OpenAPI 2.0 is not supported. Convert it to OpenAPI 3.x first.");
      } else {
        throw new ImportError("Unrecognized file. Expected a .restman file or an OpenAPI 3.x document.");
      }
    }

    const collections = await prisma.$transaction(drafts.map((draft) => toCollectionCreate(teamId, draft)));
    return {
      format,
      // Dates serialize to ISO strings over the wire, matching the shared `Collection` type.
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      requestCount: drafts.reduce((sum, d) => sum + d.requests.length, 0),
      warnings,
    };
  },
};
