/**
 * Prisma Database Seeder
 * Run with: npx prisma db seed
 *
 * This file seeds the database with initial test data for development
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create sample customers
  const customer1 = await prisma.customer.upsert({
    where: { phone: '0812345678' },
    update: {},
    create: {
      name: 'สมชาย ใจดี',
      phone: '0812345678',
      email: 'somchai@example.com',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { phone: '0823456789' },
    update: {},
    create: {
      name: 'สมหญิง มีสุข',
      phone: '0823456789',
      email: 'somying@example.com',
    },
  });

  console.log('Created customers:', { customer1, customer2 });

  // Create sample tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      ticketNo: `TH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`,
      customerId: customer1.id,
      subject: 'พัสดุไม่ถึงตามกำหนด',
      description: 'ส่งพัสดุเมื่อ 5 วันที่แล้วแต่ยังไม่ได้รับ ต้องการตรวจสอบสถานะ',
      status: 'NEW',
      priority: 'HIGH',
    },
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      ticketNo: `TH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0002`,
      customerId: customer2.id,
      subject: 'สอบถามค่าส่งพัสดุไปต่างประเทศ',
      description: 'ต้องการทราบอัตราค่าส่งพัสดุไปญี่ปุ่น น้ำหนัก 2 กิโลกรัม',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assignedTo: 'พนักงาน A',
    },
  });

  console.log('Created tickets:', { ticket1, ticket2 });

  // Create sample notes
  const note1 = await prisma.note.create({
    data: {
      ticketId: ticket2.id,
      content: 'ได้ตรวจสอบข้อมูลแล้ว กำลังดำเนินการ',
      createdBy: 'พนักงาน A',
    },
  });

  console.log('Created note:', note1);
  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
