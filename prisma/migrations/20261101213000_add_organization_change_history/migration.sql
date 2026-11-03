CREATE TABLE "OrganizationChangeHistory" (
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

CREATE INDEX "OrganizationChangeHistory_entityType_effectiveAt_idx"
ON "OrganizationChangeHistory"("entityType", "effectiveAt");

CREATE INDEX "OrganizationChangeHistory_branchId_effectiveAt_idx"
ON "OrganizationChangeHistory"("branchId", "effectiveAt");

CREATE INDEX "OrganizationChangeHistory_rolledBackAt_idx"
ON "OrganizationChangeHistory"("rolledBackAt");
