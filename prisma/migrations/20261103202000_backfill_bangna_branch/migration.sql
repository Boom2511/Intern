BEGIN;

CREATE TABLE IF NOT EXISTS "Branch" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "code" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Branch_name_key" ON "Branch"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Branch_code_key" ON "Branch"("code");

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "branchId" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "branchId" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "branchId" INTEGER;

CREATE INDEX IF NOT EXISTS "Employee_branchId_idx" ON "Employee"("branchId");
CREATE INDEX IF NOT EXISTS "User_branchId_idx" ON "User"("branchId");
CREATE INDEX IF NOT EXISTS "Ticket_branchId_createdAt_idx" ON "Ticket"("branchId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Employee_branchId_fkey'
          AND conrelid = '"Employee"'::regclass
    ) THEN
        ALTER TABLE "Employee"
        ADD CONSTRAINT "Employee_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'User_branchId_fkey'
          AND conrelid = '"User"'::regclass
    ) THEN
        ALTER TABLE "User"
        ADD CONSTRAINT "User_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'Ticket_branchId_fkey'
          AND conrelid = '"Ticket"'::regclass
    ) THEN
        ALTER TABLE "Ticket"
        ADD CONSTRAINT "Ticket_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
DECLARE
    target_branch_id INTEGER;
BEGIN
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

    UPDATE "Employee"
    SET "branchId" = target_branch_id
    WHERE "branchId" IS NULL;

    UPDATE "User"
    SET "isSuperAdmin" = false
    WHERE "role" <> 'ADMINISTRATOR'
      AND "isSuperAdmin" = true;

    UPDATE "User"
    SET "branchId" = target_branch_id
    WHERE "branchId" IS NULL
      AND NOT ("role" = 'ADMINISTRATOR' AND "isSuperAdmin" = true);

    UPDATE "Ticket"
    SET "branchId" = target_branch_id
    WHERE "branchId" IS NULL;
END $$;

COMMIT;
