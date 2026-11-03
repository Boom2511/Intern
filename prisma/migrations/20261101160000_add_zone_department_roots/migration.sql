CREATE TABLE "ZoneDepartmentRoot" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "rootZoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZoneDepartmentRoot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ZoneDepartmentRoot_rootZoneId_key" ON "ZoneDepartmentRoot"("rootZoneId");
CREATE UNIQUE INDEX "ZoneDepartmentRoot_branchId_department_key" ON "ZoneDepartmentRoot"("branchId", "department");
CREATE INDEX "ZoneDepartmentRoot_branchId_idx" ON "ZoneDepartmentRoot"("branchId");

ALTER TABLE "ZoneDepartmentRoot"
ADD CONSTRAINT "ZoneDepartmentRoot_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ZoneDepartmentRoot"
ADD CONSTRAINT "ZoneDepartmentRoot_rootZoneId_fkey"
FOREIGN KEY ("rootZoneId") REFERENCES "Zone"("zoneId")
ON DELETE CASCADE ON UPDATE CASCADE;
