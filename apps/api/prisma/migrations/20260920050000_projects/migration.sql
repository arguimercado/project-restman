-- Projects replace team scoping: collections belong to a project, and a developer sees the
-- projects they are a member of. Hand-written (not the raw `migrate diff` output) so existing
-- collections are moved into projects instead of the NOT NULL column failing on them.

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("projectId","userId")
);

-- The new column starts nullable so it can be backfilled.
ALTER TABLE "Collection" ADD COLUMN "projectId" TEXT;

-- Backfill: every team that has collections gets a project with the team's name...
INSERT INTO "Project" ("id", "name", "updatedAt")
SELECT 'prj_' || t."id", t."name", CURRENT_TIMESTAMP
FROM "Team" t
WHERE EXISTS (SELECT 1 FROM "Collection" c WHERE c."teamId" = t."id");

-- ...the team's users become its members (the earliest-registered one is the owner)...
INSERT INTO "ProjectMember" ("projectId", "userId", "role")
SELECT
    'prj_' || u."teamId",
    u."id",
    CASE
        WHEN u."id" = (
            SELECT u2."id" FROM "User" u2
            WHERE u2."teamId" = u."teamId"
            ORDER BY u2."createdAt", u2."id"
            LIMIT 1
        ) THEN 'owner'
        ELSE 'member'
    END
FROM "User" u
WHERE EXISTS (SELECT 1 FROM "Project" p WHERE p."id" = 'prj_' || u."teamId");

-- ...and the collections move into that project.
UPDATE "Collection" SET "projectId" = 'prj_' || "teamId" WHERE "teamId" IS NOT NULL;

-- A collection with no team (predates auth, never claimed) cannot be placed. The next statement
-- fails on it on purpose, aborting the migration, rather than silently dropping data.
ALTER TABLE "Collection" ALTER COLUMN "projectId" SET NOT NULL;

-- Team scoping is gone.
ALTER TABLE "Collection" DROP CONSTRAINT "Collection_teamId_fkey";
DROP INDEX "Collection_teamId_idx";
ALTER TABLE "Collection" DROP COLUMN "teamId";

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- CreateIndex
CREATE INDEX "Collection_projectId_idx" ON "Collection"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
