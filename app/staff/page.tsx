/**
 * Staff Management Page
 * หน้าจัดการรายชื่อพนักงาน
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserCog, Plus, Trash2, Edit2, X, Check } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
}

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([
    { id: '1', name: 'พี่นัท' },
    { id: '2', name: 'พี่นพ' },
  ]);
  const [newStaffName, setNewStaffName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddStaff = () => {
    if (!newStaffName.trim()) {
      alert('กรุณากรอกชื่อพนักงาน');
      return;
    }

    const newId = (Math.max(...staff.map(s => parseInt(s.id)), 0) + 1).toString();
    setStaff([...staff, { id: newId, name: newStaffName.trim() }]);
    setNewStaffName('');
  };

  const handleDeleteStaff = (id: string) => {
    if (confirm('ต้องการลบพนักงานคนนี้?')) {
      setStaff(staff.filter(s => s.id !== id));
    }
  };

  const handleStartEdit = (member: StaffMember) => {
    setEditingId(member.id);
    setEditingName(member.name);
  };

  const handleSaveEdit = () => {
    if (!editingName.trim()) {
      alert('กรุณากรอกชื่อพนักงาน');
      return;
    }

    setStaff(staff.map(s =>
      s.id === editingId ? { ...s, name: editingName.trim() } : s
    ));
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">จัดการรายชื่อพนักงาน</h1>
        <p className="text-gray-600 mt-2">
          เพิ่ม แก้ไข หรือลบรายชื่อพนักงานที่สามารถรับผิดชอบ Ticket
        </p>
      </div>

      {/* Add New Staff */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            เพิ่มพนักงานใหม่
          </CardTitle>
          <CardDescription>
            กรอกชื่อพนักงานที่ต้องการเพิ่ม
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="ชื่อพนักงาน"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddStaff()}
              className="flex-1"
            />
            <Button onClick={handleAddStaff}>
              <Plus className="h-4 w-4 mr-2" />
              เพิ่ม
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            รายชื่อพนักงานทั้งหมด ({staff.length} คน)
          </CardTitle>
          <CardDescription>
            คลิกแก้ไขเพื่อเปลี่ยนชื่อ หรือลบเพื่อนำออกจากระบบ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserCog className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>ยังไม่มีพนักงานในระบบ</p>
              <p className="text-sm">เพิ่มพนักงานคนแรกได้เลย</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition"
                >
                  {editingId === member.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="flex-1 mr-3"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleSaveEdit}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <UserCog className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{member.name}</p>
                          <p className="text-sm text-gray-500">ID: {member.id}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(member)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          แก้ไข
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteStaff(member.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          ลบ
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      
    </div>
  );
}
