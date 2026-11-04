/**
 * Script to create USER role accounts for all departments
 * Usage: npx ts-node --project tsconfig.scripts.json scripts/create-user-role.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface DepartmentUser {
  username: string;
  name: string;
  department: string;
}

const password = 'password123'; // Change this in production

async function createOrUpdateUser(username: string, name: string, department: string, branchId: number) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  const hashedPassword = await bcrypt.hash(password, 10);

  if (existingUser) {
    console.log(`  Updating user '${username}'...`);
    
    await prisma.user.update({
      where: { username },
      data: {
        password: hashedPassword,
        role: 'USER',
        department,
        isActive: true,
        name,
        branchId,
        isSuperAdmin: false,
      },
    });
    
    console.log(`  ✅ Updated '${username}' - ${name} (${department})`);
  } else {
    console.log(`  Creating new user '${username}'...`);
    
    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: 'USER',
        department,
        isActive: true,
        branchId,
        isSuperAdmin: false,
      },
    });
    
    console.log(`  ✅ Created '${username}' - ${name} (${department})`);
  }
}

async function main() {
  const branch = await prisma.branch.findUnique({ where: { code: '10260' } });
  if (!branch) {
    throw new Error('Branch 10260 (บางนา) must exist before creating department users');
  }

  const departments = await prisma.organizationDepartment.findMany({
    where: { branchId: branch.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  if (departments.length === 0) {
    throw new Error('Branch 10260 has no departments registered in Organization');
  }

  const usersToCreate: DepartmentUser[] = departments.map(({ id, name }) => ({
    username: `user_${branch.code}_dept${id}`,
    name: `User ${name}`,
    department: name,
  }));
  console.log(`Creating USER role accounts for ${departments.length} Organization departments...\n`);
  for (const user of usersToCreate) {
    await createOrUpdateUser(user.username, user.name, user.department, branch.id);
  }

  console.log('\n=== Login Credentials ===');
  console.log('Password for all users: password123\n');
  console.log('Usernames:');
  usersToCreate.forEach((user) => {
    console.log(`  - ${user.username} (${user.department})`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
