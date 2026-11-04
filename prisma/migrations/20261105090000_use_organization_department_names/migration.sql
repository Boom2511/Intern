BEGIN;

ALTER TABLE "Ticket"
  ALTER COLUMN "department" TYPE TEXT USING "department"::text;
ALTER TABLE "User"
  ALTER COLUMN "department" TYPE TEXT USING "department"::text;
ALTER TABLE "LineGroup"
  ALTER COLUMN "department" TYPE TEXT USING "department"::text;

UPDATE "Ticket" AS ticket
SET "department" = COALESCE((
  SELECT organization_department."name"
  FROM "OrganizationDepartment" AS organization_department
  WHERE organization_department."branchId" = ticket."branchId"
    AND LOWER(BTRIM(organization_department."name")) IN (
      LOWER(BTRIM(ticket."department")),
      LOWER(BTRIM(CASE ticket."department"
        WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
        WHEN 'DB6' THEN 'บป'
        WHEN 'TEST' THEN 'ทดสอบ'
        ELSE ticket."department"
      END))
    )
  ORDER BY CASE
    WHEN LOWER(BTRIM(organization_department."name")) = LOWER(BTRIM(CASE ticket."department"
      WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
      WHEN 'DB6' THEN 'บป'
      WHEN 'TEST' THEN 'ทดสอบ'
      ELSE ticket."department"
    END)) THEN 0
    ELSE 1
  END
  LIMIT 1
), ticket."department")
WHERE ticket."department" IS NOT NULL;

UPDATE "User" AS app_user
SET "department" = COALESCE((
  SELECT organization_department."name"
  FROM "OrganizationDepartment" AS organization_department
  WHERE organization_department."branchId" = app_user."branchId"
    AND LOWER(BTRIM(organization_department."name")) IN (
      LOWER(BTRIM(app_user."department")),
      LOWER(BTRIM(CASE app_user."department"
        WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
        WHEN 'DB6' THEN 'บป'
        WHEN 'TEST' THEN 'ทดสอบ'
        ELSE app_user."department"
      END))
    )
  ORDER BY CASE
    WHEN LOWER(BTRIM(organization_department."name")) = LOWER(BTRIM(CASE app_user."department"
      WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
      WHEN 'DB6' THEN 'บป'
      WHEN 'TEST' THEN 'ทดสอบ'
      ELSE app_user."department"
    END)) THEN 0
    ELSE 1
  END
  LIMIT 1
), app_user."department")
WHERE app_user."department" IS NOT NULL;

UPDATE "Employee" AS employee
SET "department" = COALESCE((
  SELECT organization_department."name"
  FROM "OrganizationDepartment" AS organization_department
  WHERE organization_department."branchId" = employee."branchId"
    AND LOWER(BTRIM(organization_department."name")) IN (
      LOWER(BTRIM(employee."department")),
      LOWER(BTRIM(CASE employee."department"
        WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
        WHEN 'DB6' THEN 'บป'
        WHEN 'TEST' THEN 'ทดสอบ'
        ELSE employee."department"
      END))
    )
  ORDER BY CASE
    WHEN LOWER(BTRIM(organization_department."name")) = LOWER(BTRIM(CASE employee."department"
      WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
      WHEN 'DB6' THEN 'บป'
      WHEN 'TEST' THEN 'ทดสอบ'
      ELSE employee."department"
    END)) THEN 0
    ELSE 1
  END
  LIMIT 1
), employee."department")
WHERE employee."department" IS NOT NULL;

UPDATE "Zone" AS zone
SET "department" = COALESCE((
  SELECT organization_department."name"
  FROM "OrganizationDepartment" AS organization_department
  WHERE organization_department."branchId" = zone."branchId"
    AND LOWER(BTRIM(organization_department."name")) IN (
      LOWER(BTRIM(zone."department")),
      LOWER(BTRIM(CASE zone."department"
        WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
        WHEN 'DB6' THEN 'บป'
        WHEN 'TEST' THEN 'ทดสอบ'
        ELSE zone."department"
      END))
    )
  ORDER BY CASE
    WHEN LOWER(BTRIM(organization_department."name")) = LOWER(BTRIM(CASE zone."department"
      WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
      WHEN 'DB6' THEN 'บป'
      WHEN 'TEST' THEN 'ทดสอบ'
      ELSE zone."department"
    END)) THEN 0
    ELSE 1
  END
  LIMIT 1
), zone."department")
WHERE zone."department" IS NOT NULL;

UPDATE "ZoneDepartmentRoot" AS department_root
SET "department" = COALESCE((
  SELECT organization_department."name"
  FROM "OrganizationDepartment" AS organization_department
  WHERE organization_department."branchId" = department_root."branchId"
    AND LOWER(BTRIM(organization_department."name")) IN (
      LOWER(BTRIM(department_root."department")),
      LOWER(BTRIM(CASE department_root."department"
        WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
        WHEN 'DB6' THEN 'บป'
        WHEN 'TEST' THEN 'ทดสอบ'
        ELSE department_root."department"
      END))
    )
  ORDER BY CASE
    WHEN LOWER(BTRIM(organization_department."name")) = LOWER(BTRIM(CASE department_root."department"
      WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
      WHEN 'DB6' THEN 'บป'
      WHEN 'TEST' THEN 'ทดสอบ'
      ELSE department_root."department"
    END)) THEN 0
    ELSE 1
  END
  LIMIT 1
), department_root."department")
WHERE department_root."department" IS NOT NULL;

UPDATE "LineGroup" AS line_group
SET "department" = COALESCE((
  SELECT organization_department."name"
  FROM "Zone" AS zone
  JOIN "OrganizationDepartment" AS organization_department
    ON organization_department."branchId" = zone."branchId"
  WHERE zone."zoneId" = line_group."zoneId"
    AND LOWER(BTRIM(organization_department."name")) IN (
      LOWER(BTRIM(line_group."department")),
      LOWER(BTRIM(CASE line_group."department"
        WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
        WHEN 'DB6' THEN 'บป'
        WHEN 'TEST' THEN 'ทดสอบ'
        ELSE line_group."department"
      END))
    )
  ORDER BY CASE
    WHEN LOWER(BTRIM(organization_department."name")) = LOWER(BTRIM(CASE line_group."department"
      WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
      WHEN 'DB6' THEN 'บป'
      WHEN 'TEST' THEN 'ทดสอบ'
      ELSE line_group."department"
    END)) THEN 0
    ELSE 1
  END
  LIMIT 1
), line_group."department")
WHERE line_group."department" IS NOT NULL;

UPDATE "LineGroup"
SET "department" = CASE "department"
  WHEN 'DB5' THEN 'นำจ่ายรถยนต์'
  WHEN 'DB6' THEN 'บป'
  WHEN 'TEST' THEN 'ทดสอบ'
  ELSE "department"
END
WHERE "department" IN ('DB5', 'DB6', 'TEST');

INSERT INTO "OrganizationDepartment" ("branchId", "name", "updatedAt")
SELECT DISTINCT source."branchId", source."department", CURRENT_TIMESTAMP
FROM (
  SELECT ticket."branchId", ticket."department"
  FROM "Ticket" AS ticket
  WHERE ticket."branchId" IS NOT NULL AND ticket."department" IS NOT NULL
  UNION
  SELECT app_user."branchId", app_user."department"
  FROM "User" AS app_user
  WHERE app_user."branchId" IS NOT NULL AND app_user."department" IS NOT NULL
  UNION
  SELECT employee."branchId", employee."department"
  FROM "Employee" AS employee
  WHERE employee."branchId" IS NOT NULL AND employee."department" IS NOT NULL
  UNION
  SELECT zone."branchId", zone."department"
  FROM "Zone" AS zone
  WHERE zone."branchId" IS NOT NULL AND zone."department" IS NOT NULL
  UNION
  SELECT department_root."branchId", department_root."department"
  FROM "ZoneDepartmentRoot" AS department_root
  WHERE department_root."branchId" IS NOT NULL AND department_root."department" IS NOT NULL
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM "OrganizationDepartment" AS organization_department
  WHERE organization_department."branchId" = source."branchId"
    AND LOWER(BTRIM(organization_department."name")) = LOWER(BTRIM(source."department"))
)
ON CONFLICT ("branchId", "name") DO NOTHING;

DROP TYPE "Department";

COMMIT;
