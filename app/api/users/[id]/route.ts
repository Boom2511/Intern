import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword, Permission, hasPermission } from '@/lib/auth';
import { resolveBranchDepartment } from '@/lib/branch-organization';
import { isTestDepartment } from '@/config/departments';

// PATCH - Update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !hasPermission(currentUser.role, Permission.MANAGE_USERS)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { username, password, name, role, department, isActive, branchId } = await request.json();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!currentUser.isSuperAdmin &&
      (existingUser.isSuperAdmin || existingUser.branchId !== currentUser.branchId)) {
      return NextResponse.json({ error: 'User not found in your branch' }, { status: 404 });
    }

    if (!currentUser.isSuperAdmin && currentUser.branchId === null) {
      return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};

    if (username !== undefined) {
      // Check if new username is already taken
      const usernameTaken = await prisma.user.findFirst({
        where: {
          username,
          id: { not: id }
        }
      });

      if (usernameTaken) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        );
      }

      updateData.username = username;
    }

    if (name !== undefined) {
      updateData.name = name;
    }

    if (password) {
      updateData.password = await hashPassword(password);
    }

    if (role !== undefined) updateData.role = role;

    if (role === 'ADMINISTRATOR' && !currentUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Only a Super Admin may assign the Administrator role' }, { status: 403 });
    }

    if (branchId !== undefined) {
      if (!Number.isInteger(branchId)) {
        return NextResponse.json({ error: 'A valid branch assignment is required' }, { status: 400 });
      }
      if (!currentUser.isSuperAdmin && branchId !== currentUser.branchId) {
        return NextResponse.json({ error: 'You may only assign users to your own branch' }, { status: 403 });
      }
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) {
        return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
      }
      updateData.branchId = branchId;
    }
    
    // Keep USER department assignments aligned with the selected branch's Organization.
    const targetRole = role ?? existingUser.role;
    if (targetRole === 'USER') {
      const targetDepartment = department === undefined ? existingUser.department : department;
      const targetBranchId = branchId === undefined ? existingUser.branchId : branchId;
      if (typeof targetDepartment !== 'string' || targetBranchId === null) {
        return NextResponse.json(
          { error: 'Choose a department registered in the selected branch' },
          { status: 400 }
        );
      }
      const resolvedDepartment = await resolveBranchDepartment(targetBranchId, targetDepartment);
      if (!resolvedDepartment) {
        return NextResponse.json(
          { error: 'Choose a department registered in the selected branch' },
          { status: 400 }
        );
      }
      if (isTestDepartment(resolvedDepartment) && currentUser.role !== 'ADMINISTRATOR') {
        return NextResponse.json({ error: 'You may not assign users to the TEST department' }, { status: 403 });
      }
      updateData.department = resolvedDepartment;
    } else if (role !== undefined) {
      updateData.department = null;
    } else if (department !== undefined) {
      updateData.department = department;
    }
    
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        department: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        isSuperAdmin: true,
        isActive: true,
        updatedAt: true,
      }
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !hasPermission(currentUser.role, Permission.MANAGE_USERS)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent deleting yourself
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!currentUser.isSuperAdmin &&
      (existingUser.isSuperAdmin || existingUser.branchId !== currentUser.branchId)) {
      return NextResponse.json({ error: 'User not found in your branch' }, { status: 404 });
    }
    if (existingUser.isSuperAdmin) {
      return NextResponse.json({ error: 'Super Admin accounts cannot be deleted' }, { status: 403 });
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
