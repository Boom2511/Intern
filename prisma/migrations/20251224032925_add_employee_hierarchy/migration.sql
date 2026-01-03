-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('CEC', 'SALESFORCE');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('NEW_DELIVERY', 'CHECK_DELIVERY', 'SERVICE_COMPLAINT', 'RETURN_REQUEST', 'ADDRESS_CORRECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('DB1', 'DB2', 'DB3', 'DB4', 'DB5', 'DB6', 'TEST');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SLAStatus" AS ENUM ('ON_TRACK', 'AT_RISK', 'BREACHED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMINISTRATOR', 'ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STAFF', 'CHIEF', 'DB_HEAD');

-- CreateEnum
CREATE TYPE "ZoneSource" AS ENUM ('TICKET', 'XLSX', 'MANUAL');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNo" TEXT NOT NULL,
    "channel" "Channel" NOT NULL DEFAULT 'CEC',
    "issueType" "IssueType" NOT NULL DEFAULT 'OTHER',
    "issueTypeOther" TEXT,
    "department" "Department",
    "trackingNo" TEXT,
    "zoneId" TEXT,
    "customerId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL DEFAULT '',
    "recipientPhone" TEXT NOT NULL DEFAULT '',
    "recipientAddress" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "salesforceId" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "slaHours" INTEGER NOT NULL DEFAULT 24,
    "slaDeadline" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaStatus" "SLAStatus" NOT NULL DEFAULT 'ON_TRACK',
    "createdBy" TEXT,
    "assignedTo" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "isFromEndUser" BOOLEAN NOT NULL DEFAULT false,
    "images" TEXT[],
    "createdByLineUserId" TEXT,
    "createdByLineName" TEXT,
    "createdByLineAvatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStatus" "TicketStatus" NOT NULL,
    "toStatus" "TicketStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedByLineUserId" TEXT,
    "changedByLineName" TEXT,
    "changedByLineAvatar" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldEdit" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "editedBy" TEXT NOT NULL,
    "editedByLineUserId" TEXT,
    "editedByLineName" TEXT,
    "editedByLineAvatar" TEXT,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketView" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "viewerName" TEXT NOT NULL,
    "viewerLineId" TEXT,
    "viewerAvatar" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineGroup" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "department" "Department",
    "zoneId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "managerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "zoneId" TEXT NOT NULL,
    "zoneName" TEXT,
    "isMapped" BOOLEAN NOT NULL DEFAULT false,
    "source" "ZoneSource" NOT NULL DEFAULT 'TICKET',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneEmployee" (
    "id" SERIAL NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,

    CONSTRAINT "ZoneEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneImportLog" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "importedBy" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rowCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',

    CONSTRAINT "ZoneImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNo_key" ON "Ticket"("ticketNo");

-- CreateIndex
CREATE INDEX "Ticket_ticketNo_idx" ON "Ticket"("ticketNo");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_channel_idx" ON "Ticket"("channel");

-- CreateIndex
CREATE INDEX "Ticket_issueType_idx" ON "Ticket"("issueType");

-- CreateIndex
CREATE INDEX "Ticket_department_idx" ON "Ticket"("department");

-- CreateIndex
CREATE INDEX "Ticket_customerId_idx" ON "Ticket"("customerId");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "Ticket_slaDeadline_idx" ON "Ticket"("slaDeadline");

-- CreateIndex
CREATE INDEX "Ticket_slaStatus_idx" ON "Ticket"("slaStatus");

-- CreateIndex
CREATE INDEX "Ticket_trackingNo_idx" ON "Ticket"("trackingNo");

-- CreateIndex
CREATE INDEX "Note_ticketId_idx" ON "Note"("ticketId");

-- CreateIndex
CREATE INDEX "Note_isFromEndUser_idx" ON "Note"("isFromEndUser");

-- CreateIndex
CREATE INDEX "Note_createdByLineUserId_idx" ON "Note"("createdByLineUserId");

-- CreateIndex
CREATE INDEX "StatusHistory_ticketId_idx" ON "StatusHistory"("ticketId");

-- CreateIndex
CREATE INDEX "StatusHistory_createdAt_idx" ON "StatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "StatusHistory_changedByLineUserId_idx" ON "StatusHistory"("changedByLineUserId");

-- CreateIndex
CREATE INDEX "FieldEdit_ticketId_idx" ON "FieldEdit"("ticketId");

-- CreateIndex
CREATE INDEX "FieldEdit_editedAt_idx" ON "FieldEdit"("editedAt");

-- CreateIndex
CREATE INDEX "FieldEdit_editedByLineUserId_idx" ON "FieldEdit"("editedByLineUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "TicketView_ticketId_idx" ON "TicketView"("ticketId");

-- CreateIndex
CREATE INDEX "TicketView_viewedAt_idx" ON "TicketView"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TicketView_ticketId_viewerLineId_key" ON "TicketView"("ticketId", "viewerLineId");

-- CreateIndex
CREATE UNIQUE INDEX "LineGroup_groupId_key" ON "LineGroup"("groupId");

-- CreateIndex
CREATE INDEX "LineGroup_groupId_idx" ON "LineGroup"("groupId");

-- CreateIndex
CREATE INDEX "LineGroup_department_idx" ON "LineGroup"("department");

-- CreateIndex
CREATE INDEX "LineGroup_isActive_idx" ON "LineGroup"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeId_key" ON "Employee"("employeeId");

-- CreateIndex
CREATE INDEX "Employee_employeeId_idx" ON "Employee"("employeeId");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE INDEX "Employee_managerId_idx" ON "Employee"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_zoneId_key" ON "Zone"("zoneId");

-- CreateIndex
CREATE INDEX "Zone_zoneId_idx" ON "Zone"("zoneId");

-- CreateIndex
CREATE INDEX "Zone_isMapped_idx" ON "Zone"("isMapped");

-- CreateIndex
CREATE INDEX "ZoneEmployee_zoneId_idx" ON "ZoneEmployee"("zoneId");

-- CreateIndex
CREATE INDEX "ZoneEmployee_employeeId_idx" ON "ZoneEmployee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneEmployee_zoneId_employeeId_key" ON "ZoneEmployee"("zoneId", "employeeId");

-- CreateIndex
CREATE INDEX "ZoneImportLog_importedAt_idx" ON "ZoneImportLog"("importedAt");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldEdit" ADD CONSTRAINT "FieldEdit_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketView" ADD CONSTRAINT "TicketView_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneEmployee" ADD CONSTRAINT "ZoneEmployee_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneEmployee" ADD CONSTRAINT "ZoneEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
