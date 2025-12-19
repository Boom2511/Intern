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
import { Package, MapPin, FileText, Tag } from 'lucide-react';
import { getIssueTypeLabel, getIssueTypeOptions } from '@/config/issue-types';
import { TicketWithRelations } from '@/types';
import { IssueType } from '@prisma/client';

interface TicketInfoCardProps {
  ticket: TicketWithRelations;
  isEditing: boolean;
  editForm: {
    trackingNo: string;
    issueType: IssueType;
    issueTypeOther: string;
    recipientName: string;
    recipientPhone: string;
    recipientAddress: string;
    description: string;
    zoneId: string;
  };
  onFormChange: (updates: Partial<TicketInfoCardProps['editForm']>) => void;
}

export default function TicketInfoCard({ ticket, isEditing, editForm, onFormChange }: TicketInfoCardProps) {
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
        {/* Issue Type and Tracking Number Row */}
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
                    <SelectTrigger className="w-full">
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
                  {/* Show input for OTHER immediately when selected */}
                  {editForm.issueType === 'OTHER' && (
                    <Input
                      value={editForm.issueTypeOther}
                      onChange={(e) => onFormChange({ issueTypeOther: e.target.value })}
                      placeholder="กรุณาระบุรายละเอียดปัญหา"
                      className="w-full"
                    />
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

          {/* Tracking Number */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Package className="h-4 w-4" />
              <span>หมายเลขสิ่งของ</span>
            </div>
            <div className="pl-6">
              {isEditing ? (
                <Input
                  value={editForm.trackingNo}
                  onChange={(e) => onFormChange({ trackingNo: e.target.value })}
                  placeholder="เช่น EM123456789TH"
                  className="w-full"
                />
              ) : (
                ticket.trackingNo && (
                  <span className="text-sm font-mono text-gray-900 bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                    {ticket.trackingNo}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Zone ID Row */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span>Zone ID</span>
          </div>
          <div className="pl-6">
            {isEditing ? (
              <Input
                value={editForm.zoneId}
                onChange={(e) => onFormChange({ zoneId: e.target.value })}
                placeholder="Zone ID (ถ้ามี)"
                className="w-full"
              />
            ) : (
              ticket.zoneId && (
                <span className="text-sm text-gray-900">{ticket.zoneId}</span>
              )
            )}
          </div>
        </div>

        {/* Salesforce ID Row */}
        {ticket.salesforceId && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              <span>Salesforce ID</span>
            </div>
            <div className="pl-6">
              <span className="text-sm font-mono text-gray-900 bg-purple-50 px-3 py-1.5 rounded border border-purple-200">
                {ticket.salesforceId}
              </span>
            </div>
          </div>
        )}

        {/* Recipient Information */}
        <div className="border-t pt-5">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <MapPin className="h-4 w-4" />
            <span>ข้อมูลผู้รับ</span>
          </div>
          <div className="pl-6 space-y-4">
            {/* Recipient Name */}
            <div>
              <label className="text-sm text-gray-500 block mb-1.5">ชื่อผู้รับ</label>
              {isEditing ? (
                <Input
                  value={editForm.recipientName}
                  onChange={(e) => onFormChange({ recipientName: e.target.value })}
                  placeholder="กรอกชื่อผู้รับ"
                  className="w-full"
                />
              ) : (
                <span className="text-sm text-gray-900 font-medium">{ticket.recipientName}</span>
              )}
            </div>

            {/* Recipient Phone */}
            <div>
              <label className="text-sm text-gray-500 block mb-1.5">เบอร์โทรศัพท์</label>
              {isEditing ? (
                <Input
                  value={editForm.recipientPhone}
                  onChange={(e) => onFormChange({ recipientPhone: e.target.value })}
                  placeholder="เช่น 0812345678"
                  className="w-full"
                />
              ) : (
                <span className="text-sm text-gray-900">{ticket.recipientPhone}</span>
              )}
            </div>

            {/* Recipient Address */}
            <div>
              <label className="text-sm text-gray-500 block mb-1.5">ที่อยู่</label>
              {isEditing ? (
                <Textarea
                  value={editForm.recipientAddress}
                  onChange={(e) => onFormChange({ recipientAddress: e.target.value })}
                  placeholder="กรอกที่อยู่ผู้รับพัสดุ"
                  rows={3}
                  className="w-full"
                />
              ) : (
                <span className="text-sm text-gray-900">{ticket.recipientAddress}</span>
              )}
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
            <Textarea
              value={editForm.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="อธิบายรายละเอียดปัญหา"
              rows={5}
              className="w-full"
            />
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
