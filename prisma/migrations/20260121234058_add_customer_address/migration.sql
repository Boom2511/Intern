-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "address" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "Customer"."address" IS 'Customer address - nullable for backward compatibility. New tickets should use this instead of Ticket.recipientAddress';
