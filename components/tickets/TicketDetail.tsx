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

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import StatusBadge from './StatusBadge';
import { TicketWithRelations, TicketStatus } from '@/types';
import { formatThaiDate, formatRelativeTime, getPriorityColor, getPriorityLabel, getStatusLabel } from '@/lib/utils';
import { getDepartmentOptions } from '@/config/departments';
import { User, MessageSquare, Edit, CheckCircle, TrendingUp, History, Save, X, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { invalidateTicketsList, invalidateDashboardStats } from '@/lib/swr-utils';
import TicketInfoCard from './TicketInfoCard';

interface TicketDetailProps {
  ticket: TicketWithRelations;
  mutate?: () => void; // SWR mutate function for refreshing data
  viewMode?: string; // Optional view mode parameter
}

export default function TicketDetail({ ticket, mutate }: TicketDetailProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [department, setDepartment] = useState<string | null>(ticket.department || null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStaffName, setCurrentStaffName] = useState<string>('Staff');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedEdits, setExpandedEdits] = useState<Set<string>>(new Set());

  // Edit form state
  const [editForm, setEditForm] = useState({
    trackingNo: ticket.trackingNo || '',
    issueType: ticket.issueType,
    issueTypeOther: ticket.issueTypeOther || '',
    salesforceId: ticket.salesforceId || '',
    recipientName: ticket.recipientName,
    recipientPhone: ticket.recipientPhone,
    recipientAddress: ticket.recipientAddress,
    description: ticket.description,
    zoneId: ticket.zoneId || '',
  });

  const departmentOptions = getDepartmentOptions();

  // Update local state when ticket prop changes (real-time updates)
  useEffect(() => {
    setStatus(ticket.status);
    setDepartment(ticket.department || null);
    // Reset edit form when ticket changes
    setEditForm({
      trackingNo: ticket.trackingNo || '',
      issueType: ticket.issueType,
      issueTypeOther: ticket.issueTypeOther || '',
      salesforceId: ticket.salesforceId || '',
      recipientName: ticket.recipientName,
      recipientPhone: ticket.recipientPhone,
      recipientAddress: ticket.recipientAddress,
      description: ticket.description,
      zoneId: ticket.zoneId || '',
    });
  }, [ticket]);

  // Fetch current staff user info
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user?.name) {
          setCurrentStaffName(data.user.name);
        }
      })
      .catch(err => console.error('Failed to fetch current user:', err));
  }, []);

  const handleStatusUpdate = async (newStatus: TicketStatus) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolvedBy: currentStaffName,
          changedByStaffName: currentStaffName,
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
        // Invalidate tickets list and dashboard to show updated status
        invalidateTicketsList();
        invalidateDashboardStats();
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

      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        setDepartment(newDepartment === 'none' ? null : newDepartment);
        toast({
          variant: 'success',
          title: 'สำเร็จ!',
          description: 'เลือกแผนกเรียบร้อยแล้ว',
        });
        // Refresh data using SWR mutate
        if (mutate) {
          mutate();
        }
        // Invalidate tickets list and dashboard to show updated department
        invalidateTicketsList();
        invalidateDashboardStats();
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
            createdBy: currentStaffName,
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

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          variant: 'success',
          title: 'สำเร็จ!',
          description: 'อัปเดตข้อมูลเรียบร้อยแล้ว',
        });
        setIsEditing(false);
        // Refresh data using SWR mutate
        if (mutate) {
          mutate();
        }
        // Invalidate tickets list and dashboard to show updated data
        invalidateTicketsList();
        invalidateDashboardStats();
      } else {
        toast({
          variant: 'error',
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถอัปเดตข้อมูลได้',
        });
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        variant: 'error',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset form to original ticket values
    setEditForm({
      trackingNo: ticket.trackingNo || '',
      issueType: ticket.issueType,
      issueTypeOther: ticket.issueTypeOther || '',
      salesforceId: ticket.salesforceId || '',
      recipientName: ticket.recipientName,
      recipientPhone: ticket.recipientPhone,
      recipientAddress: ticket.recipientAddress,
      description: ticket.description,
      zoneId: ticket.zoneId || '',
    });
    setIsEditing(false);
  };

  // Helper function to get Thai field name
  const getFieldNameThai = (fieldName: string): string => {
    const fieldNameMap: Record<string, string> = {
      trackingNo: 'หมายเลขสิ่งของ',
      issueType: 'ประเภทปัญหา',
      issueTypeOther: 'รายละเอียดปัญหา (อื่นๆ)',
      recipientName: 'ชื่อผู้รับ',
      recipientPhone: 'เบอร์โทรศัพท์',
      recipientAddress: 'ที่อยู่',
      description: 'รายละเอียดปัญหา',
      zoneId: 'Zone ID',
    };
    return fieldNameMap[fieldName] || fieldName;
  };

  // Helper function to format field value for display
  const formatFieldValue = (fieldName: string, value: string | null): string => {
    if (value === null || value === '') return '-';

    // Special formatting for issueType
    if (fieldName === 'issueType') {
      const issueTypeMap: Record<string, string> = {
        NEW_DELIVERY: 'นำจ่ายใหม่',
        CHECK_DELIVERY: 'ตรวจสอบการนำจ่าย',
        SERVICE_COMPLAINT: 'ร้องเรียนบริการ',
        RETURN_REQUEST: 'ขอถอนคืน',
        ADDRESS_CORRECTION: 'ขอแก้ไขจ่าหน้า',
        OTHER: 'อื่นๆ',
      };
      return issueTypeMap[value] || value;
    }

    return value;
  };

  // Toggle expand/collapse for a field edit group
  const toggleEditExpand = (editId: string) => {
    setExpandedEdits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(editId)) {
        newSet.delete(editId);
      } else {
        newSet.add(editId);
      }
      return newSet;
    });
  };

  // Get all notes (both user reports and internal)
  const allNotes = ticket.notes || [];

  // Get status history for timeline (separate from notes)
  const statusHistory = ticket.statusHistory || [];

  // Get field edits for timeline
  const fieldEdits = ticket.fieldEdits || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{ticket.ticketNo}</h1>
                <StatusBadge status={status} />
                <Badge className={`${getPriorityColor(ticket.priority)} text-white border-0`}>
                  {getPriorityLabel(ticket.priority)}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">
                สร้างเมื่อวันที่ {formatThaiDate(ticket.createdAt)}
              </p>
            </div>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                แก้ไข
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={loading}>
                  <X className="h-4 w-4 mr-2" />
                  ยกเลิก
                </Button>
                <Button variant="default" size="sm" onClick={handleSaveEdit} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  บันทึก
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Information Card */}
            <TicketInfoCard
              ticket={ticket}
              isEditing={isEditing}
              editForm={editForm}
              onFormChange={(updates) => setEditForm({ ...editForm, ...updates })}
            />

            {/* Notes/Comments Section */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-white border-b border-gray-200 pb-4">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MessageSquare className="h-5 w-5 text-gray-700" />
                  บันทึก
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-6 pb-6 border-b">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="เพิ่มบันทึกหรือความคิดเห็น..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <Button onClick={handleAddNote} disabled={loading || !newNote.trim()} size="sm">
                      เพิ่มบันทึก
                    </Button>
                  </div>
                </div>

                {/* Notes List */}
                <div className="space-y-4">
                  {allNotes.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">ยังไม่มีบันทึก</p>
                  ) : (
                    allNotes.map((note: any) => (
                      <div key={note.id} className="flex gap-3">
                        {/* Avatar - LINE user or Staff initial */}
                        <div className="flex-shrink-0">
                          {note.createdByLineAvatar ? (
                            <Image
                              src={note.createdByLineAvatar}
                              alt={note.createdByLineName || note.createdBy}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {note.createdBy.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {note.createdByLineName || note.createdBy}
                            </span>
                            <span className="text-xs text-gray-500">
                              • {formatRelativeTime(note.createdAt)}
                            </span>
                            {note.isFromEndUser && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                LINE User
                              </Badge>
                            )}
                            {note.createdBy === 'System' && (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                                ระบบ
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                          {note.images && note.images.length > 0 && (
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {note.images.map((img: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={img}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block relative h-24"
                                  aria-label={`View image ${idx + 1}`}
                                >
                                  <Image
                                    src={img}
                                    alt={`Image ${idx + 1}`}
                                    fill
                                    className="object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity cursor-pointer"
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Statistics Card */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-white border-b border-gray-200 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  สถานะ
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                  {/* Status Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">สถานะปัจจุบัน</span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">ระดับความสำคัญ</span>
                      <Badge className={`${getPriorityColor(ticket.priority)} text-white border-0 text-xs`}>
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">ผู้สร้าง</span>
                      <span className="text-sm font-medium text-gray-900">
                        {(ticket as any).createdBy || 'CEC Staff'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">ผู้เข้าชม</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {ticket.views?.length || 0}
                      </span>
                    </div>
                  </div>

                  {/* Department Select */}
                  <div className="pt-4 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      แผนกรับผิดชอบ
                    </label>
                    <Select
                      value={department || 'none'}
                      onValueChange={handleDepartmentUpdate}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เลือกแผนก" />
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
                  </div>

                  {/* Close Ticket Button */}
                  {status !== 'CLOSED' && (
                    <div className="pt-4">
                      <Button
                        onClick={() => handleStatusUpdate('CLOSED')}
                        disabled={loading}
                        variant="outline"
                        className="w-full border-red-300 text-red-700 hover:bg-red-50"
                        size="sm"
                      >
                        ปิด Ticket
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Timeline Card */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="bg-white border-b border-gray-200 pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <History className="h-5 w-5 text-purple-600" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Status History Timeline Items */}
                  {statusHistory.map((history: any, idx: number) => (
                    <div key={history.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {/* Avatar - LINE user or Staff initial */}
                        {history.changedByLineAvatar ? (
                          <Image
                            src={history.changedByLineAvatar}
                            alt={history.changedByLineName || history.changedBy}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-blue-600">
                              {history.changedBy.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {(idx < statusHistory.length || fieldEdits.length > 0) && (
                          <div className="w-0.5 h-full bg-gray-200 mt-1 min-h-[20px]" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-sm text-gray-900 font-medium mb-1">
                          {history.changedByLineName || history.changedBy} เปลี่ยนสถานะจาก{' '}
                          <span className="font-semibold">{getStatusLabel(history.fromStatus)}</span>
                          {' '}เป็น{' '}
                          <span className="font-semibold">{getStatusLabel(history.toStatus)}</span>
                        </p>
                        {history.note && (
                          <p className="text-xs text-gray-600 mb-1">{history.note}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(history.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Field Edit History - Grouped by editedAt timestamp */}
                  {(() => {
                    // Group field edits by timestamp (within 1 second = same batch)
                    const editGroups: Record<string, typeof fieldEdits> = {};
                    fieldEdits.forEach((edit: any) => {
                      const timestamp = new Date(edit.editedAt).getTime();
                      // Round to nearest second to group edits from same action
                      const groupKey = Math.floor(timestamp / 1000).toString();
                      if (!editGroups[groupKey]) {
                        editGroups[groupKey] = [];
                      }
                      editGroups[groupKey].push(edit);
                    });

                    return Object.entries(editGroups).map(([groupKey, edits], groupIdx) => {
                      const firstEdit = edits[0];
                      const isExpanded = expandedEdits.has(groupKey);
                      const editCount = edits.length;

                      return (
                        <div key={groupKey} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            {/* Edit Icon */}
                            {firstEdit.editedByLineAvatar ? (
                              <Image
                                src={firstEdit.editedByLineAvatar}
                                alt={firstEdit.editedByLineName || firstEdit.editedBy}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <Pencil className="w-3.5 h-3.5 text-amber-600" />
                              </div>
                            )}
                            {groupIdx < Object.keys(editGroups).length - 1 && (
                              <div className="w-0.5 h-full bg-gray-200 mt-1 min-h-[20px]" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            {/* Collapsible Header */}
                            <button
                              type="button"
                              onClick={() => toggleEditExpand(groupKey)}
                              className="w-full text-left hover:bg-gray-50 rounded px-2 py-1 -mx-2 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                )}
                                <p className="text-sm text-gray-900 font-medium flex-1">
                                  {firstEdit.editedByLineName || firstEdit.editedBy} แก้ไขข้อมูล{' '}
                                  <span className="text-amber-700">
                                    ({editCount} ฟิลด์)
                                  </span>
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 ml-6">
                                {formatRelativeTime(firstEdit.editedAt)}
                              </p>
                            </button>

                            {/* Expanded Field Changes */}
                            {isExpanded && (
                              <div className="ml-6 mt-2 space-y-2 border-l-2 border-amber-200 pl-3">
                                {edits.map((edit: any) => (
                                  <div key={edit.id} className="text-xs">
                                    <p className="font-medium text-gray-700 mb-1">
                                      {getFieldNameThai(edit.fieldName)}
                                    </p>
                                    <div className="flex items-center gap-2 text-gray-600">
                                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded">
                                        {formatFieldValue(edit.fieldName, edit.oldValue)}
                                      </span>
                                      <span>→</span>
                                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                        {formatFieldValue(edit.fieldName, edit.newValue)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* Created Event - Always show */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium mb-1">
                        Ticket ถูกสร้างโดย {(ticket as any).createdBy || 'CEC Staff'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatThaiDate(ticket.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View History */}
            {ticket.views && ticket.views.length > 0 && (
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="bg-white border-b border-gray-200 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <User className="h-5 w-5 text-purple-600" />
                    ผู้เข้าชม
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {ticket.views.slice(0, 5).map((view) => (
                      <div key={view.id} className="flex items-center gap-3">
                        {view.viewerAvatar ? (
                          <Image
                            src={view.viewerAvatar}
                            alt={view.viewerName}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-purple-700">
                              {view.viewerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {view.viewerName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatRelativeTime(view.viewedAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
