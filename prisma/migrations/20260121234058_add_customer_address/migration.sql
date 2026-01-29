-- AlterTable (idempotent - only add if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Customer' AND column_name = 'address'
  ) THEN
    ALTER TABLE "Customer" ADD COLUMN "address" TEXT;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN "Customer"."address" IS 'Customer address - nullable for backward compatibility. New tickets should use this instead of Ticket.recipientAddress';
