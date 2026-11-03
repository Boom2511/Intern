ALTER TABLE "Zone"
ADD COLUMN "hierarchyManual" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Employee"
ADD COLUMN "managerZoneId" TEXT;

CREATE INDEX "Employee_managerZoneId_idx" ON "Employee"("managerZoneId");

ALTER TABLE "Employee"
ADD CONSTRAINT "Employee_managerZoneId_fkey"
FOREIGN KEY ("managerZoneId") REFERENCES "Zone"("zoneId")
ON DELETE SET NULL ON UPDATE CASCADE;
