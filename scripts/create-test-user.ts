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
      email: 'admin@test.com',
      password: 'admin123',
      name: 'Admin User',
      role: 'ADMINISTRATOR' as const,
    },
    {
      email: 'operator@test.com',
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
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`✓ User already exists: ${userData.email}`);
        console.log(`  Role: ${existingUser.role}`);
        console.log(`  Name: ${existingUser.name}\n`);
        continue;
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          isActive: true,
        },
      });

      console.log(`✓ Created user: ${user.email}`);
      console.log(`  Password: ${userData.password}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Name: ${user.name}\n`);
    } catch (error) {
      console.error(`✗ Error creating user ${userData.email}:`, error);
    }
  }

  console.log('\n=== Test Users ===');
  console.log('Administrator:');
  console.log('  Email: admin@test.com');
  console.log('  Password: admin123');
  console.log('\nOperator:');
  console.log('  Email: operator@test.com');
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
