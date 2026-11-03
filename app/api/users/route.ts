import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword, Permission, hasPermission } from '@/lib/auth';

// GET - List all users
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !hasPermission(currentUser.role, Permission.VIEW_USERS)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (!currentUser.isSuperAdmin && currentUser.branchId === null) {
      return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: currentUser.isSuperAdmin ? {} : { branchId: currentUser.branchId },
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
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    const branches = await prisma.branch.findMany({
      where: currentUser.isSuperAdmin ? {} : { id: currentUser.branchId ?? -1 },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users, branches });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !hasPermission(currentUser.role, Permission.MANAGE_USERS)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { username, password, name, role, department, branchId } = await request.json();

    // Validation
    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate department for USER role
    if (role === 'USER' && !department) {
      return NextResponse.json(
        { error: 'Department is required for USER role' },
        { status: 400 }
      );
    }

    if (!currentUser.isSuperAdmin && currentUser.branchId === null) {
      return NextResponse.json({ error: 'Your account is not assigned to a branch' }, { status: 403 });
    }

    const targetBranchId = currentUser.isSuperAdmin ? branchId : currentUser.branchId;
    if (!Number.isInteger(targetBranchId)) {
      return NextResponse.json({ error: 'A branch assignment is required for this user' }, { status: 400 });
    }
    if (!currentUser.isSuperAdmin && branchId !== undefined && branchId !== currentUser.branchId) {
      return NextResponse.json({ error: 'You may only assign users to your own branch' }, { status: 403 });
    }
    const branch = await prisma.branch.findUnique({ where: { id: targetBranchId } });
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role,
        department: role === 'USER' ? department : null,
        branchId: targetBranchId,
        isSuperAdmin: false,
      },
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
        createdAt: true,
      }
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
