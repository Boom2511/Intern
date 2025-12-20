/**
 * Script to create a test user for login
 * Run with: npx tsx scripts/create-test-user.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test users...\n');

  // Test users to create
  const users = [
    {
      username: 'admin',
      password: 'admin123',
      name: 'Admin User',
      role: 'ADMINISTRATOR' as const,
    },
    {
      username: 'operator',
      password: 'operator123',
      name: 'Operator User',
      role: 'OPERATOR' as const,
    },
  ];

  for (const userData of users) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (existingUser) {
        console.log(`✓ User already exists: ${userData.username}`);
        console.log(`  Role: ${existingUser.role}`);
        console.log(`  Name: ${existingUser.name}\n`);
        continue;
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          isActive: true,
        },
      });

      console.log(`✓ Created user: ${user.username}`);
      console.log(`  Password: ${userData.password}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Name: ${user.name}\n`);
    } catch (error) {
      console.error(`✗ Error creating user ${userData.username}:`, error);
    }
  }

  console.log('\n=== Test Users ===');
  console.log('Administrator:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
  console.log('\nOperator:');
  console.log('  Username: operator');
  console.log('  Password: operator123');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
