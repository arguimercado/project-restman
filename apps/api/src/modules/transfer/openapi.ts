import { randomUUID } from "node:crypto";
import type { CollectionDraft } from "./restman-file.js";

// An OpenAPI document is untrusted, arbitrarily shaped JSON; it's walked defensively below
// rather than modelled with a full type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Obj = Record<string, any>;
type RequestDraft = CollectionDraft["requests"][number];
type Method = RequestDraft["method"];

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options"] as const;
const MAX_EXAMPLE_DEPTH = 5;
const IGNORED_HEADER_PARAMS = new Set(["accept", "content-type", "authorization"]);

const isObj = (value: unknown): value is Obj =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function keyValue(key: string, value: string, enabled: boolean) {
  return { id: randomUUID(), key, value, enabled };
}

export function convertOpenApi(doc: Obj): { collection: CollectionDraft; warnings: string[] } {
  const warnings = new Set<string>();
  const warn = (message: string) => warnings.add(message);

  // ---- $ref handling (local refs only) ----

  function lookup(ref: string): unknown {
    let node: unknown = doc;
    for (const part of ref.slice(2).split("/")) {
      const key = decodeURIComponent(part).replace(/~1/g, "/").replace(/~0/g, "~");
      if (!isObj(node) && !Array.isArray(node)) return undefined;
      node = (node as Obj)[key];
    }
    return node;
  }

  function deref(node: unknown): Obj {
    const seen = new Set<string>();
    let current = node;
    while (isObj(current) && typeof current.$ref === "string") {
      const ref: string = current.$ref;
      if (!ref.startsWith("#/")) {
        warn(`External reference "${ref}" was not resolved`);
        return {};
      }
      if (seen.has(ref)) return {};
      seen.add(ref);
      current = lookup(ref);
    }
    return isObj(current) ? current : {};
  }

  // ---- example generation ----

  function stringFor(format: unknown): string {
    switch (format) {
      case "date-time":
        return "2024-01-01T00:00:00Z";
      case "date":
        return "2024-01-01";
      case "email":
        return "user@example.com";
      case "uuid":
        return "00000000-0000-0000-0000-000000000000";
      case "uri":
      case "url":
        return "https://example.com";
      default:
        return "string";
    }
  }

  function explicitExample(schemaLike: unknown): unknown {
    const node = deref(schemaLike);
    if (node.example !== undefined) return node.example;
    if (Array.isArray(node.examples) && node.examples.length > 0) return node.examples[0];
    if (isObj(node.examples)) {
      const first = Object.values(node.examples)[0];
      const example = deref(first);
      if (example.value !== undefined) return example.value;
    }
    if (node.default !== undefined) return node.default;
    if (Array.isArray(node.enum) && node.enum.length > 0) return node.enum[0];
    if (node.const !== undefined) return node.const;
    return undefined;
  }

  function exampleFor(schemaLike: unknown, depth = 0): unknown {
    if (depth > MAX_EXAMPLE_DEPTH) return undefined;
    const schema = deref(schemaLike);

    const explicit = explicitExample(schema);
    if (explicit !== undefined) return explicit;

    if (Array.isArray(schema.allOf)) {
      const merged: Obj = {};
      for (const part of schema.allOf) {
        const value = exampleFor(part, depth + 1);
        if (isObj(value)) Object.assign(merged, value);
      }
      if (isObj(schema.properties)) Object.assign(merged, exampleFor({ ...schema, allOf: undefined }, depth + 1));
      return merged;
    }
    const alternatives = schema.oneOf ?? schema.anyOf;
    if (Array.isArray(alternatives) && alternatives.length > 0) {
      return exampleFor(alternatives[0], depth + 1);
    }

    // OpenAPI 3.1 allows `type: ["string", "null"]`.
    const type = Array.isArray(schema.type)
      ? schema.type.find((t: string) => t !== "null")
      : (schema.type ?? (schema.properties ? "object" : schema.items ? "array" : undefined));

    switch (type) {
      case "object": {
        const result: Obj = {};
        for (const [name, propSchema] of Object.entries(schema.properties ?? {})) {
          if (deref(propSchema).readOnly) continue;
          const value = exampleFor(propSchema, depth + 1);
          if (value !== undefined) result[name] = value;
        }
        return result;
      }
      case "array": {
        const item = exampleFor(schema.items, depth + 1);
        return item === undefined ? [] : [item];
      }
      case "string":
        return stringFor(schema.format);
      case "integer":
      case "number":
        return 0;
      case "boolean":
        return false;
      default:
        return undefined;
    }
  }

  function asText(value: unknown): string {
    if (value === undefined || value === null) return "";
    if (Array.isArray(value)) return value.map(asText).join(",");
    if (isObj(value)) return JSON.stringify(value);
    return String(value);
  }

  // ---- servers, security ----

  function baseUrl(servers: unknown): string {
    const server = Array.isArray(servers) ? deref(servers[0]) : {};
    let url = typeof server.url === "string" ? server.url : "";
    if (!url) {
      warn("No server URL in the document; requests use http://localhost");
      return "http://localhost";
    }
    const variables = isObj(server.variables) ? server.variables : {};
    url = url.replace(/\{([^}]+)\}/g, (match, name: string) => {
      const fallback = variables[name]?.default;
      return fallback === undefined ? match : String(fallback);
    });
    if (!/^https?:\/\//i.test(url)) {
      warn(`Server URL "${url}" is relative; prefixed with http://localhost`);
      url = `http://localhost${url.startsWith("/") ? "" : "/"}${url}`;
    }
    return url.replace(/\/+$/, "");
  }

  function authFor(security: unknown): RequestDraft["auth"] {
    if (!Array.isArray(security) || security.length === 0) return { type: "none" };
    const requirement = deref(security[0]);
    const schemeName = Object.keys(requirement)[0];
    if (!schemeName) return { type: "none" };

    const scheme = deref(doc.components?.securitySchemes?.[schemeName]);
    const type = String(scheme.type ?? "").toLowerCase();
    if (type === "http") {
      const httpScheme = String(scheme.scheme ?? "").toLowerCase();
      if (httpScheme === "bearer") return { type: "bearer", bearer: { token: "" } };
      if (httpScheme === "basic") return { type: "basic", basic: { username: "", password: "" } };
    } else if (type === "apikey" && (scheme.in === "header" || scheme.in === "query")) {
      return { type: "apiKey", apiKey: { key: String(scheme.name ?? ""), value: "", addTo: scheme.in } };
    } else if (type === "oauth2" || type === "openidconnect") {
      warn("OAuth2 / OpenID Connect security is imported as a Bearer token; paste a token to use it");
      return { type: "bearer", bearer: { token: "" } };
    }
    warn(`Security scheme "${schemeName}" is not supported and was imported without auth`);
    return { type: "none" };
  }

  // ---- request bodies ----

  function bodyFor(requestBody: unknown, requestName: string): RequestDraft["body"] {
    const content = deref(requestBody).content;
    if (!isObj(content)) return { type: "none" };

    const ranked = Object.keys(content)
      .map((mediaType) => {
        const lower = mediaType.toLowerCase().split(";")[0].trim();
        const rank =
          lower === "application/json" || lower.endsWith("+json") ? 0
          : lower === "application/x-www-form-urlencoded" ? 1
          : lower.endsWith("/xml") || lower.endsWith("+xml") ? 2
          : lower === "text/html" ? 3
          : lower === "text/plain" ? 4
          : -1;
        return { mediaType, rank };
      })
      .filter((entry) => entry.rank >= 0)
      .sort((a, b) => a.rank - b.rank);

    const chosen = ranked[0];
    if (!chosen) {
      warn(`"${requestName}": request body type (${Object.keys(content).join(", ")}) is not supported; body left empty`);
      return { type: "none" };
    }

    const media = deref(content[chosen.mediaType]);
    const example = explicitExample(media) ?? exampleFor(media.schema);

    switch (chosen.rank) {
      case 0:
        return { type: "json", content: JSON.stringify(example ?? {}, null, 2) };
      case 1: {
        const fields = isObj(example) ? Object.entries(example) : [];
        return {
          type: "form-urlencoded",
          formFields: fields.map(([key, value]) => keyValue(key, asText(value), true)),
        };
      }
      case 2:
        return { type: "xml", content: typeof example === "string" ? example : "" };
      case 3:
        return { type: "html", content: typeof example === "string" ? example : "" };
      default:
        return { type: "text", content: asText(example) };
    }
  }

  // ---- operations ----

  const paths = isObj(doc.paths) ? doc.paths : {};
  const collected: { tag: string; request: RequestDraft }[] = [];
  let cookieParams = 0;

  for (const [path, rawItem] of Object.entries(paths)) {
    const item = deref(rawItem);

    for (const method of METHODS) {
      if (!isObj(item[method])) continue;
      const operation = item[method] as Obj;

      const name = String(
        operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`,
      ).slice(0, 200);

      // Operation-level parameters override path-level ones with the same name + location.
      const merged = new Map<string, Obj>();
      for (const raw of [...(item.parameters ?? []), ...(operation.parameters ?? [])]) {
        const param = deref(raw);
        if (typeof param.name === "string" && typeof param.in === "string") {
          merged.set(`${param.in}:${param.name}`, param);
        }
      }

      const params: RequestDraft["params"] = [];
      const headers: RequestDraft["headers"] = [];
      let resolvedPath = path;

      for (const param of merged.values()) {
        const value = explicitExample(param) ?? explicitExample(param.schema);
        switch (param.in) {
          case "path":
            resolvedPath = resolvedPath.replace(`{${param.name}}`, value === undefined ? `{${param.name}}` : asText(value));
            break;
          case "query":
            params.push(
              keyValue(param.name, asText(value ?? exampleFor(param.schema)), param.required === true),
            );
            break;
          case "header":
            if (!IGNORED_HEADER_PARAMS.has(param.name.toLowerCase())) {
              headers.push(
                keyValue(param.name, asText(value ?? exampleFor(param.schema)), param.required === true),
              );
            }
            break;
          default:
            cookieParams++;
        }
      }

      const servers = operation.servers ?? item.servers ?? doc.servers;
      collected.push({
        tag: Array.isArray(operation.tags) && operation.tags[0] ? String(operation.tags[0]) : "",
        request: {
          name,
          method: method.toUpperCase() as Method,
          url: `${baseUrl(servers)}${resolvedPath.startsWith("/") ? "" : "/"}${resolvedPath}`,
          params,
          headers,
          auth: authFor(operation.security ?? doc.security),
          body: bodyFor(operation.requestBody, name),
        },
      });
    }

    if (isObj(item.trace)) warn("TRACE operations are not supported and were skipped");
  }

  if (cookieParams > 0) warn(`${cookieParams} cookie parameter(s) were skipped`);

  // Group by first tag (untagged last); Array#sort is stable so document order is kept within a tag.
  collected.sort((a, b) => {
    if (a.tag === b.tag) return 0;
    if (!a.tag) return 1;
    if (!b.tag) return -1;
    return a.tag.localeCompare(b.tag);
  });

  const title = typeof doc.info?.title === "string" ? doc.info.title.trim() : "";
  return {
    collection: {
      name: (title || "Imported API").slice(0, 200),
      requests: collected.map((entry) => entry.request),
    },
    warnings: [...warnings],
  };
}
