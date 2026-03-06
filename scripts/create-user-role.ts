/**
 * Script to create USER role accounts for all departments
 * Usage: npx ts-node --project tsconfig.scripts.json scripts/create-user-role.ts
 */

import { PrismaClient, Department } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Define users to create
const usersToCreate = [
  { username: 'user_db1', name: 'User D1', department: 'DB1' as Department },
  { username: 'user_db2', name: 'User D2', department: 'DB2' as Department },
  { username: 'user_db3', name: 'User D3', department: 'DB3' as Department },
  { username: 'user_db4', name: 'User D4', department: 'DB4' as Department },
  { username: 'user_db5', name: 'User นำจ่ายรถยนต์', department: 'DB5' as Department },
  { username: 'user_db6', name: 'User บป', department: 'DB6' as Department },
];

const password = 'password123'; // Change this in production

async function createOrUpdateUser(username: string, name: string, department: Department) {
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
      },
    });
    
    console.log(`  ✅ Created '${username}' - ${name} (${department})`);
  }
}

async function main() {
  console.log('Creating USER role accounts for all departments...\n');

  for (const user of usersToCreate) {
    await createOrUpdateUser(user.username, user.name, user.department);
  }

  console.log('\n=== Login Credentials ===');
  console.log('Password for all users: password123\n');
  console.log('Usernames:');
  usersToCreate.forEach(user => {
    const deptLabels: Record<string, string> = {
      DB1: 'D1',
      DB2: 'D2',
      DB3: 'D3',
      DB4: 'D4',
      DB5: 'นำจ่ายรถยนต์',
      DB6: 'บป (บริการประชาชน)',
      TEST: 'ทดสอบ',
    };
    const deptLabel = deptLabels[user.department] || user.department;
    
    console.log(`  - ${user.username} (${deptLabel})`);
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
