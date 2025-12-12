-- Add unique constraint to prevent duplicate views per person per ticket
-- This allows upsert: update viewedAt if person views again, create if first time

-- First, remove any duplicate rows (keep only latest per person per ticket)
DELETE FROM "TicketView" a
USING "TicketView" b
WHERE a."id" < b."id"
  AND a."ticketId" = b."ticketId"
  AND a."viewerLineId" = b."viewerLineId"
  AND a."viewerLineId" IS NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "TicketView_ticketId_viewerLineId_key"
ON "TicketView"("ticketId", "viewerLineId");
