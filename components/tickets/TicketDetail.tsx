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
import { useToast } from '@/hooks/use-toast';
import StatusBadge from './StatusBadge';
import { TicketWithRelations, TicketStatus } from '@/types';
import { formatThaiDate, formatRelativeTime, getPriorityColor, getPriorityLabel } from '@/lib/utils';
import { getDepartmentOptions } from '@/config/departments';
import { getIssueTypeLabel } from '@/config/issue-types';
import { ROLE_LABELS } from '@/config/roles';
import { User, Clock, MessageSquare, Edit, UserCog, CheckCircle, Building2, Package, MapPin, FileText, Tag } from 'lucide-react';

interface TicketDetailProps {
  ticket: TicketWithRelations;
  viewMode?: 'staff' | 'client'; // staff = full control, client = limited to resolved status only
  mutate?: () => void; // SWR mutate function for refreshing data
}

export default function TicketDetail({ ticket, viewMode = 'staff', mutate }: TicketDetailProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
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
        toast({
          variant: 'success',
          title: 'สำเร็จ!',
          description: 'อัปเดตสถานะเรียบร้อยแล้ว',
        });
        // Refresh data using SWR mutate
        if (mutate) {
          mutate();
        }
      } else {
        toast({
          variant: 'error',
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถอัปเดตสถานะได้',
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: 'error',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง',
      });
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
        toast({
          variant: 'success',
          title: 'สำเร็จ!',
          description: 'เลือกแผนกเรียบร้อยแล้ว',
        });
        // Refresh data using SWR mutate
        if (mutate) {
          mutate();
        }
      } else {
        toast({
          variant: 'error',
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถเลือกแผนกได้',
        });
      }
    } catch (error) {
      console.error('Error updating department:', error);
      toast({
        variant: 'error',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเลือกแผนกได้ กรุณาลองใหม่อีกครั้ง',
      });
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
        toast({
          variant: 'success',
          title: 'สำเร็จ!',
          description: 'เพิ่มบันทึกเรียบร้อยแล้ว',
        });
        // Refresh data using SWR mutate
        if (mutate) {
          mutate();
        }
      } else {
        toast({
          variant: 'error',
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถเพิ่มบันทึกได้',
        });
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast({
        variant: 'error',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเพิ่มบันทึกได้ กรุณาลองใหม่อีกครั้ง',
      });
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
          {/* Ticket Information Card - Clean Design */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileText className="h-5 w-5 text-blue-600" />
                ข้อมูล Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 bg-gray-50">
              {/* Issue Type and Tracking Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Issue Type */}
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-600 block mb-1">ประเภทปัญหา</span>
                    <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                      {getIssueTypeLabel(ticket.issueType)}
                    </Badge>
                    {ticket.issueTypeOther && (
                      <span className="text-sm text-gray-600 ml-2">({ticket.issueTypeOther})</span>
                    )}
                  </div>
                </div>

                {/* Tracking Number */}
                {ticket.trackingNo && (
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-600 block mb-1">เลขพัสดุ</span>
                      <span className="text-sm font-mono text-gray-900 bg-white px-2 py-1 rounded border">
                        {ticket.trackingNo}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Department - Show in client mode */}
              {isClientMode && ticket.department && (
                <div className="flex items-start gap-3 pt-4 border-t">
                  <Building2 className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-600 block mb-1">แผนกรับผิดชอบ</span>
                    <span className="text-sm font-medium text-gray-900">
                      {departmentOptions.find(d => d.value === ticket.department)?.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Recipient Information */}
              <div className="flex items-start gap-3 pt-4 border-t">
                <MapPin className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-gray-600 block mb-2">ข้อมูลผู้รับ</span>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex gap-2">
                      <span className="text-gray-600 min-w-[70px]">ชื่อ:</span>
                      <span className="text-gray-900">{ticket.recipientName}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-600 min-w-[70px]">เบอร์โทร:</span>
                      <span className="text-gray-900">{ticket.recipientPhone}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-600 min-w-[70px]">ที่อยู่:</span>
                      <span className="text-gray-900">{ticket.recipientAddress}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="pt-4 border-t">
                <span className="text-sm text-gray-600 block mb-2">รายละเอียดปัญหา</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-4 rounded border leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              {/* Creator and Timestamp */}
              <div className="pt-4 border-t">
                <div className="flex items-start gap-3">
                  <UserCog className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>สร้างเมื่อ {formatThaiDate(ticket.createdAt)}</span>
                    </div>
                    {ticket.updatedAt !== ticket.createdAt && (
                      <div className="text-sm text-gray-500">
                        อัปเดตล่าสุด {formatRelativeTime(ticket.updatedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User Reports from LINE - Show in both modes */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-white border-b">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <MessageSquare className="h-5 w-5 text-green-600" />
                รายงานจาก LINE User ({ticket.notes.filter((note: any) => note.isFromEndUser).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 bg-white">
              {/* Notes Timeline - Show only user reports */}
              <div className="space-y-4">
                {ticket.notes.filter((note: any) => note.isFromEndUser).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    ยังไม่มีรายงานจากผู้ใช้
                  </p>
                ) : (
                  ticket.notes
                    .filter((note: any) => note.isFromEndUser)
                    .map((note: any) => (
                      <div
                        key={note.id}
                        className="border-l-2 border-green-500 bg-green-50 pl-4 py-2 rounded-r"
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm text-gray-900">
                            {note.createdBy}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(note.createdAt)}
                          </span>
                          {note.createdBy.includes('(via LINE)') && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                              📱 LINE User
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        {note.images && note.images.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {note.images.map((img: string, idx: number) => (
                              <a
                                key={idx}
                                href={img}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={img}
                                  alt={`Report image ${idx + 1}`}
                                  className="w-full h-20 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes - Only for staff */}
          {!isClientMode && (
            <Card className="border border-gray-200">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  บันทึกภายใน ({ticket.notes.filter((note: any) => !note.isFromEndUser && note.createdBy !== 'System').length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 bg-white">
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

                {/* Notes List */}
                <div className="space-y-3 mt-4">
                  {ticket.notes.filter((note: any) => !note.isFromEndUser && note.createdBy !== 'System').length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      ยังไม่มีบันทึก
                    </p>
                  ) : (
                    ticket.notes
                      .filter((note: any) => !note.isFromEndUser && note.createdBy !== 'System')
                      .map((note: any) => (
                        <div
                          key={note.id}
                          className="border-l-2 border-blue-500 pl-4 py-2"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">
                              {note.createdBy}
                            </span>
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
          <Card className="border border-gray-200">
            <CardHeader className="bg-white border-b">
              <CardTitle className="text-base">
                {isClientMode ? 'ยืนยันการแก้ไข' : 'จัดการสถานะ'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 bg-white">
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
                        ยืนยันว่าแก้ไขแล้ว
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
                    <div className="p-3 bg-gray-50 rounded-lg mb-3 border">
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
                      <div className="mt-2 p-2 bg-green-50 rounded-md border border-green-200">
                        <p className="text-xs text-green-700">
                          แผนกที่รับผิดชอบ: <strong>{departmentOptions.find(d => d.value === department)?.label}</strong>
                        </p>
                      </div>
                    )}
                    {!department && (
                      <div className="mt-2 p-2 bg-amber-50 rounded-md border border-amber-200">
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

          {/* View History - Show in staff mode */}
          {!isClientMode && (
            <Card className="border border-gray-200">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5 text-purple-600" />
                  ผู้เข้าชม ({ticket.views?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 bg-white">
                {ticket.views && ticket.views.length > 0 ? (
                  <>
                    {/* Avatar Stack */}
                    <div className="flex -space-x-3 mb-4">
                      {ticket.views.slice(0, 5).map((view, idx) => (
                        <div
                          key={view.id}
                          className="relative inline-block ring-2 ring-white rounded-full"
                          style={{ zIndex: 10 - idx }}
                          title={`${view.viewerName} - ${new Date(view.viewedAt).toLocaleString('th-TH')}`}
                        >
                          {view.viewerAvatar ? (
                            <img
                              src={view.viewerAvatar}
                              alt={view.viewerName}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {view.viewerName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      {ticket.views.length > 5 && (
                        <div
                          className="w-10 h-10 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center"
                          style={{ zIndex: 5 }}
                        >
                          <span className="text-gray-600 text-xs font-medium">
                            +{ticket.views.length - 5}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Latest Viewers List */}
                    <div className="space-y-2">
                      {ticket.views.slice(0, 3).map((view) => (
                        <div key={view.id} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-900">{view.viewerName}</span>
                          {view.viewerLineId && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              LINE
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">ยังไม่มีผู้เข้าชม</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ticket Creator Info - Only show in staff mode - Show CEC User */}
          {!isClientMode && (
            <Card className="border border-gray-200">
              <CardHeader className="bg-white border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5 text-blue-600" />
                  ผู้สร้าง Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-6 bg-white">
                <div className="space-y-2">
                  <div className="text-base font-semibold text-gray-900">{ticket.customer.name}</div>
                  {ticket.customer.phone && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-gray-400">📞</span>
                      {ticket.customer.phone}
                    </div>
                  )}
                  {ticket.customer.email && (
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-gray-400">✉️</span>
                      {ticket.customer.email}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600 pt-3 border-t">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{formatThaiDate(ticket.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
