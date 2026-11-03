/**
 * Check phone number formats in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPhoneFormats() {
  try {
    const tickets = await prisma.ticket.findMany({
      select: {
        id: true,
        ticketNo: true,
        recipientPhone: true,
      },
      take: 10,
    });

    console.log('Sample of phone numbers in database:\n');
    tickets.forEach((ticket) => {
      const isE164 = ticket.recipientPhone.startsWith('+66');
      console.log(`${ticket.ticketNo}: ${ticket.recipientPhone} ${isE164 ? '✅' : '❌'}`);
    });

    const totalTickets = await prisma.ticket.count();
    const e164Tickets = await prisma.ticket.count({
      where: {
        recipientPhone: {
          startsWith: '+66',
        },
      },
    });

    console.log(`\nSummary:`);
    console.log(`Total tickets: ${totalTickets}`);
    console.log(`E.164 format: ${e164Tickets} (${((e164Tickets / totalTickets) * 100).toFixed(1)}%)`);
    console.log(`Non-E.164: ${totalTickets - e164Tickets}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhoneFormats();
