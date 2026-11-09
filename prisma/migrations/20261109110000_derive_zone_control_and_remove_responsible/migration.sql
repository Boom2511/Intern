DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ZoneEmployee"
    GROUP BY "zoneId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one owner per Zone: duplicate ZoneEmployee.zoneId assignments exist. Resolve them before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ZoneEmployee"
    GROUP BY "employeeId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one Zone per employee: duplicate ZoneEmployee.employeeId assignments exist. Resolve them before applying this migration.';
  END IF;
END $$;

INSERT INTO "OrganizationChangeHistory" (
  "actorName",
  "branchId",
  "entityType",
  "operation",
  "description",
  "beforeValues",
  "afterValues"
)
SELECT
  'System migration',
  z."branchId",
  'ZONE',
  'RESPONSIBLE_ARCHIVED',
  'Archived legacy manual Responsible assignment; active control is now derived from Zone hierarchy',
  jsonb_build_object(
    'zoneId', z."zoneId",
    'employeeId', e."employeeId",
    'employeeName', e."name",
    'responsibleEmployeeId', r."employeeId",
    'responsibleName', r."name"
  ),
  jsonb_build_object(
    'responsibility', 'derived from Zone node kind and Parent hierarchy'
  )
FROM "ZoneEmployee" ze
JOIN "Zone" z ON z."id" = ze."zoneId"
JOIN "Employee" e ON e."id" = ze."employeeId"
JOIN "Employee" r ON r."id" = ze."chiefOfficerId"
WHERE ze."chiefOfficerId" IS NOT NULL;

DROP INDEX IF EXISTS "ZoneEmployee_chiefOfficerId_idx";
ALTER TABLE "ZoneEmployee" DROP CONSTRAINT IF EXISTS "ZoneEmployee_chiefOfficerId_fkey";
ALTER TABLE "ZoneEmployee" DROP COLUMN "chiefOfficerId";

DROP INDEX IF EXISTS "ZoneEmployee_zoneId_employeeId_key";
CREATE UNIQUE INDEX "ZoneEmployee_zoneId_key" ON "ZoneEmployee"("zoneId");
CREATE UNIQUE INDEX "ZoneEmployee_employeeId_key" ON "ZoneEmployee"("employeeId");
