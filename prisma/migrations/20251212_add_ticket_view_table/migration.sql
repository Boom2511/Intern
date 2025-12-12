-- CreateTable
CREATE TABLE IF NOT EXISTS "TicketView" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "viewerName" TEXT NOT NULL,
    "viewerLineId" TEXT,
    "viewerAvatar" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TicketView_ticketId_idx" ON "TicketView"("ticketId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TicketView_viewedAt_idx" ON "TicketView"("viewedAt");

-- AddForeignKey
ALTER TABLE "TicketView" ADD CONSTRAINT "TicketView_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
