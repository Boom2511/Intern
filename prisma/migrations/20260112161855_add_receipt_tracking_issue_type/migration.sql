-- AlterEnum (idempotent - only add if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'RECEIPT_TRACKING' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'IssueType')
  ) THEN
    ALTER TYPE "IssueType" ADD VALUE 'RECEIPT_TRACKING';
  END IF;
END $$;
