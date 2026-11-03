CREATE TYPE "ZoneNodeKind" AS ENUM ('DELIVERY_HEAD', 'DELIVERY_ZONE', 'DELIVERY_SIDE', 'CAR');

ALTER TABLE "Zone"
ADD COLUMN "nodeKind" "ZoneNodeKind";

UPDATE "Zone"
SET "nodeKind" = CASE
  WHEN btrim("zoneId", '()') LIKE 'REG%EVD%' THEN 'DELIVERY_HEAD'::"ZoneNodeKind"
  WHEN btrim("zoneId", '()') LIKE 'ZNE%EVD%' THEN 'DELIVERY_ZONE'::"ZoneNodeKind"
  WHEN btrim("zoneId", '()') LIKE 'EMS%EVD%' THEN 'DELIVERY_SIDE'::"ZoneNodeKind"
  WHEN btrim("zoneId", '()') LIKE 'CAR%EVD%' THEN 'CAR'::"ZoneNodeKind"
  ELSE NULL
END;
