-- AddColumnChiefOfficerToZoneEmployee
ALTER TABLE "ZoneEmployee" ADD COLUMN "chiefOfficerId" INTEGER;

-- Add foreign key constraint
ALTER TABLE "ZoneEmployee" ADD CONSTRAINT "ZoneEmployee_chiefOfficerId_fkey" 
  FOREIGN KEY ("chiefOfficerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX "ZoneEmployee_chiefOfficerId_idx" ON "ZoneEmployee"("chiefOfficerId");
