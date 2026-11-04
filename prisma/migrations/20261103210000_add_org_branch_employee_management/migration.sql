-- Idempotent migration: old_schema.prisma -> prisma/schema.prisma
-- Adds employee/org/branch management structures without dropping existing data.
BEGIN;

-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ZoneType') THEN
    CREATE TYPE "ZoneType" AS ENUM ('REGION', 'ZONE', 'DELIVERY', 'OTHER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ZoneNodeKind') THEN
    CREATE TYPE "ZoneNodeKind" AS ENUM ('DELIVERY_HEAD', 'DELIVERY_ZONE', 'DELIVERY_SIDE', 'CAR');
  END IF;
END $$;

-- Branch
CREATE TABLE IF NOT EXISTS "Branch" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS "Branch_name_key" ON "Branch"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Branch_code_key" ON "Branch"("code");

-- Ticket columns
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "branchId" INTEGER;
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "clientAccessTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "Ticket" ADD COLUMN IF NOT EXISTS "clientAccessTokenHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_clientAccessTokenHash_key" ON "Ticket"("clientAccessTokenHash");
CREATE INDEX IF NOT EXISTS "Ticket_branchId_createdAt_idx" ON "Ticket"("branchId", "createdAt");

-- User columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "branchId" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "User_branchId_idx" ON "User"("branchId");

-- Employee columns
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "branchId" INTEGER;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "managerZoneId" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS "Employee_branchId_idx" ON "Employee"("branchId");
CREATE INDEX IF NOT EXISTS "Employee_managerZoneId_idx" ON "Employee"("managerZoneId");

-- Zone columns
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "branchId" INTEGER;
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "hierarchyManual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "nodeKind" "ZoneNodeKind";
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "parentZoneId" TEXT;
ALTER TABLE "Zone" ADD COLUMN IF NOT EXISTS "zoneType" "ZoneType" NOT NULL DEFAULT 'OTHER';
CREATE INDEX IF NOT EXISTS "Zone_parentZoneId_idx" ON "Zone"("parentZoneId");
CREATE INDEX IF NOT EXISTS "Zone_zoneType_idx" ON "Zone"("zoneType");
CREATE INDEX IF NOT EXISTS "Zone_branchId_idx" ON "Zone"("branchId");

-- ZoneImportLog
ALTER TABLE "ZoneImportLog" ADD COLUMN IF NOT EXISTS "report" JSONB;

-- EmployeeChangeHistory
CREATE TABLE IF NOT EXISTS "EmployeeChangeHistory" (
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
CREATE INDEX IF NOT EXISTS "EmployeeChangeHistory_employeeId_effectiveAt_idx" ON "EmployeeChangeHistory"("employeeId", "effectiveAt");
CREATE INDEX IF NOT EXISTS "EmployeeChangeHistory_relatedImportId_idx" ON "EmployeeChangeHistory"("relatedImportId");

-- ZoneDepartmentRoot
CREATE TABLE IF NOT EXISTS "ZoneDepartmentRoot" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "rootZoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ZoneDepartmentRoot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ZoneDepartmentRoot_rootZoneId_key" ON "ZoneDepartmentRoot"("rootZoneId");
CREATE INDEX IF NOT EXISTS "ZoneDepartmentRoot_branchId_idx" ON "ZoneDepartmentRoot"("branchId");
CREATE UNIQUE INDEX IF NOT EXISTS "ZoneDepartmentRoot_branchId_department_key" ON "ZoneDepartmentRoot"("branchId", "department");

-- OrganizationDepartment
CREATE TABLE IF NOT EXISTS "OrganizationDepartment" (
    "id" SERIAL NOT NULL,
    "branchId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationDepartment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrganizationDepartment_branchId_idx" ON "OrganizationDepartment"("branchId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationDepartment_branchId_name_key" ON "OrganizationDepartment"("branchId", "name");

-- OrganizationChangeHistory
CREATE TABLE IF NOT EXISTS "OrganizationChangeHistory" (
    "id" SERIAL NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "branchId" INTEGER,
    "entityType" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "beforeValues" JSONB NOT NULL,
    "afterValues" JSONB NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolledBackAt" TIMESTAMP(3),
    CONSTRAINT "OrganizationChangeHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OrganizationChangeHistory_entityType_effectiveAt_idx" ON "OrganizationChangeHistory"("entityType", "effectiveAt");
CREATE INDEX IF NOT EXISTS "OrganizationChangeHistory_branchId_effectiveAt_idx" ON "OrganizationChangeHistory"("branchId", "effectiveAt");
CREATE INDEX IF NOT EXISTS "OrganizationChangeHistory_rolledBackAt_idx" ON "OrganizationChangeHistory"("rolledBackAt");

-- Foreign keys (guarded)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Ticket_branchId_fkey') THEN
    ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_branchId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Employee_branchId_fkey') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Employee_managerZoneId_fkey') THEN
    ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerZoneId_fkey" FOREIGN KEY ("managerZoneId") REFERENCES "Zone"("zoneId") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeChangeHistory_employeeId_fkey') THEN
    ALTER TABLE "EmployeeChangeHistory" ADD CONSTRAINT "EmployeeChangeHistory_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Zone_parentZoneId_fkey') THEN
    ALTER TABLE "Zone" ADD CONSTRAINT "Zone_parentZoneId_fkey" FOREIGN KEY ("parentZoneId") REFERENCES "Zone"("zoneId") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Zone_branchId_fkey') THEN
    ALTER TABLE "Zone" ADD CONSTRAINT "Zone_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ZoneDepartmentRoot_branchId_fkey') THEN
    ALTER TABLE "ZoneDepartmentRoot" ADD CONSTRAINT "ZoneDepartmentRoot_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ZoneDepartmentRoot_rootZoneId_fkey') THEN
    ALTER TABLE "ZoneDepartmentRoot" ADD CONSTRAINT "ZoneDepartmentRoot_rootZoneId_fkey" FOREIGN KEY ("rootZoneId") REFERENCES "Zone"("zoneId") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OrganizationDepartment_branchId_fkey') THEN
    ALTER TABLE "OrganizationDepartment" ADD CONSTRAINT "OrganizationDepartment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
