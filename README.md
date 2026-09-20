# Restman2

A minimal, Postman-like API client for teams. Node.js + React monorepo, MVP scope.

This is a separate rebuild from `../restman` (a much larger .NET/Couchbase/Keycloak
team-collaboration spec). Restman2 intentionally targets a small slice of that product:
build a request, send it, look at the response, organize saved requests into collections.
Developers register with their company and team and sign in with Clerk; collections are shared
within a team. No environments/variables yet — see "Not in this MVP" below.

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **API** (`apps/api`): Fastify 5 + TypeScript (ESM, run via `tsx`, no build step) + Zod
  validation + Prisma on Neon Postgres for persistence. The API performs the outbound HTTP call
  server-side (not the browser), so requests to any target host work without hitting CORS.
- **Web** (`apps/web`): React 18 + Vite + TypeScript, Tailwind CSS v4, TanStack Query for
  server state, Zustand for the open-tabs/draft-request workspace state.
- **Shared** (`packages/shared`): TypeScript types shared between API and web (no build
  step — consumed as source, per Turborepo's standard internal-package pattern).

## Architecture

```
apps/api/src/
  modules/
    collections/   CRUD for collections
    requests/      CRUD for saved requests within a collection
    execute/       the request executor: builds and sends the outbound HTTP call
    transfer/      import/export: the .restman file format and the OpenAPI 3 converter
  schemas/http.ts  shared zod fragments (method, key/value, auth, body)
  db/client.ts     Prisma client
  app.ts           Fastify instance + route registration
```

Each module follows the same three-file shape: `*.schema.ts` (zod validation), `*.service.ts`
(Prisma queries / business logic), `*.routes.ts` (Fastify handlers). This keeps modules easy
to extend independently as features grow post-MVP.

```
apps/web/src/
  api/             typed fetch wrappers per resource
  store/           zustand store: open tabs, each with a request draft + last response
  components/
    Sidebar/       collection + request tree
    RequestBuilder/  method/url bar, params/headers/body/auth editors
    ResponseViewer/  status/time/size + pretty/raw/headers views
```

## Getting started

Requires Node.js 20+ and pnpm 9+.

```bash
pnpm install

cp apps/api/.env.example apps/api/.env   # then fill in the database URLs and Clerk keys
pnpm --filter @restman/api db:migrate    # applies the migrations to your Neon branch

pnpm dev   # runs the API (port 4000) and web app (port 5173) together
```

Open http://localhost:5173. The Vite dev server proxies `/api/*` to the API, so no CORS
config is needed in development.

Other useful commands:

```bash
pnpm --filter @restman/api db:studio    # browse the database
pnpm --filter @restman/api db:deploy    # apply committed migrations (production/CI)
pnpm typecheck                          # type-check every package
pnpm build                              # production build (web only for now)
```

## Database (Neon Postgres)

Data lives in [Neon](https://neon.com) Postgres, accessed through Prisma. Neon gives every
database two connection strings, and Prisma needs both:

| Variable | Connection | Used for |
| --- | --- | --- |
| `DATABASE_URL` | **pooled** (host contains `-pooler`) | the running API |
| `DATABASE_URL_UNPOOLED` | **direct** (no `-pooler`) | Prisma Migrate (`directUrl`) |

### Working as a team

**Every developer works on their own Neon branch.** Never share one `DATABASE_URL`, and never
point local development at `production`. A branch is an instant, isolated, copy-on-write clone,
so it costs nothing to make one and you can break it freely.

```bash
# once: get access to the Neon project, then
neon login
neon link                                                 # pick the project

# your own branch (use --schema-only once production holds real customer data)
neon branch create --name dev-<yourname> --schema-only --parent production
neon connection-string dev-<yourname> --pooled            # -> DATABASE_URL in apps/api/.env
neon connection-string dev-<yourname>                     # -> DATABASE_URL_UNPOOLED
pnpm --filter @restman/api db:migrate                     # applies all committed migrations
```

`.env` files are git-ignored: keep the URLs there and never commit them.

**Schema changes** go through Prisma migrations, committed with the code:

1. Edit `apps/api/prisma/schema.prisma` and run `pnpm --filter @restman/api db:migrate` against
   your branch (it asks for a migration name). Commit the new folder under `prisma/migrations/`.
2. After pulling a teammate's migration, run `db:migrate` again to apply it to your branch.
3. If two branches add migrations at the same time, keep both folders when merging (Prisma
   applies them in timestamp order) and check that they apply cleanly on a fresh branch.
4. Deployed databases (production, CI) only ever get `pnpm --filter @restman/api db:deploy`,
   with that database's own URLs. Never run `db:migrate` (`migrate dev`) against production.

Protect the `production` branch in the Neon console so it can't be deleted or reset by accident.

## MVP scope

- Projects: the first page after sign-in lists the projects you are a member of; create one and
  you become its owner. A project holds its own collections and requests, and only its members can
  see them. (Inviting other members is next.)
- Collections: create, rename, delete
- Requests: all standard HTTP methods, query params, headers, auth (No Auth, Bearer, Basic,
  API Key), body (none, raw JSON/text/XML/HTML, x-www-form-urlencoded)
- Execution: server-side send, view status/time/size/headers/body (pretty/raw/headers tabs).
  A URL without a scheme (`localhost:3000/x`) is sent as `http://`. TLS certificates are
  verified for every host **except loopback** (`localhost`, `*.localhost`, `127.0.0.0/8`, `::1`),
  so local dev servers with self-signed certs work. Connection failures report the real cause
  (refused, unresolved host, wrong protocol, bad certificate) instead of a bare "fetch failed".
- Multiple open tabs with unsaved-change tracking
- Files (top menu **File → Open / Import…** and **File → Export all**, or the ↓ button on a collection):
  - Export to a `.restman` file to back up, move between machines or work offline.
  - Import a `.restman` file, or an **OpenAPI 3.x** document (JSON or YAML). An OpenAPI
    import becomes one collection, grouped by tag, with the server URL, query/header/path
    parameters, an example request body generated from the schema, and the security scheme
    mapped to Bearer / Basic / API Key auth. Unsupported bits (multipart bodies, cookie
    params, external `$ref`s, OpenAPI 2.0) are skipped and listed as warnings.

### The `.restman` format

A binary container: 8-byte magic (`RESTMAN` + a zero byte), 1-byte format version, SHA-256 of the
payload, then gzipped JSON. Restman refuses files without the magic/matching checksum, and
files from a newer format version. It is *not* encrypted — exported files contain any auth
tokens/passwords saved in your requests, so treat them like credentials.

## Not in this MVP (candidates for later)

- Inviting teammates into an existing company/team (registration currently always creates a new company)
- Environments and `{{variable}}` interpolation
- Request history, re-send from history
- Postman/cURL import, Postman export, cURL code generation
- multipart/form-data (file upload) bodies
- Collection runner, pre-request/test scripts, mock servers
- SSRF guarding on the executor (fine for an internal/trusted-network tool; revisit before
  exposing this to untrusted users or the public internet)
