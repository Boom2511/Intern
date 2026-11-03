-- AlterTable (idempotent - only add if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Ticket' AND column_name = 'resolutionDetail'
  ) THEN
    ALTER TABLE "Ticket" ADD COLUMN "resolutionDetail" TEXT;
  END IF;
END $$;
