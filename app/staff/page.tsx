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

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMINISTRATOR' | 'ADMIN' | 'OPERATOR';
  isActive: boolean;
  createdAt: string;
}

interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMINISTRATOR' | 'ADMIN' | 'OPERATOR';
}

export default function StaffPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'OPERATOR' as 'ADMINISTRATOR' | 'ADMIN' | 'OPERATOR',
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);

        // Check if user has permission to view this page
        if (data.user.role === 'OPERATOR') {
          router.push('/dashboard');
          return;
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
      router.push('/login');
    }
  };

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

    // Build email with @Postserve.ac.th
    const emailUsername = formData.email.split('@')[0];
    const fullEmail = `${emailUsername}@postserve.ac.th`;

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser ? {
          ...formData,
          email: fullEmail,
          password: formData.password || undefined, // Only send password if changed
        } : {
          ...formData,
          email: fullEmail,
        }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        resetForm();
        loadUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      alert('Failed to save user');
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
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const handleEdit = (user: User) => {
    // Admin cannot edit Administrator users
    if (currentUser?.role === 'ADMIN' && user.role === 'ADMINISTRATOR') {
      alert('Admin ไม่สามารถแก้ไข Administrator ได้');
      return;
    }

    setEditingUser(user);
    // Extract username from email
    const emailUsername = user.email.split('@')[0];
    setFormData({
      email: emailUsername,
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
                  <Label htmlFor="email">อีเมล</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email"
                      type="text"
                      placeholder="username"
                      value={formData.email}
                      onChange={(e) => {
                        const value = e.target.value.split('@')[0];
                        setFormData({...formData, email: value});
                      }}
                      required
                      className="flex-1"
                    />
                    <span className="text-gray-500">@Postserve.ac.th</span>
                  </div>
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
                      setFormData({...formData, password: e.target.value});
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
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">สิทธิ์การใช้งาน</Label>
                  <select
                    id="role"
                    className="w-full border rounded-md p-2"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
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
                  <th className="text-left p-3 font-medium">อีเมล</th>
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
                          <>
                            <Badge className="text-xs bg-green-100 text-green-800">Online</Badge>
                            <Badge className="text-xs" variant="outline">You</Badge>
                          </>
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
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
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
          <li><strong>Admin:</strong> จัดการผู้ใช้งาน + ใช้งาน CEC (ไม่เห็นหน้าทดสอบ)</li>
          <li><strong>Operator:</strong> ใช้งาน CEC เท่านั้น (ไม่เห็นการจัดการผู้ใช้และหน้าทดสอบ)</li>
        </ul>
      </div>
    </div>
  );
}
