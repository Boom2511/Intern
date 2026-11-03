-- Add indexes for better query performance on tickets list and search

-- Index for status filtering (most common filter)
CREATE INDEX IF NOT EXISTS "Ticket_status_idx" ON "Ticket"("status");

-- Index for department filtering
CREATE INDEX IF NOT EXISTS "Ticket_department_idx" ON "Ticket"("department");

-- Index for issue type filtering
CREATE INDEX IF NOT EXISTS "Ticket_issueType_idx" ON "Ticket"("issueType");

-- Composite index for date range queries with status
CREATE INDEX IF NOT EXISTS "Ticket_createdAt_status_idx" ON "Ticket"("createdAt" DESC, "status");

-- Index for tracking number search
CREATE INDEX IF NOT EXISTS "Ticket_trackingNo_idx" ON "Ticket"("trackingNo");

-- Index for salesforce ID search
CREATE INDEX IF NOT EXISTS "Ticket_salesforceId_idx" ON "Ticket"("salesforceId");

-- Composite index for customer tickets query (used in ticket detail)
CREATE INDEX IF NOT EXISTS "Ticket_customerId_createdAt_idx" ON "Ticket"("customerId", "createdAt" DESC);

-- Index for SLA status queries
CREATE INDEX IF NOT EXISTS "Ticket_slaStatus_idx" ON "Ticket"("slaStatus");

-- Index for priority queries
CREATE INDEX IF NOT EXISTS "Ticket_priority_idx" ON "Ticket"("priority");
