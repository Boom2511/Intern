/**
 * Single Ticket API Route
 * GET /api/tickets/[id] - Get ticket details
 * PATCH /api/tickets/[id] - Update ticket (status, department, assignee, add note)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateSLAStatus } from '@/lib/sla';
import { lineService } from '@/lib/line';
import { createDepartmentWorkSnapshotMessage } from '@/lib/line-templates';
import { getDepartmentLineGroup, getDepartmentLabel } from '@/config/departments';
import { getStatusLabel } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { getOrCreateLineGroup } from '@/lib/line-groups';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        fieldEdits: {
          orderBy: { editedAt: 'desc' },
        },
        views: {
          orderBy: { viewedAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tickets/[id]
 * Update ticket fields: status, department, assignedTo, or add note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user for tracking who made changes
    const currentUser = await getCurrentUser();
    const currentUsername = currentUser?.name || 'Staff';

    const body = await request.json();
    const {
      status,
      department,
      assignedTo,
      addNote,
      resolvedBy,
      changedByLineUserId,
      changedByLineName,
      changedByLineAvatar,
      changedByStaffName, // For CEC staff updates
      // Editable ticket fields
      trackingNo,
      issueType,
      issueTypeOther,
      salesforceId,
      recipientName,
      recipientPhone,
      recipientAddress,
      description,
      zoneId,
    } = body;

    // Verify ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Handle status update
    if (status && status !== ticket.status) {
      // Validate status transition: Ticket must be NEW before it can be IN_PROGRESS
      if (status === 'IN_PROGRESS' && ticket.status !== 'NEW') {
        return NextResponse.json(
          { success: false, error: 'Ticket must be in NEW status before changing to IN_PROGRESS' },
          { status: 400 }
        );
      }

      updateData.status = status;

      // If status is RESOLVED, set resolvedBy and resolvedAt
      if (status === 'RESOLVED') {
        updateData.resolvedBy = resolvedBy || 'Staff';
        updateData.resolvedAt = new Date();
      }

      // If status is CLOSED, set closedBy and closedAt
      if (status === 'CLOSED') {
        updateData.closedBy = 'CEC Staff';
        updateData.closedAt = new Date();
      }

      // Update SLA status
      const slaStatus = calculateSLAStatus(ticket.createdAt, ticket.slaDeadline, status === 'RESOLVED' || status === 'CLOSED');
      updateData.slaStatus = slaStatus;

      // Create status history
      await prisma.statusHistory.create({
        data: {
          ticketId: ticket.id,
          fromStatus: ticket.status,
          toStatus: status,
          changedBy: changedByStaffName || resolvedBy || currentUsername,
          changedByLineUserId: changedByLineUserId || null,
          changedByLineName: changedByLineName || null,
          changedByLineAvatar: changedByLineAvatar || null,
          note: null,
        },
      });

      // NOTE: Removed LINE notification for status changes to reduce quota usage
      // Only send notifications for new ticket creation with department assignment
    }

    // Handle department update
    if (department !== undefined) {
      const newDepartment = department === 'none' ? null : department;
      updateData.department = newDepartment;

      // Send Department Work Snapshot when department is assigned for the FIRST time only
      // Only send if ticket had no department before (ticket.department is null)
      // This prevents notifications on department reassignments to reduce quota usage
      if (newDepartment && !ticket.department && lineService.isConfigured()) {
        const groupId = getDepartmentLineGroup(newDepartment);
        if (groupId) {
          const deptLabel = getDepartmentLabel(newDepartment);

          // Fetch all pending tickets for this department to create work snapshot
          const pendingTickets = await prisma.ticket.findMany({
            where: {
              department: newDepartment,
              status: {
                notIn: ['RESOLVED', 'CLOSED'],
              },
            },
            include: {
              customer: true,
            },
            orderBy: [
              { priority: 'desc' },
              { slaDeadline: 'asc' },
              { createdAt: 'asc' },
            ],
            take: 10, // Limit to 10 tickets for the snapshot
          });

          // Build LIFF queue URL
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://intern-tawny.vercel.app';
          const queueUrl = `${baseUrl}/liff/queue?department=${newDepartment}`;

          // Get or create LINE group to fetch group name
          const lineGroupData = await getOrCreateLineGroup(groupId, newDepartment);
          const groupName = lineGroupData?.groupName;

          const flexMessage = createDepartmentWorkSnapshotMessage({
            tickets: pendingTickets,
            department: newDepartment,
            departmentLabel: deptLabel,
            queueUrl,
            groupName,
          });

          try {
            await lineService.sendFlexMessage(
              groupId,
              `📋 งานค้าง ${deptLabel}`,
              flexMessage
            );
            console.log(`✅ Department Work Snapshot sent to ${deptLabel}: ${pendingTickets.length} pending tickets`);
          } catch (error) {
            console.error('❌ Failed to send Department Work Snapshot:', error);
          }
        }
      } else if (newDepartment && ticket.department) {
        console.log(`ℹ️ Department reassignment (${ticket.department} → ${newDepartment}) - notification skipped to save quota`);
      }
    }

    // Handle assignee update
    if (assignedTo !== undefined) {
      updateData.assignedTo = assignedTo === 'none' ? null : assignedTo;
    }

    // Track field changes for edit history
    const fieldChanges: Array<{ field: string; oldValue: string | null; newValue: string | null }> = [];

    // Helper function to track field changes
    const trackFieldChange = (fieldName: string, oldValue: any, newValue: any) => {
      // Convert values to strings for storage (handling null/undefined)
      const oldStr = oldValue === null || oldValue === undefined ? null : String(oldValue);
      const newStr = newValue === null || newValue === undefined ? null : String(newValue);

      // Only track if values are different
      if (oldStr !== newStr) {
        fieldChanges.push({
          field: fieldName,
          oldValue: oldStr,
          newValue: newStr,
        });
      }
    };

    // Handle editable ticket field updates with change tracking
    if (trackingNo !== undefined) {
      trackFieldChange('trackingNo', ticket.trackingNo, trackingNo || null);
      updateData.trackingNo = trackingNo || null;
    }
    if (issueType !== undefined) {
      trackFieldChange('issueType', ticket.issueType, issueType);
      updateData.issueType = issueType;
    }
    if (issueTypeOther !== undefined) {
      trackFieldChange('issueTypeOther', ticket.issueTypeOther, issueTypeOther || null);
      updateData.issueTypeOther = issueTypeOther || null;
    }
    if (recipientName !== undefined) {
      trackFieldChange('recipientName', ticket.recipientName, recipientName);
      updateData.recipientName = recipientName;
    }
    if (recipientPhone !== undefined) {
      trackFieldChange('recipientPhone', ticket.recipientPhone, recipientPhone);
      updateData.recipientPhone = recipientPhone;
    }
    if (recipientAddress !== undefined) {
      trackFieldChange('recipientAddress', ticket.recipientAddress, recipientAddress);
      updateData.recipientAddress = recipientAddress;
    }
    if (description !== undefined) {
      trackFieldChange('description', ticket.description, description);
      updateData.description = description;
    }
    if (zoneId !== undefined) {
      trackFieldChange('zoneId', ticket.zoneId, zoneId || null);
      updateData.zoneId = zoneId || null;
    }
    if (salesforceId !== undefined) {
      trackFieldChange('salesforceId', ticket.salesforceId, salesforceId || null);
      updateData.salesforceId = salesforceId || null;
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        fieldEdits: {
          orderBy: { editedAt: 'desc' },
        },
        views: {
          orderBy: { viewedAt: 'desc' },
          take: 50,
        },
      },
    });

    // Create field edit history records
    if (fieldChanges.length > 0) {
      const editedBy = changedByStaffName || currentUsername;

      // Create a field edit record for each changed field
      await Promise.all(
        fieldChanges.map((change) =>
          prisma.fieldEdit.create({
            data: {
              ticketId: params.id,
              fieldName: change.field,
              oldValue: change.oldValue,
              newValue: change.newValue,
              editedBy,
              editedByLineUserId: changedByLineUserId || null,
              editedByLineName: changedByLineName || null,
              editedByLineAvatar: changedByLineAvatar || null,
            },
          })
        )
      );

      console.log(`✏️ Logged ${fieldChanges.length} field edit(s) for ticket ${ticket.ticketNo} by ${editedBy}`);
    }

    // Handle adding note (after ticket update)
    if (addNote && addNote.content) {
      await prisma.note.create({
        data: {
          ticketId: params.id,
          content: addNote.content,
          createdBy: addNote.createdBy || 'Staff',
          isFromEndUser: false,
          createdByLineUserId: addNote.createdByLineUserId || null,
          createdByLineName: addNote.createdByLineName || null,
          createdByLineAvatar: addNote.createdByLineAvatar || null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: 'Ticket updated successfully',
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}
