import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { z } from "zod";
import { upsertRequestSchema } from "../requests/requests.schema.js";

/**
 * The `.restman` container:
 *
 *   bytes 0-7    magic "RESTMAN\0"
 *   byte  8      format version
 *   bytes 9-40   SHA-256 of the payload (detects corruption / hand-editing)
 *   bytes 41-    gzip-compressed JSON document
 *
 * It's a binary format, so other tools can't open it as text, and Restman rejects
 * anything that doesn't carry the magic header and a matching checksum. It is not
 * encrypted: the payload (including any auth secrets) is readable by anyone who
 * gunzips it.
 */
const MAGIC = Buffer.from("RESTMAN\0", "latin1");
const FORMAT_VERSION = 1;
const CHECKSUM_LENGTH = 32;
const HEADER_LENGTH = MAGIC.length + 1 + CHECKSUM_LENGTH;
const MAX_DECOMPRESSED_BYTES = 100 * 1024 * 1024;

export class ImportError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export const collectionDraftSchema = z.object({
  name: z.string().min(1).max(200),
  requests: z.array(upsertRequestSchema),
});

const restmanFileSchema = z.object({
  format: z.literal("restman-collection"),
  exportedAt: z.string().optional(),
  collections: z.array(collectionDraftSchema),
});

export type CollectionDraft = z.infer<typeof collectionDraftSchema>;

function sha256(data: Buffer) {
  return createHash("sha256").update(data).digest();
}

export function isRestmanFile(buffer: Buffer) {
  return buffer.length >= MAGIC.length && buffer.subarray(0, MAGIC.length).equals(MAGIC);
}

export function encodeRestmanFile(collections: CollectionDraft[]): Buffer {
  const document = {
    format: "restman-collection",
    exportedAt: new Date().toISOString(),
    collections,
  };
  const payload = gzipSync(Buffer.from(JSON.stringify(document), "utf8"));
  return Buffer.concat([MAGIC, Buffer.from([FORMAT_VERSION]), sha256(payload), payload]);
}

export function decodeRestmanFile(buffer: Buffer): CollectionDraft[] {
  if (!isRestmanFile(buffer)) throw new ImportError("Not a Restman file");
  if (buffer.length <= HEADER_LENGTH) throw new ImportError("Restman file is truncated");

  const version = buffer[MAGIC.length];
  if (version > FORMAT_VERSION) {
    throw new ImportError(
      `This file uses Restman file format v${version}; this app only understands up to v${FORMAT_VERSION}. Update Restman to open it.`,
    );
  }

  const checksum = buffer.subarray(MAGIC.length + 1, HEADER_LENGTH);
  const payload = buffer.subarray(HEADER_LENGTH);
  if (!sha256(payload).equals(checksum)) {
    throw new ImportError("Restman file is corrupted (checksum mismatch)");
  }

  let json: unknown;
  try {
    json = JSON.parse(
      gunzipSync(payload, { maxOutputLength: MAX_DECOMPRESSED_BYTES }).toString("utf8"),
    );
  } catch {
    throw new ImportError("Restman file is corrupted (unreadable payload)");
  }

  const parsed = restmanFileSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ImportError(`Invalid Restman file: ${issue.path.join(".") || "root"}: ${issue.message}`);
  }
  return parsed.data.collections;
}
