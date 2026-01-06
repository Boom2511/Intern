/**
 * TicketInfoCard Component
 * Displays and allows editing of ticket information
 * Extracted from TicketDetail for better code organization
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, FileText, Tag, Truck } from 'lucide-react';
import { getIssueTypeLabel, getIssueTypeOptions } from '@/config/issue-types';
import { TicketWithRelations } from '@/types';
import { IssueType } from '@prisma/client';
import { cn, displayThaiPhone } from '@/lib/utils';

interface TicketInfoCardProps {
  ticket: TicketWithRelations;
  isEditing: boolean;
  editForm: {
    trackingNo: string;
    issueType: IssueType;
    issueTypeOther: string;
    salesforceId: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    description: string;
    zoneId: string;
  };
  errors?: {
    issueType?: string;
    issueTypeOther?: string;
    trackingNo?: string;
    zoneId?: string;
    salesforceId?: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    description?: string;
  };
  onFormChange: (updates: Partial<TicketInfoCardProps['editForm']>) => void;
}

export default function TicketInfoCard({ ticket, isEditing, editForm, errors = {}, onFormChange }: TicketInfoCardProps) {
  const issueTypeOptions = getIssueTypeOptions();

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="bg-white border-b border-gray-200 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FileText className="h-5 w-5 text-blue-600" />
          ข้อมูล Ticket
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-5">
        {/* Row 1: Issue Type and Salesforce ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Issue Type */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Tag className="h-4 w-4" />
              <span>ประเภทปัญหา</span>
            </div>
            <div className="pl-6">
              {isEditing ? (
                <div className="space-y-2">
                  <Select
                    value={editForm.issueType}
                    onValueChange={(value) => onFormChange({ issueType: value as IssueType })}
                  >
                    <SelectTrigger className={cn("w-full", errors.issueType && "border-red-500 focus-visible:ring-red-500")}>
                      <SelectValue placeholder="เลือกประเภทปัญหา" />
                    </SelectTrigger>
                    <SelectContent>
                      {issueTypeOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.issueType && <p className="text-xs text-red-500">{errors.issueType}</p>}
                  {/* Show input for OTHER immediately when selected */}
                  {editForm.issueType === 'OTHER' && (
                    <div className="space-y-1">
                      <Input
                        value={editForm.issueTypeOther}
                        onChange={(e) => onFormChange({ issueTypeOther: e.target.value })}
                        placeholder="กรุณาระบุรายละเอียดปัญหา"
                        className={cn("w-full", errors.issueTypeOther && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {errors.issueTypeOther && <p className="text-xs text-red-500">{errors.issueTypeOther}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700 font-medium">
                  {ticket.issueType === 'OTHER' && ticket.issueTypeOther
                    ? ticket.issueTypeOther
                    : getIssueTypeLabel(ticket.issueType)
                  }
                </Badge>
              )}
            </div>
          </div>

          {/* Salesforce ID - Show in Edit Mode or when value exists in View Mode */}
          {(isEditing || ticket.salesforceId) && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileText className="h-4 w-4" />
                <span>Salesforce ID</span>
              </div>
              <div className="pl-6">
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      value={editForm.salesforceId}
                      onChange={(e) => onFormChange({ salesforceId: e.target.value })}
                      placeholder="Salesforce ID (ถ้ามี)"
                      className={cn("w-full", errors.salesforceId && "border-red-500 focus-visible:ring-red-500")}
                    />
                    {errors.salesforceId && <p className="text-xs text-red-500">{errors.salesforceId}</p>}
                  </div>
                ) : (
                  <span className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                    {ticket.salesforceId}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Zone ID and Tracking Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Zone ID */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Truck className="h-4 w-4" />
              <span>Zone ID</span>
            </div>
            <div className="pl-6">
              {isEditing ? (
                <div className="space-y-1">
                  <Input
                    value={editForm.zoneId}
                    onChange={(e) => onFormChange({ zoneId: e.target.value })}
                    placeholder="Zone ID"
                    className={cn("w-full", errors.zoneId && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {errors.zoneId && <p className="text-xs text-red-500">{errors.zoneId}</p>}
                </div>
              ) : (
                ticket.zoneId ? (
                  <span className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                    {ticket.zoneId}</span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )
              )}
            </div>
          </div>

          {/* Tracking Number */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Package className="h-4 w-4" />
              <span>หมายเลขสิ่งของ</span>
            </div>
            <div className="pl-6">
              {isEditing ? (
                <div className="space-y-1">
                  <Input
                    value={editForm.trackingNo}
                    onChange={(e) => onFormChange({ trackingNo: e.target.value })}
                    placeholder="เช่น EM123456789TH"
                    className={cn("w-full", errors.trackingNo && "border-red-500 focus-visible:ring-red-500")}
                  />
                  {errors.trackingNo && <p className="text-xs text-red-500">{errors.trackingNo}</p>}
                </div>
              ) : (
                ticket.trackingNo ? (
                  <span className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                    {ticket.trackingNo}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Recipient Information  */}
        <div className="border-t pt-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <MapPin className="h-4 w-4" />
            <span>ข้อมูลผู้รับ</span>
          </div>

          <div className="pl-6">
            <div className="space-y-3 text-sm">
              {/* ชื่อผู้รับ */}
              <div className="flex items-start">
                <div className="w-32 text-gray-500 flex-shrink-0">
                  ชื่อ {isEditing && <span className="text-red-500">*</span>}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-1">
                      <Input
                        value={editForm.recipientName}
                        onChange={(e) => onFormChange({ recipientName: e.target.value })}
                        placeholder="ชื่อผู้รับ"
                        className={cn(errors.recipientName && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {errors.recipientName && <p className="text-xs text-red-500">{errors.recipientName}</p>}
                    </div>
                  ) : (
                    <div className="font-mono text-gray-900">
                      {ticket.recipientName}
                    </div>
                  )}
                </div>
              </div>

              {/* เบอร์โทรศัพท์ */}
              <div className="flex items-start">
                <div className="w-32 text-gray-500 flex-shrink-0">
                  เบอร์โทรศัพท์ {isEditing && <span className="text-red-500">*</span>}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-1">
                      <Input
                        value={editForm.recipientPhone}
                        onChange={(e) => onFormChange({ recipientPhone: e.target.value })}
                        placeholder="เบอร์โทรศัพท์"
                        className={cn(errors.recipientPhone && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {errors.recipientPhone && <p className="text-xs text-red-500">{errors.recipientPhone}</p>}
                    </div>
                  ) : (
                    <div className="font-mono text-gray-900">
                      {displayThaiPhone(ticket.recipientPhone)}
                    </div>
                  )}
                </div>
              </div>

              {/* ที่อยู่ */}
              <div className="flex items-start">
                <div className="w-32 text-gray-500 flex-shrink-0">
                  ที่อยู่ {isEditing && <span className="text-red-500">*</span>}
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-1">
                      <Textarea
                        value={editForm.recipientAddress}
                        onChange={(e) => onFormChange({ recipientAddress: e.target.value })}
                        placeholder="ที่อยู่ผู้รับ"
                        rows={2}
                        className={cn("min-h-[60px]", errors.recipientAddress && "border-red-500 focus-visible:ring-red-500")}
                      />
                      {errors.recipientAddress && <p className="text-xs text-red-500">{errors.recipientAddress}</p>}
                    </div>
                  ) : (
                    <div className="font-mono text-gray-900">
                      {ticket.recipientAddress}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border-t pt-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <FileText className="h-4 w-4" />
            <span>รายละเอียดปัญหา</span>
          </div>
          {isEditing ? (
            <div className="space-y-1.5">
              <Textarea
                value={editForm.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                placeholder="อธิบายรายละเอียดปัญหา"
                rows={5}
                className={cn("w-full", errors.description && "border-red-500 focus-visible:ring-red-500")}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
