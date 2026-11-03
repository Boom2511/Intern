CREATE TABLE "Branch" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

ALTER TABLE "Employee" ADD COLUMN "branchId" INTEGER,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "Employee_branchId_idx" ON "Employee"("branchId");
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Zone" ADD COLUMN "department" TEXT,
ADD COLUMN "branchId" INTEGER;

CREATE INDEX "Zone_branchId_idx" ON "Zone"("branchId");
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EmployeeChangeHistory" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "operation" TEXT NOT NULL,
    "oldValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relatedImportId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmployeeChangeHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmployeeChangeHistory_employeeId_effectiveAt_idx"
ON "EmployeeChangeHistory"("employeeId", "effectiveAt");
CREATE INDEX "EmployeeChangeHistory_relatedImportId_idx"
ON "EmployeeChangeHistory"("relatedImportId");
ALTER TABLE "EmployeeChangeHistory" ADD CONSTRAINT "EmployeeChangeHistory_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ZoneImportLog" ADD COLUMN "report" JSONB;
