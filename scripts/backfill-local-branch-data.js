const path = require('node:path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env.local');
const loadedEnv = dotenv.config({ path: envPath, override: true, quiet: true });

if (loadedEnv.error) {
  console.error('Missing .env.local. Copy .env.local.example to .env.local first.');
  process.exit(1);
}

const expectedDatabase = 'helpdesk_local';
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  let databaseUrl;
  try {
    databaseUrl = new URL(value);
  } catch {
    console.error('Local database URLs in .env.local must be valid URLs.');
    process.exit(1);
  }

  const databaseName = databaseUrl.pathname.replace(/^\/+/, '');
  if (
    !['postgres:', 'postgresql:'].includes(databaseUrl.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname) ||
    databaseUrl.port !== '5432' ||
    databaseName !== expectedDatabase
  ) {
    console.error(`Refusing to backfill: URLs must target localhost:5432/${expectedDatabase}.`);
    process.exit(1);
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const superAdmins = await prisma.user.findMany({
    where: { username: { equals: 'boom', mode: 'insensitive' }, isActive: true },
    select: { id: true },
  });
  if (userCount > 0 && superAdmins.length !== 1) {
    throw new Error(`Expected exactly one active user account named boom; found ${superAdmins.length}`);
  }

  await prisma.$transaction(async (tx) => {
    const branchByCode = await tx.branch.findUnique({ where: { code: '10260' } });
    const branchByName = await tx.branch.findFirst({ where: { name: 'บางนา' } });
    if (branchByCode && branchByName && branchByCode.id !== branchByName.id) {
      throw new Error('Branch code 10260 and branch name บางนา refer to different records');
    }
    if (branchByCode && branchByCode.name !== 'บางนา') {
      throw new Error('Branch code 10260 is already assigned to a different branch');
    }
    if (branchByName && branchByName.code && branchByName.code !== '10260') {
      throw new Error('Branch name บางนา is already assigned a different code');
    }

    const branch = branchByCode || branchByName
      ? await tx.branch.update({
          where: { id: (branchByCode || branchByName).id },
          data: { name: 'บางนา', code: '10260' },
        })
      : await tx.branch.create({ data: { name: 'บางนา', code: '10260' } });

    if (superAdmins.length === 1) {
      await tx.user.update({
        where: { id: superAdmins[0].id },
        data: { branchId: null, isSuperAdmin: true },
      });
      await tx.user.updateMany({
        where: { branchId: null, isSuperAdmin: false },
        data: { branchId: branch.id },
      });
    }
    await tx.ticket.updateMany({
      where: { branchId: null },
      data: { branchId: branch.id },
    });
    await tx.employee.updateMany({
      where: { branchId: null },
      data: { branchId: branch.id },
    });
    await tx.zone.updateMany({
      where: { branchId: null },
      data: { branchId: branch.id },
    });
  });

  const [unassignedUsers, unassignedTickets, unassignedEmployees, unassignedZones] = await Promise.all([
    prisma.user.count({ where: { branchId: null, isSuperAdmin: false } }),
    prisma.ticket.count({ where: { branchId: null } }),
    prisma.employee.count({ where: { branchId: null } }),
    prisma.zone.count({ where: { branchId: null } }),
  ]);
  if (unassignedUsers || unassignedTickets || unassignedEmployees || unassignedZones) {
    throw new Error(
      `Backfill incomplete: users=${unassignedUsers}, tickets=${unassignedTickets}, employees=${unassignedEmployees}, zones=${unassignedZones}`,
    );
  }
  console.log('Local branch backfill completed for บางนา (10260).');
}

main()
  .catch((error) => {
    console.error('Local branch backfill failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
