/**
 * TicketDetail Component
 * Detailed view of a single ticket
 * Features:
 * - Timeline of ticket history
 * - Add notes/comments
 * - Update status
 * - Show customer info and their other tickets
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import StatusBadge from './StatusBadge';
import { TicketWithRelations, TicketStatus, Priority } from '@/types';
import { formatThaiDate, formatRelativeTime, getPriorityColor, getPriorityLabel } from '@/lib/utils';
import { STAFF_MEMBERS, TICKET_STATUSES } from '@/lib/constants';
import { getDepartmentOptions } from '@/config/departments';
import { getIssueTypeLabel } from '@/config/issue-types';
import { User, Phone, Mail, Clock, MessageSquare, Edit, UserCog, CheckCircle, Building2 } from 'lucide-react';

interface TicketDetailProps {
  ticket: TicketWithRelations;
  viewMode?: 'staff' | 'client'; // staff = full control, client = limited to resolved status only
}

export default function TicketDetail({ ticket, viewMode = 'staff' }: TicketDetailProps) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignedTo, setAssignedTo] = useState<string>(ticket.assignedTo || '');
  const [department, setDepartment] = useState<string | null>(ticket.department || null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  const departmentOptions = getDepartmentOptions();

  // Client can only mark as RESOLVED
  const isClientMode = viewMode === 'client';

  const handleStatusUpdate = async (newStatus: TicketStatus) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolvedBy: isClientMode ? ticket.customer.name : 'Staff', // Track who resolved it
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus(newStatus);
        // Refresh page to show updated data
        window.location.reload();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleAssigneeUpdate = async (newAssignee: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: newAssignee === 'none' ? null : newAssignee }),
      });

      const data = await response.json();

      if (data.success) {
        setAssignedTo(newAssignee === 'none' ? '' : newAssignee);
        // Refresh page to show updated data
        window.location.reload();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการมอบหมายงาน');
      }
    } catch (error) {
      console.error('Error updating assignee:', error);
      alert('เกิดข้อผิดพลาดในการมอบหมายงาน กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentUpdate = async (newDepartment: string) => {
    setLoading(true);
    try {
      const updateData: any = { department: newDepartment === 'none' ? null : newDepartment };

      // Auto-update status to IN_PROGRESS when department is assigned
      if (newDepartment !== 'none' && ticket.status === 'NEW') {
        updateData.status = 'IN_PROGRESS';
      }

      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        setDepartment(newDepartment === 'none' ? null : newDepartment);
        if (updateData.status) {
          setStatus(updateData.status);
        }
        // Refresh page to show updated data and LINE notification
        window.location.reload();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการเลือกแผนก');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert('เกิดข้อผิดพลาดในการเลือกแผนก กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    try {
      // Create note through ticket update
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addNote: {
            content: newNote,
            createdBy: 'พนักงาน', // TODO: Get from auth session
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewNote('');
        // Refresh page to show new note
        window.location.reload();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการเพิ่มบันทึก');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มบันทึก กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h1 className="text-xl md:text-3xl font-bold break-all">{ticket.ticketNo}</h1>
            <StatusBadge status={status} />
            <Badge className={getPriorityColor(ticket.priority)}>
              {getPriorityLabel(ticket.priority)}
            </Badge>
          </div>
        </div>
        {!isClientMode && (
          <Button variant="outline" className="w-full md:w-auto">
            <Edit className="h-4 w-4 mr-2" />
            แก้ไข
          </Button>
        )}
      </div>

      <div className={`grid grid-cols-1 ${isClientMode ? 'max-w-2xl mx-auto' : 'lg:grid-cols-3'} gap-4 md:gap-6`}>
        {/* Main Content */}
        <div className={`${!isClientMode && 'lg:col-span-2'} space-y-4 md:space-y-6`}>
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>รายละเอียด</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Issue Type Badge */}
              <div className="flex items-center gap-2 pb-3 border-b">
                <span className="text-sm font-medium text-gray-600">ประเภทปัญหา:</span>
                <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                  {getIssueTypeLabel(ticket.issueType)}
                </Badge>
                {ticket.issueTypeOther && (
                  <span className="text-sm text-gray-600">({ticket.issueTypeOther})</span>
                )}
              </div>

              <p className="whitespace-pre-wrap">{ticket.description}</p>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>สร้างเมื่อ {formatThaiDate(ticket.createdAt)}</span>
              </div>
              {ticket.updatedAt !== ticket.createdAt && (
                <div className="mt-1 text-sm text-gray-500">
                  อัปเดตล่าสุด {formatRelativeTime(ticket.updatedAt)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes/Comments - Only show in staff mode */}
          {!isClientMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                  บันทึกและความคิดเห็น ({ticket.notes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Note */}
                <div className="space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="เพิ่มบันทึกหรือความคิดเห็น..."
                    rows={3}
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button onClick={handleAddNote} disabled={loading || !newNote.trim()}>
                    เพิ่มบันทึก
                  </Button>
                </div>

                {/* Notes Timeline */}
                <div className="space-y-4 mt-6">
                  {ticket.notes.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      ยังไม่มีบันทึก
                    </p>
                  ) : (
                    ticket.notes.map(note => (
                      <div key={note.id} className="border-l-2 border-blue-500 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{note.createdBy}</span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isClientMode ? 'ยืนยันการแก้ไข' : 'จัดการสถานะ'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isClientMode ? (
                /* Client View - Simple Resolved Button */
                <div className="space-y-3">
                  {status === 'RESOLVED' || status === 'CLOSED' ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-green-900">
                        Ticket ได้รับการแก้ไขแล้ว
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        {status === 'RESOLVED' ? 'รอการปิด Ticket' : 'Ticket ปิดแล้ว'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        หากปัญหาของคุณได้รับการแก้ไขแล้ว กรุณากดปุ่มด้านล่าง
                      </p>
                      <Button
                        onClick={() => handleStatusUpdate('RESOLVED')}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="lg"
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        ✅ ยืนยันว่าแก้ไขแล้ว
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        ทีมงานจะดำเนินการปิด Ticket ให้
                      </p>
                    </>
                  )}
                </div>
              ) : (
                /* Staff View - CEC Controls */
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      สถานะปัจจุบัน
                    </label>
                    <div className="p-3 bg-gray-50 rounded-lg mb-3">
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      สถานะจะเปลี่ยนอัตโนมัติตามการดำเนินการ
                    </p>
                    {status !== 'CLOSED' && (
                      <Button
                        onClick={() => handleStatusUpdate('CLOSED')}
                        disabled={loading}
                        variant="outline"
                        className="w-full border-red-300 text-red-700 hover:bg-red-50"
                      >
                        ปิด Ticket
                      </Button>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-gray-600" />
                      <label className="block text-sm font-medium text-gray-700">
                        เลือกแผนก
                      </label>
                    </div>
                    <Select
                      value={department || 'none'}
                      onValueChange={handleDepartmentUpdate}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกแผนกที่รับผิดชอบ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ยังไม่เลือกแผนก</SelectItem>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept.value} value={dept.value}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {department && (
                      <div className="mt-2 p-2 bg-green-50 rounded-md">
                        <p className="text-xs text-green-700">
                          แผนกที่รับผิดชอบ: <strong>{departmentOptions.find(d => d.value === department)?.label}</strong>
                        </p>
                      </div>
                    )}
                    {!department && (
                      <div className="mt-2 p-2 bg-amber-50 rounded-md">
                        <p className="text-xs text-amber-700">
                          ⚠️ กรุณาเลือกแผนกที่รับผิดชอบเพื่อดำเนินการต่อ
                        </p>
                      </div>
                    )}
                  </div>

                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Info - Only show in staff mode */}
          {!isClientMode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">ข้อมูลลูกค้า</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="font-medium text-sm md:text-base break-all">{ticket.customer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm break-all">{ticket.customer.phone}</span>
                </div>
                {ticket.customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm break-all">{ticket.customer.email}</span>
                  </div>
                )}
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    ดู Tickets อื่นของลูกค้า
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
