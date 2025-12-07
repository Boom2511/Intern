import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Administrator',
      role: 'ADMINISTRATOR',
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', {
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });

  // Create test ADMIN user
  const testAdminPassword = await bcrypt.hash('admin123', 10);

  const testAdmin = await prisma.user.upsert({
    where: { email: 'test.admin@example.com' },
    update: {},
    create: {
      email: 'test.admin@example.com',
      password: testAdminPassword,
      name: 'Test Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Test Admin user created:', {
    email: testAdmin.email,
    name: testAdmin.name,
    role: testAdmin.role,
  });

  // Create test OPERATOR user
  const operatorPassword = await bcrypt.hash('operator123', 10);

  const operator = await prisma.user.upsert({
    where: { email: 'operator@example.com' },
    update: {},
    create: {
      email: 'operator@example.com',
      password: operatorPassword,
      name: 'Test Operator',
      role: 'OPERATOR',
      isActive: true,
    },
  });

  console.log('✅ Operator user created:', {
    email: operator.email,
    name: operator.name,
    role: operator.role,
  });

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test Accounts:');
  console.log('─────────────────────────────────────────');
  console.log('ADMINISTRATOR:');
  console.log('  Email: admin@example.com');
  console.log('  Password: admin123');
  console.log('  Access: ทุกอย่าง (User Management + CEC + Test Pages)');
  console.log('');
  console.log('ADMIN:');
  console.log('  Email: test.admin@example.com');
  console.log('  Password: admin123');
  console.log('  Access: User Management + CEC (ไม่เห็น Test Pages)');
  console.log('');
  console.log('OPERATOR:');
  console.log('  Email: operator@example.com');
  console.log('  Password: operator123');
  console.log('  Access: CEC เท่านั้น (ไม่เห็น User Management และ Test Pages)');
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
