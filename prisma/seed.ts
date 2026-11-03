import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  const bangnaBranch = await prisma.branch.upsert({
    where: { code: '10260' },
    update: { name: 'บางนา' },
    create: { name: 'บางนา', code: '10260' },
  });

  // Create Boom (Administrator)
  const boomPassword = await bcrypt.hash('Ws200746', 10);

  const boom = await prisma.user.upsert({
    where: { id: 'boom-admin' },
    update: {
      username: 'boom',
      password: boomPassword,
      name: 'Boom',
      role: 'ADMINISTRATOR',
      branchId: null,
      isSuperAdmin: true,
      isActive: true,
    },
    create: {
      id: 'boom-admin',
      username: 'boom',
      password: boomPassword,
      name: 'Boom',
      role: 'ADMINISTRATOR',
      branchId: null,
      isSuperAdmin: true,
      isActive: true,
    },
  });

  console.log('✅ Boom user created:', {
    name: boom.name,
    role: boom.role,
  });

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { id: 'admin-default' },
    update: {
      username: 'administrator',
      password: adminPassword,
      name: 'Administrator',
      role: 'ADMINISTRATOR',
      branchId: bangnaBranch.id,
      isSuperAdmin: false,
      isActive: true,
    },
    create: {
      id: 'admin-default',
      username: 'administrator',
      password: adminPassword,
      name: 'Administrator',
      role: 'ADMINISTRATOR',
      branchId: bangnaBranch.id,
      isSuperAdmin: false,
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', {
    name: admin.name,
    role: admin.role,
  });

  // Create test ADMIN user
  const testAdminPassword = await bcrypt.hash('admin123', 10);

  const testAdmin = await prisma.user.upsert({
    where: { id: 'test-admin' },
    update: {
      username: 'testadmin',
      password: testAdminPassword,
      name: 'Test Admin',
      role: 'ADMIN',
      branchId: bangnaBranch.id,
      isSuperAdmin: false,
      isActive: true,
    },
    create: {
      id: 'test-admin',
      username: 'testadmin',
      password: testAdminPassword,
      name: 'Test Admin',
      role: 'ADMIN',
      branchId: bangnaBranch.id,
      isSuperAdmin: false,
      isActive: true,
    },
  });

  console.log('✅ Test Admin user created:', {
    name: testAdmin.name,
    role: testAdmin.role,
  });

  // Create test OPERATOR user
  const operatorPassword = await bcrypt.hash('operator123', 10);

  const operator = await prisma.user.upsert({
    where: { id: 'test-operator' },
    update: {
      username: 'testoperator',
      password: operatorPassword,
      name: 'Test Operator',
      role: 'OPERATOR',
      branchId: bangnaBranch.id,
      isSuperAdmin: false,
      isActive: true,
    },
    create: {
      id: 'test-operator',
      username: 'testoperator',
      password: operatorPassword,
      name: 'Test Operator',
      role: 'OPERATOR',
      branchId: bangnaBranch.id,
      isSuperAdmin: false,
      isActive: true,
    },
  });

  console.log('✅ Operator user created:', {
    name: operator.name,
    role: operator.role,
  });

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test Accounts:');
  console.log('─────────────────────────────────────────');
  console.log('BOOM (ADMINISTRATOR):');
  console.log('  Username: boom');
  console.log('  Password: Ws200746');
  console.log('  Display Name: Boom');
  console.log('  Access: ทุกอย่าง (User Management + CEC + Test Pages)');
  console.log('');
  console.log('ADMINISTRATOR:');
  console.log('  Username: administrator');
  console.log('  Password: admin123');
  console.log('  Display Name: Administrator');
  console.log('  Access: ทุกอย่าง (User Management + CEC + Test Pages)');
  console.log('');
  console.log('ADMIN:');
  console.log('  Username: testadmin');
  console.log('  Password: admin123');
  console.log('  Display Name: Test Admin');
  console.log('  Access: User Management + CEC (ไม่เห็น Test Pages)');
  console.log('');
  console.log('OPERATOR:');
  console.log('  Username: testoperator');
  console.log('  Password: operator123');
  console.log('  Display Name: Test Operator');
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
