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
import { getDepartmentLabel, isTestDepartment } from '@/config/departments';
import { getStatusLabel } from '@/lib/utils';
import { getCurrentUser, hasPermission, Permission } from '@/lib/auth';
import { getLineGroupForDepartment, getOrCreateLineGroup } from '@/lib/line-groups';
import { getTicketBranchScope } from '@/lib/branch-access';
import { resolveBranchDepartment } from '@/lib/branch-organization';
import { hashClientTicketToken } from '@/lib/client-ticket-access';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get pagination params for notes/history (optional)
    const searchParams = request.nextUrl.searchParams;
    const notesLimit = parseInt(searchParams.get('notesLimit') || '20', 10);
    const historyLimit = parseInt(searchParams.get('historyLimit') || '10', 10);
    const include = {
      customer: true,
      notes: { orderBy: { createdAt: 'desc' as const }, take: notesLimit },
      statusHistory: { orderBy: { createdAt: 'desc' as const }, take: historyLimit },
      fieldEdits: { orderBy: { editedAt: 'desc' as const }, take: historyLimit },
      views: { orderBy: { viewedAt: 'desc' as const }, take: 20 },
    };

    let ticket;
    if (searchParams.get('mode') === 'client') {
      const token = searchParams.get('token');
      if (!token) {
        return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
      }
      ticket = await prisma.ticket.findFirst({
        where: {
          id: params.id,
          clientAccessTokenHash: hashClientTicketToken(token),
          clientAccessTokenExpiresAt: { gt: new Date() },
        },
        include,
      });
    } else {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      const branchScope = getTicketBranchScope(currentUser);
      if (!branchScope) {
        return NextResponse.json({ success: false, error: 'Your account is not assigned to a branch' }, { status: 403 });
      }
      ticket = await prisma.ticket.findFirst({
        where: { id: params.id, ...branchScope },
        include,
      });
    }

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      );
    }

    if (searchParams.get('mode') === 'client') {
      const {
        clientAccessTokenHash: _tokenHash,
        clientAccessTokenExpiresAt: _tokenExpiry,
        ...clientTicket
      } = ticket;
      return NextResponse.json(
        { success: true, ticket: clientTicket },
        { headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } }
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
    const body = await request.json();
    const clientMode = request.nextUrl.searchParams.get('mode') === 'client';
    if (clientMode) {
      const token = request.nextUrl.searchParams.get('token');
      const hasOnlyNote = Object.keys(body).every((key) => key === 'addNote');
      if (!token || !hasOnlyNote || typeof body.addNote?.content !== 'string' || !body.addNote.content.trim()) {
        return NextResponse.json({ success: false, error: 'Invalid client ticket request' }, { status: 400 });
      }

      const clientTicket = await prisma.ticket.findFirst({
        where: {
          id: params.id,
          clientAccessTokenHash: hashClientTicketToken(token),
          clientAccessTokenExpiresAt: { gt: new Date() },
        },
        select: { id: true },
      });
      if (!clientTicket) {
        return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
      }
      if (body.addNote.content.trim().length > 4000) {
        return NextResponse.json({ success: false, error: 'Note must be 4000 characters or fewer' }, { status: 400 });
      }

      await prisma.note.create({
        data: {
          ticketId: clientTicket.id,
          content: body.addNote.content.trim(),
          createdBy: 'ผู้ถือ ลิงก์ Ticket',
          isFromEndUser: true,
          images: [],
        },
      });
      return NextResponse.json({ success: true, message: 'Ticket note added' });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const branchScope = getTicketBranchScope(currentUser);
    if (!branchScope) {
      return NextResponse.json({ success: false, error: 'Your account is not assigned to a branch' }, { status: 403 });
    }
    if (!hasPermission(currentUser.role, Permission.EDIT_TICKETS) &&
      (currentUser.role !== 'USER' || Object.keys(body).some((key) => key !== 'addNote'))) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const currentUsername = currentUser.name || 'Staff';

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
      closeCause,
      closeSolution,
      resolutionDetail, // Resolution detail from end user (editable by CEC)
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
    const ticket = await prisma.ticket.findFirst({
      where: { id: params.id, ...branchScope },
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
    let resolvedDepartment: string | null | undefined;
    if (department !== undefined && department !== null && department !== '' && department !== 'none') {
      if (typeof department !== 'string' || ticket.branchId === null) {
        return NextResponse.json(
          { success: false, error: 'Choose a department registered in this ticket’s branch' },
          { status: 400 }
        );
      }
      resolvedDepartment = await resolveBranchDepartment(ticket.branchId, department);
      if (!resolvedDepartment) {
        return NextResponse.json(
          { success: false, error: 'Choose a department registered in this ticket’s branch' },
          { status: 400 }
        );
      }
      if (isTestDepartment(resolvedDepartment) && currentUser.role !== 'ADMINISTRATOR') {
        return NextResponse.json({ success: false, error: 'You may not assign tickets to the TEST department' }, { status: 403 });
      }
    }
    if (zoneId !== undefined && zoneId !== null && zoneId !== '') {
      if (typeof zoneId !== 'string') {
        return NextResponse.json({ success: false, error: 'Choose a valid zone' }, { status: 400 });
      }
      const zone = await prisma.zone.findUnique({
        where: { zoneId },
        select: { branchId: true },
      });
      if (!zone || zone.branchId !== ticket.branchId) {
        return NextResponse.json({ success: false, error: 'Zone does not belong to this ticket’s branch' }, { status: 400 });
      }
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

      // If status is CLOSED, require cause and solution, set closedBy and closedAt
      if (status === 'CLOSED') {
        if (!closeCause || !closeSolution) {
          return NextResponse.json(
            { success: false, error: 'กรุณาระบุสาเหตุและแนวทางแก้ไขก่อนปิดงาน' },
            { status: 400 }
          );
        }
        updateData.closedBy = changedByStaffName || 'CEC Staff';
        updateData.closedAt = new Date();
        // Update resolutionDetail if provided (allow CEC to edit)
        if (resolutionDetail !== undefined) {
          updateData.resolutionDetail = resolutionDetail;
        }
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
          note: status === 'CLOSED' 
            ? `ผลการดำเนินการ: ${resolutionDetail || 'ไม่ระบุ'}\nสาเหตุ: ${closeCause || ''}\nแนวทางแก้ไข: ${closeSolution || ''}` 
            : null,
        },
      });

      // NOTE: Removed LINE notification for status changes to reduce quota usage
      // Only send notifications for new ticket creation with department assignment
    }

    // Handle department update
    if (department !== undefined) {
      const newDepartment = department === 'none' || department === '' || department === null
        ? null
        : resolvedDepartment ?? department;
      updateData.department = newDepartment;

      // Send Department Work Snapshot when department is assigned for the FIRST time only
      // Only send if ticket had no department before (ticket.department is null)
      // This prevents notifications on department reassignments to reduce quota usage
      if (newDepartment && !ticket.department && lineService.isConfigured()) {
        const groupId = await getLineGroupForDepartment(newDepartment, ticket.branchId ?? undefined);
        if (groupId) {
          const deptLabel = getDepartmentLabel(newDepartment);

          // Fetch all pending tickets for this department to create work snapshot
          const pendingTickets = await prisma.ticket.findMany({
            where: {
              ...branchScope,
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
          const queueUrl = `${baseUrl}/liff/queue?department=${encodeURIComponent(newDepartment)}`;

          // Get or create LINE group to fetch group name
          const lineGroupData = await getOrCreateLineGroup(groupId, newDepartment);
          const groupName = lineGroupData?.groupName;

          const flexMessage = await createDepartmentWorkSnapshotMessage({
            tickets: pendingTickets,
            department: newDepartment,
            departmentLabel: deptLabel,
            queueUrl,
            groupName,
          });

          try {
            await lineService.sendFlexMessage(
              groupId,
              `📋 มีงานใหม่${groupName ? ` | ${groupName}` : ` | ${deptLabel}`}`,
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
      
      // Also update customer's name (keep Customer as single source of truth)
      if (recipientName && recipientName.trim()) {
        await prisma.customer.update({
          where: { id: ticket.customerId },
          data: { name: recipientName },
        });
      }
    }
    if (recipientPhone !== undefined) {
      trackFieldChange('recipientPhone', ticket.recipientPhone, recipientPhone);
      updateData.recipientPhone = recipientPhone;
      
      // Note: Phone is unique key in Customer, so we don't auto-update it
      // to avoid conflicts. Customer phone should remain stable.
    }
    if (recipientAddress !== undefined) {
      trackFieldChange('recipientAddress', ticket.recipientAddress, recipientAddress);
      updateData.recipientAddress = recipientAddress;
      
      // Also update customer's address (keep Customer as single source of truth)
      if (recipientAddress && recipientAddress.trim()) {
        await prisma.customer.update({
          where: { id: ticket.customerId },
          data: { address: recipientAddress },
        });
      }
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
      
      // Auto-update channel based on salesforceId
      const newChannel = salesforceId ? 'SALESFORCE' : 'CEC';
      if (ticket.channel !== newChannel) {
        trackFieldChange('channel', ticket.channel, newChannel);
        updateData.channel = newChannel;
      }
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(currentUser.role, Permission.DELETE_TICKETS)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const branchScope = getTicketBranchScope(currentUser);
    if (!branchScope) {
      return NextResponse.json({ success: false, error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    const deleted = await prisma.ticket.deleteMany({
      where: { id: params.id, ...branchScope },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete ticket' },
      { status: 500 }
    );
  }
}
