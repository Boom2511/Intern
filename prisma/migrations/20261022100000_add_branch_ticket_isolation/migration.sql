BEGIN;

ALTER TABLE "Branch" ADD COLUMN "code" TEXT;
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

ALTER TABLE "User"
ADD COLUMN "branchId" INTEGER,
ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Ticket" ADD COLUMN "branchId" INTEGER;
ALTER TABLE "Ticket"
ADD COLUMN "clientAccessTokenHash" TEXT,
ADD COLUMN "clientAccessTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX "User_branchId_idx" ON "User"("branchId");
CREATE INDEX "Ticket_branchId_createdAt_idx" ON "Ticket"("branchId", "createdAt");
CREATE UNIQUE INDEX "Ticket_clientAccessTokenHash_key" ON "Ticket"("clientAccessTokenHash");

ALTER TABLE "User"
ADD CONSTRAINT "User_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ticket"
ADD CONSTRAINT "Ticket_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE
    target_branch_id INTEGER;
    super_admin_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO super_admin_count
    FROM "User"
    WHERE LOWER(BTRIM("username")) = 'boom'
      AND "isActive" = true;

    IF super_admin_count <> 1 THEN
        RAISE EXCEPTION 'Expected exactly one user account named boom for Super Admin bootstrap; found %', super_admin_count;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM "Branch"
        WHERE ("code" = '10260' AND "name" <> 'บางนา')
           OR ("name" = 'บางนา' AND "code" IS NOT NULL AND "code" <> '10260')
    ) THEN
        RAISE EXCEPTION 'Branch code 10260 or branch name บางนา is already assigned inconsistently';
    END IF;

    SELECT "id"
    INTO target_branch_id
    FROM "Branch"
    WHERE "code" = '10260' OR "name" = 'บางนา'
    ORDER BY ("code" = '10260') DESC
    LIMIT 1;

    IF target_branch_id IS NULL THEN
        INSERT INTO "Branch" ("name", "code", "createdAt", "updatedAt")
        VALUES ('บางนา', '10260', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING "id" INTO target_branch_id;
    ELSE
        UPDATE "Branch"
        SET "name" = 'บางนา',
            "code" = '10260',
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = target_branch_id;
    END IF;

    UPDATE "User"
    SET "branchId" = CASE
            WHEN LOWER(BTRIM("username")) = 'boom' THEN NULL
            ELSE target_branch_id
        END,
        "isSuperAdmin" = LOWER(BTRIM("username")) = 'boom';

    UPDATE "Ticket"
    SET "branchId" = target_branch_id;

    UPDATE "Employee"
    SET "branchId" = target_branch_id
    WHERE "branchId" IS NULL;

    UPDATE "Zone"
    SET "branchId" = target_branch_id
    WHERE "branchId" IS NULL;
END $$;

COMMIT;
