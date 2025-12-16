'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, LogOut, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useUser } from '@/providers/UserProvider';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMINISTRATOR' | 'ADMIN' | 'OPERATOR';
  isActive: boolean;
  createdAt: string;
}

export default function StaffPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useUser(); // Use context instead of fetching
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [lineQuota, setLineQuota] = useState<{ used: number; quota: number; percentage: number } | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'OPERATOR' as 'ADMINISTRATOR' | 'ADMIN' | 'OPERATOR',
  });
  const [passwordError, setPasswordError] = useState('');

  // Check permission on mount
  useEffect(() => {
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser.role === 'OPERATOR') {
      router.push('/dashboard');
      return;
    }

    // Load initial data
    loadUsers();
    loadOnlineStatus();
    loadLineQuota();

    // Poll online status every 30 seconds
    const onlineInterval = setInterval(loadOnlineStatus, 30000);
    // Poll LINE quota every 60 seconds
    const quotaInterval = setInterval(loadLineQuota, 60000);

    return () => {
      clearInterval(onlineInterval);
      clearInterval(quotaInterval);
    };
  }, [currentUser, router]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Sort users by role: ADMINISTRATOR first, then ADMIN, then OPERATOR
        const roleOrder = { ADMINISTRATOR: 1, ADMIN: 2, OPERATOR: 3 };
        const sortedUsers = data.users.sort((a: User, b: User) => {
          return roleOrder[a.role] - roleOrder[b.role];
        });
        setUsers(sortedUsers);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOnlineStatus = async () => {
    try {
      const response = await fetch('/api/users/online-status');
      if (response.ok) {
        const data = await response.json();
        setOnlineUserIds(data.onlineUserIds || []);
      }
    } catch (error) {
      console.error('Failed to load online status:', error);
    }
  };

  const loadLineQuota = async () => {
    try {
      const response = await fetch('/api/line/quota');
      if (response.ok) {
        const data = await response.json();
        setLineQuota({
          used: data.used,
          quota: data.quota,
          percentage: data.percentage,
        });
      }
    } catch (error) {
      console.error('Failed to load LINE quota:', error);
    }
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setPasswordError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError('รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว');
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError('รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว');
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError('รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password if creating new user or changing password
    if (!editingUser && !validatePassword(formData.password)) {
      return;
    }
    if (editingUser && formData.password && !validatePassword(formData.password)) {
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser ? {
          ...formData,
          email: formData.email, // Use username directly
          password: formData.password || undefined, // Only send password if changed
        } : {
          ...formData,
          email: formData.email, // Use username directly
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        resetForm();
        loadUsers();
        toast({
          title: editingUser ? 'อัปเดตผู้ใช้สำเร็จ' : 'เพิ่มผู้ใช้สำเร็จ',
          description: editingUser ? `อัปเดตข้อมูล ${formData.name} เรียบร้อยแล้ว` : `เพิ่ม ${formData.name} เป็นผู้ใช้ใหม่แล้ว`,
        });
      } else {
        const data = await response.json();
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถบันทึกข้อมูลได้',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'error',
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('ต้องการลบผู้ใช้นี้หรือไม่?')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadUsers();
        toast({
          title: 'ลบผู้ใช้สำเร็จ',
          description: 'ลบผู้ใช้ออกจากระบบเรียบร้อยแล้ว',
        });
      } else {
        const data = await response.json();
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: data.error || 'ไม่สามารถลบผู้ใช้ได้',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบผู้ใช้ได้',
        variant: 'error',
      });
    }
  };

  const handleEdit = (user: User) => {
    // Admin cannot edit Administrator users
    if (currentUser?.role === 'ADMIN' && user.role === 'ADMINISTRATOR') {
      toast({
        title: 'ไม่มีสิทธิ์',
        description: 'Admin ไม่สามารถแก้ไข Administrator ได้',
        variant: 'error',
      });
      return;
    }

    setEditingUser(user);
    setFormData({
      email: user.email, // Use full email/username directly
      password: '',
      name: user.name,
      role: user.role,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'OPERATOR',
    });
    setPasswordError('');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR': return 'bg-purple-100 text-purple-800';
      case 'ADMIN': return 'bg-blue-100 text-blue-800';
      case 'OPERATOR': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR': return 'Administrator';
      case 'ADMIN': return 'Admin';
      case 'OPERATOR': return 'Operator';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* LINE API Quota Bar */}
      {lineQuota && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">LINE API Quota</h3>
                  <p className="text-xs text-gray-500">{lineQuota.used} / {lineQuota.quota} messages</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{lineQuota.used}/{lineQuota.quota}</div>
                <div className="text-xs text-gray-500">{lineQuota.percentage}% ใช้ไปแล้ว</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${lineQuota.percentage >= 90 ? 'bg-red-500' :
                    lineQuota.percentage >= 70 ? 'bg-yellow-500' :
                      'bg-green-500'
                  }`}
                style={{ width: `${Math.min(lineQuota.percentage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            กลับ
          </Button>
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-gray-500 mt-1">จัดการผู้ใช้งานระบบ</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มผู้ใช้ใหม่
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้ใหม่'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">ชื่อผู้ใช้</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="username"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    รหัสผ่าน {editingUser && '(เว้นว่างหากไม่ต้องการเปลี่ยน)'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setPasswordError('');
                    }}
                    required={!editingUser}
                    placeholder="ขั้นต่ำ 8 ตัว (A-Z, a-z, 0-9)"
                  />
                  {passwordError && (
                    <p className="text-red-500 text-sm">{passwordError}</p>
                  )}
                  {!editingUser && (
                    <p className="text-gray-500 text-xs">
                      ต้องมี: ตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, ตัวเลข, อย่างน้อย 8 ตัวอักษร
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">ชื่อ</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label id="role-label" htmlFor="role">สิทธิ์การใช้งาน</Label>

                  <select
                    id="role"
                    name="role" 
                    className="w-full border rounded-md p-2"
                    aria-labelledby="role-label" 
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    disabled={editingUser?.role === 'ADMINISTRATOR' && currentUser?.role === 'ADMIN'}
                  >
                    <option value="OPERATOR">Operator - ใช้งาน CEC เท่านั้น</option>
                    <option value="ADMIN">Admin - จัดการผู้ใช้ + CEC</option>
                    {currentUser?.role === 'ADMINISTRATOR' && (
                      <option value="ADMINISTRATOR">Administrator - เข้าถึงทุกอย่าง</option>
                    )}
                  </select>
                  {currentUser?.role === 'ADMIN' && (
                    <p className="text-gray-500 text-xs">
                      Admin ไม่สามารถมอบหรือแก้ไขสิทธิ์ Administrator ได้
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">
                    {editingUser ? 'บันทึก' : 'เพิ่มผู้ใช้'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายชื่อผู้ใช้ทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">ชื่อ</th>
                  <th className="text-left p-3 font-medium">Username</th>
                  <th className="text-left p-3 font-medium">สิทธิ์</th>
                  <th className="text-left p-3 font-medium">สถานะ</th>
                  <th className="text-right p-3 font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {user.name}
                        {user.id === currentUser?.id && (
                          <Badge className="text-xs" variant="outline">You</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {onlineUserIds.includes(user.id) ? (
                          <Badge className="text-xs bg-green-100 text-green-800 border-0">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                            Online
                          </Badge>
                        ) : (
                          <Badge className="text-xs bg-gray-100 text-gray-600 border-0">
                            Offline
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {!(currentUser?.role === 'ADMIN' && user.role === 'ADMINISTRATOR') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {currentUser?.role === 'ADMIN' && user.role === 'ADMINISTRATOR' && (
                          <span className="text-gray-400 text-xs">ไม่สามารถแก้ไขได้</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold mb-2">สิทธิ์การใช้งาน</h3>
        <ul className="space-y-1 text-sm text-gray-700">
          <li><strong>Administrator:</strong> เข้าถึงได้ทุกอย่าง รวมถึงหน้าทดสอบ</li>
          <li><strong>Admin:</strong> จัดการผู้ใช้งาน + ใช้งาน CEC </li>
          <li><strong>Operator:</strong> ใช้งาน CEC เท่านั้น </li>
        </ul>
      </div>
      <Toaster />
    </div>
  );
}
