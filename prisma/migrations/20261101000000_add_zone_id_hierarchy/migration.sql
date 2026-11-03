CREATE TYPE "ZoneType" AS ENUM ('REGION', 'ZONE', 'DELIVERY', 'OTHER');

ALTER TABLE "Zone"
ADD COLUMN "zoneType" "ZoneType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "parentZoneId" TEXT;

UPDATE "Zone"
SET "zoneType" = CASE
  WHEN "zoneId" ~ '^REG[A-Z0-9]+EVD[0-9]{4}$' THEN 'REGION'::"ZoneType"
  WHEN "zoneId" ~ '^ZNE[A-Z0-9]+EVD[0-9]{4}$' THEN 'ZONE'::"ZoneType"
  WHEN "zoneId" ~ '^(EMS|CAR)[A-Z0-9]+EVD[0-9]{4}$' THEN 'DELIVERY'::"ZoneType"
  ELSE 'OTHER'::"ZoneType"
END;

WITH zone_parts AS (
  SELECT
    "zoneId",
    "zoneType",
    regexp_replace("zoneId", '^(REG|ZNE|EMS|CAR)(.*)EVD[0-9]{4}$', '\2') AS organization_code,
    substring("zoneId" FROM 'EVD([0-9]{4})$')::INTEGER AS suffix_value
  FROM "Zone"
  WHERE "zoneType" IN ('REGION', 'ZONE', 'DELIVERY')
),
zone_departments AS (
  SELECT
    "zoneId",
    "zoneType",
    organization_code,
    CASE
      WHEN "zoneType" = 'REGION' THEN suffix_value
      WHEN suffix_value >= 1000 THEN floor(suffix_value / 1000.0)::INTEGER
      ELSE floor(suffix_value / 100.0)::INTEGER
    END AS department_number,
    lpad(suffix_value::TEXT, 4, '0') AS suffix
  FROM zone_parts
)
UPDATE "Zone" child
SET "parentZoneId" = parent."zoneId"
FROM zone_departments child_data
JOIN "Zone" parent ON
  parent."zoneId" = CASE
    WHEN child_data."zoneType" = 'ZONE'
      THEN 'REG' || child_data.organization_code || 'EVD' || lpad(child_data.department_number::TEXT, 4, '0')
    WHEN child_data."zoneType" = 'DELIVERY'
      THEN 'ZNE' || child_data.organization_code || 'EVD' || child_data.suffix
  END
WHERE child."zoneId" = child_data."zoneId"
  AND child_data."zoneType" IN ('ZONE', 'DELIVERY')
  AND parent."branchId" IS NOT DISTINCT FROM child."branchId";

WITH delivery_departments AS (
  SELECT
    "zoneId",
    regexp_replace("zoneId", '^(EMS|CAR)(.*)EVD[0-9]{4}$', '\2') AS organization_code,
    substring("zoneId" FROM 'EVD([0-9]{4})$')::INTEGER AS suffix_value
  FROM "Zone"
  WHERE "zoneType" = 'DELIVERY'
    AND "parentZoneId" IS NULL
),
delivery_group AS (
  SELECT
    delivery."zoneId",
    delivery.organization_code,
    delivery.suffix_value,
    child."branchId",
    CASE
      WHEN delivery.suffix_value >= 1000 THEN floor(delivery.suffix_value / 1000.0)::INTEGER
      ELSE floor(delivery.suffix_value / 100.0)::INTEGER
    END AS department_number
  FROM delivery_departments delivery
  JOIN "Zone" child ON child."zoneId" = delivery."zoneId"
),
single_zone_group AS (
  SELECT
    regexp_replace("zoneId", '^ZNE(.*)EVD[0-9]{4}$', '\1') AS organization_code,
    CASE
      WHEN substring("zoneId" FROM 'EVD([0-9]{4})$')::INTEGER >= 1000
        THEN floor(substring("zoneId" FROM 'EVD([0-9]{4})$')::INTEGER / 1000.0)::INTEGER
      ELSE floor(substring("zoneId" FROM 'EVD([0-9]{4})$')::INTEGER / 100.0)::INTEGER
    END AS department_number,
    "branchId",
    min("zoneId") AS zone_id,
    count(*) AS zone_count
  FROM "Zone"
  WHERE "zoneType" = 'ZONE'
  GROUP BY 1, 2, 3
)
UPDATE "Zone" child
SET "parentZoneId" = parent."zoneId"
FROM delivery_group delivery
LEFT JOIN single_zone_group one_zone ON
  one_zone.organization_code = delivery.organization_code
  AND one_zone.department_number = delivery.department_number
  AND one_zone."branchId" IS NOT DISTINCT FROM delivery."branchId"
  AND one_zone.zone_count = 1
JOIN "Zone" parent ON
  parent."zoneId" = COALESCE(
    one_zone.zone_id,
    'REG' || delivery.organization_code || 'EVD' || lpad(delivery.department_number::TEXT, 4, '0')
  )
  AND parent."branchId" IS NOT DISTINCT FROM delivery."branchId"
WHERE child."zoneId" = delivery."zoneId";

CREATE INDEX "Zone_parentZoneId_idx" ON "Zone"("parentZoneId");
CREATE INDEX "Zone_zoneType_idx" ON "Zone"("zoneType");

ALTER TABLE "Zone"
ADD CONSTRAINT "Zone_parentZoneId_fkey"
FOREIGN KEY ("parentZoneId") REFERENCES "Zone"("zoneId")
ON DELETE SET NULL ON UPDATE CASCADE;
