CREATE TABLE "OrganizationDepartment" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDepartment_pkey" PRIMARY KEY ("id")
);

INSERT INTO "OrganizationDepartment" ("branchId", "name", "updatedAt")
SELECT DISTINCT "branchId", "department", CURRENT_TIMESTAMP
FROM "Zone"
WHERE "branchId" IS NOT NULL AND "department" IS NOT NULL AND BTRIM("department") <> ''
UNION
SELECT DISTINCT "branchId", "department", CURRENT_TIMESTAMP
FROM "Employee"
WHERE "branchId" IS NOT NULL AND "department" IS NOT NULL AND BTRIM("department") <> '';

WITH "DepartmentHeads" AS (
    SELECT
        "branchId",
        LOWER(BTRIM("department")) AS "departmentKey",
        MIN("zoneId") AS "headZoneId"
    FROM "Zone"
    WHERE "branchId" IS NOT NULL
      AND "department" IS NOT NULL
      AND "nodeKind" = 'DELIVERY_HEAD'
    GROUP BY "branchId", LOWER(BTRIM("department"))
    HAVING COUNT(*) = 1 AND BOOL_AND("parentZoneId" IS NULL)
)
UPDATE "Zone" AS zone
SET "parentZoneId" = heads."headZoneId",
    "hierarchyManual" = TRUE,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "DepartmentHeads" AS heads
WHERE zone."branchId" = heads."branchId"
  AND LOWER(BTRIM(zone."department")) = heads."departmentKey"
  AND zone."zoneId" <> heads."headZoneId"
  AND zone."parentZoneId" IS NULL;

CREATE UNIQUE INDEX "OrganizationDepartment_branchId_name_key"
ON "OrganizationDepartment"("branchId", "name");

CREATE INDEX "OrganizationDepartment_branchId_idx"
ON "OrganizationDepartment"("branchId");

ALTER TABLE "OrganizationDepartment"
ADD CONSTRAINT "OrganizationDepartment_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
