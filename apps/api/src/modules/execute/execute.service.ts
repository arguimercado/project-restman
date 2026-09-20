import { Agent, buildConnector, fetch, Headers } from "undici";
import type { ExecuteRequestInput } from "./execute.schema.js";

const REQUEST_TIMEOUT_MS = 30_000;

// Local dev servers usually run HTTPS with a self-signed certificate. Verification is skipped
// for loopback hosts only; the choice is made per connection, so a redirect from localhost to
// an external host is still verified strictly.
const strictConnector = buildConnector({});
const loopbackConnector = buildConnector({ rejectUnauthorized: false });

export function isLoopbackHost(hostname: string): boolean {

  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "::1" ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}

const dispatcher = new Agent({
  connect: (options, callback) =>
    (isLoopbackHost(options.hostname) ? loopbackConnector : strictConnector)(options, callback),
});

const CERT_ERROR_CODES = new Set([
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

/** undici reports every network failure as "fetch failed"; the useful part is in `cause`. */
function describeFetchError(error: unknown, url: URL): string {
  const cause = (error as { cause?: { code?: string; message?: string; errors?: { code?: string }[] } })
    ?.cause;
  const code = cause?.code ?? cause?.errors?.[0]?.code;
  const target = url.host;

  if (code === "ECONNREFUSED") {
    return `Connection refused: nothing is listening on ${target}. Is the server running?`;
  }
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return `Could not resolve host "${url.hostname}"`;
  if (code === "ERR_SSL_WRONG_VERSION_NUMBER") {
    return `${target} isn't serving HTTPS on this port. Try http:// instead.`;
  }
  if (code && CERT_ERROR_CODES.has(code)) {
    return `The TLS certificate for ${url.hostname} was rejected (${code})`;
  }
  if (code === "ECONNRESET") return `The connection to ${target} was reset by the server`;
  if (code === "ETIMEDOUT" || code === "UND_ERR_CONNECT_TIMEOUT") {
    return `Timed out connecting to ${target}`;
  }

  const message = error instanceof Error ? error.message : "Request failed";
  return code ? `${message} (${code})` : message;
}

type Params = ExecuteRequestInput["params"];
type Auth = ExecuteRequestInput["auth"];
type Body = ExecuteRequestInput["body"];

function buildUrl(rawUrl: string, params: Params): URL {

  // "localhost:3000/x" would otherwise parse as scheme "localhost:".
  const trimmed = rawUrl.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw Object.assign(new Error(`Invalid URL: ${rawUrl}`), { statusCode: 400 });
  }
  for (const p of params) {
    if (p.enabled && p.key) url.searchParams.append(p.key, p.value);
  }
  return url;
}

function applyAuth(headers: Headers, url: URL, auth: Auth) {
  switch (auth.type) {
    case "bearer":
      if (auth.bearer?.token) headers.set("Authorization", `Bearer ${auth.bearer.token}`);
      break;
    case "basic":
      if (auth.basic) {
        const encoded = Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString(
          "base64",
        );
        headers.set("Authorization", `Basic ${encoded}`);
      }
      break;
    case "apiKey":
      if (auth.apiKey?.key) {
        if (auth.apiKey.addTo === "query") {
          url.searchParams.append(auth.apiKey.key, auth.apiKey.value);
        } else {
          headers.set(auth.apiKey.key, auth.apiKey.value);
        }
      }
      break;
    case "none":
    default:
      break;
  }
}

function buildBody(body: Body, headers: Headers): string | undefined {
  switch (body.type) {
    case "json":
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      return body.content ?? "";
    case "text":
      if (!headers.has("Content-Type")) headers.set("Content-Type", "text/plain");
      return body.content ?? "";
    case "xml":
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/xml");
      return body.content ?? "";
    case "html":
      if (!headers.has("Content-Type")) headers.set("Content-Type", "text/html");
      return body.content ?? "";
    case "form-urlencoded": {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/x-www-form-urlencoded");
      }
      const form = new URLSearchParams();
      for (const f of body.formFields ?? []) {
        if (f.enabled && f.key) form.append(f.key, f.value);
      }
      return form.toString();
    }
    case "none":
    default:
      return undefined;
  }
}

export async function executeRequest(input: ExecuteRequestInput) {

  const url = buildUrl(input.url, input.params);
  const headers = new Headers();
  
  for (const h of input.headers) {
    if (h.enabled && h.key) headers.set(h.key, h.value);
  }
  
  applyAuth(headers, url, input.auth);

  const hasBody = input.method !== "GET" && input.method !== "HEAD";
  const body = hasBody ? buildBody(input.body, headers) : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      method: input.method,
      headers,
      body,
      signal: controller.signal,
      redirect: "follow",
      dispatcher,
    });

    const responseText = await response.text();
    const timeMs = Math.round(performance.now() - startedAt);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let bodyIsJson = false;
    try {
      JSON.parse(responseText);
      bodyIsJson = true;
    } catch {
      bodyIsJson = false;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseText,
      bodyIsJson,
      timeMs,
      sizeBytes: Buffer.byteLength(responseText),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw Object.assign(new Error("Request timed out"), { statusCode: 504 });
    }
    throw Object.assign(new Error(describeFetchError(error, url)), { statusCode: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
