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

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import StatusBadge from './StatusBadge';
import { TicketWithRelations, TicketStatus, Priority } from '@/types';
import { formatThaiDate, formatRelativeTime, getPriorityColor, getPriorityLabel } from '@/lib/utils';
import { STAFF_MEMBERS, TICKET_STATUSES } from '@/lib/constants';
import { getDepartmentOptions } from '@/config/departments';
import { getIssueTypeLabel } from '@/config/issue-types';
import { ROLE_NAMES, ROLE_LABELS } from '@/config/roles';
import { User, Phone, Mail, Clock, MessageSquare, Edit, UserCog, CheckCircle, Building2, AlertTriangle, Upload, X, Package, MapPin, FileText, Tag } from 'lucide-react';

interface TicketDetailProps {
  ticket: TicketWithRelations;
  viewMode?: 'staff' | 'client'; // staff = full control, client = limited to resolved status only
  mutate?: () => void; // SWR mutate function for refreshing data
}

export default function TicketDetail({ ticket, viewMode = 'staff', mutate }: TicketDetailProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [assignedTo, setAssignedTo] = useState<string>(ticket.assignedTo || '');
  const [department, setDepartment] = useState<string | null>(ticket.department || null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  // End user report state
  const [reportContent, setReportContent] = useState('');
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        toast({
          variant: 'success',
          title: 'สำเร็จ!',
          description: 'มอบหมายงานเรียบร้อยแล้ว',
        });
        // Refresh data using SWR mutate
        if (mutate) {
          mutate();
        }
      } else {
        toast({
          variant: 'error',
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถมอบหมายงานได้',
        });
      }
    } catch (error) {
      console.error('Error updating assignee:', error);
      toast({
        variant: 'error',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถมอบหมายงานได้ กรุณาลองใหม่อีกครั้ง',
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

  // Handle image selection for end user report
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 5 * 1024 * 1024; // 5MB per image

    // Validate file sizes
    for (const file of files) {
      if (file.size > maxSize) {
        toast({
          variant: 'warning',
          title: 'ไฟล์ขนาดใหญ่เกินไป',
          description: `ไฟล์ ${file.name} มีขนาดใหญ่เกิน 5MB`,
        });
        return;
      }
    }

    // Limit to 5 images
    if (reportImages.length + files.length > 5) {
      toast({
        variant: 'warning',
        title: 'จำนวนรูปเกินกำหนด',
        description: 'สามารถอัปโหลดได้สูงสุด 5 รูปเท่านั้น',
      });
      return;
    }

    // Add new images
    setReportImages([...reportImages, ...files]);

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = reportImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);

    // Revoke old preview URL
    URL.revokeObjectURL(imagePreviews[index]);

    setReportImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmitReport = async () => {
    if (!reportContent.trim()) {
      toast({
        variant: 'warning',
        title: 'กรุณากรอกข้อมูล',
        description: 'กรุณากรอกรายละเอียดปัญหา',
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('content', reportContent);
      formData.append('createdBy', ticket.customer.name);

      // Add images
      reportImages.forEach(image => {
        formData.append('images', image);
      });

      const response = await fetch(`/api/tickets/${ticket.id}/reports`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setReportContent('');
        setReportImages([]);
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
        setImagePreviews([]);
        toast({
          variant: 'success',
          title: 'สำเร็จ!',
          description: 'ส่งรายงานปัญหาเรียบร้อยแล้ว',
        });
        // Refresh data using SWR mutate
        if (mutate) {
          mutate();
        }
      } else {
        toast({
          variant: 'error',
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถส่งรายงานได้',
        });
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        variant: 'error',
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถส่งรายงานได้ กรุณาลองใหม่อีกครั้ง',
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
          {/* Ticket Information Card - Enhanced for Client Mode */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูล Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Issue Type and Tracking Number - Same Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-3 border-b">
                {/* Issue Type */}
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-600 block mb-1">ประเภทปัญหา</span>
                    <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
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
                    <Package className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-600 block mb-1">เลขพัสดุ</span>
                      <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {ticket.trackingNo}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Department - Show in client mode */}
              {isClientMode && ticket.department && (
                <div className="flex items-start gap-3 pb-3 border-b">
                  <Building2 className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-600 block mb-1">แผนกรับผิดชอบ</span>
                    <span className="text-sm font-medium text-gray-900">
                      {departmentOptions.find(d => d.value === ticket.department)?.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Recipient Information */}
              <div className="flex items-start gap-3 pb-3 border-b">
                <MapPin className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-600 block mb-2">ข้อมูลผู้รับ</span>
                  <div className="space-y-1 text-sm text-gray-900">
                    <div><strong>ชื่อ:</strong> {ticket.recipientName}</div>
                    <div><strong>เบอร์โทร:</strong> {ticket.recipientPhone}</div>
                    <div><strong>ที่อยู่:</strong> {ticket.recipientAddress}</div>
                  </div>
                </div>
              </div>

              {/* Salesforce ID - If available */}
              {isClientMode && ticket.salesforceId && (
                <div className="flex items-start gap-3 pb-3 border-b">
                  <FileText className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-600 block mb-1">Salesforce No.</span>
                    <span className="text-sm font-mono text-gray-900">
                      {ticket.salesforceId}
                    </span>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <span className="text-sm font-medium text-gray-600 block mb-2">รายละเอียดปัญหา</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                  {ticket.description}
                </p>
              </div>

              {/* Creator and Timestamp */}
              <div className="pt-3 border-t">
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

          {/* End User Problem Report - Only show in client mode */}
          {isClientMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg text-red-700">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5" />
                  {ROLE_LABELS.PROBLEM_REPORT_TITLE}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  หากพบปัญหาหรือต้องการแจ้งข้อมูลเพิ่มเติม กรุณากรอกรายละเอียดด้านล่าง
                </p>

                {/* Report Form */}
                <div className="space-y-4">
                  <textarea
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    placeholder="กรุณาอธิบายปัญหาที่พบ..."
                    rows={4}
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={reportImages.length >= 5}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        อัปโหลดรูปภาพ
                      </Button>
                      <span className="text-xs text-gray-500">
                        ({reportImages.length}/5 รูป, สูงสุด 5MB/รูป)
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                      aria-label="อัปโหลดรูปภาพ"
                    />

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-md border"
                            />
                            <button
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmitReport}
                    disabled={loading || !reportContent.trim()}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    ส่งรายงานปัญหา
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes/Comments - Show in both modes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <MessageSquare className="h-4 w-4 md:h-5 md:w-5" />
                {ROLE_LABELS.STAFF_NOTES} ({
                  isClientMode
                    ? ticket.notes.filter((note: any) => note.createdBy !== 'System').length
                    : ticket.notes.length
                })
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Note - Only in staff mode */}
              {!isClientMode && (
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
              )}

              {/* Notes Timeline - Show all notes */}
              <div className="space-y-4 mt-6">
                {ticket.notes.filter((note: any) => {
                  // Hide system notes from end users
                  if (isClientMode && note.createdBy === 'System') {
                    return false;
                  }
                  return true;
                }).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    ยังไม่มีบันทึก
                  </p>
                ) : (
                  ticket.notes
                    .filter((note: any) => {
                      // Hide system notes from end users
                      if (isClientMode && note.createdBy === 'System') {
                        return false;
                      }
                      return true;
                    })
                    .map((note: any) => (
                      <div
                        key={note.id}
                        className={`border-l-2 pl-4 py-2 ${
                          note.isFromEndUser
                            ? 'border-red-500 bg-red-50 rounded-r'
                            : 'border-blue-500'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {note.isFromEndUser
                              ? ROLE_NAMES.END_USER  // End user reports → "พนักงาน" for both
                              : (isClientMode ? ROLE_NAMES.ADMIN : ROLE_NAMES.ADMIN)  // CEC notes → "Admin" for both
                            }
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(note.createdAt)}
                          </span>
                          {note.isFromEndUser && (
                            <Badge variant="outline" className="text-xs bg-red-100 text-red-700 border-red-300">
                              {ROLE_LABELS.END_USER_REPORTS}
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

          {/* Ticket Creator Info - Only show in staff mode */}
          {!isClientMode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base md:text-lg">ผู้สร้าง Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
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
