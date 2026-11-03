const path = require('node:path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env.local');
const loadedEnv = dotenv.config({ path: envPath, override: true, quiet: true });

if (loadedEnv.error) {
  console.error('Missing .env.local. Copy .env.local.example to .env.local first.');
  process.exit(1);
}

const databaseUrl = new URL(process.env.DATABASE_URL);
const databaseName = databaseUrl.pathname.replace(/^\/+/, '');

if (
  !['postgres:', 'postgresql:'].includes(databaseUrl.protocol) ||
  !['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname) ||
  databaseUrl.port !== '5432' ||
  databaseName !== 'helpdesk_local'
) {
  console.error('Refusing to query: DATABASE_URL must target localhost:5432/helpdesk_local.');
  process.exit(1);
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  const [userCount, employeeCount, zoneCount, assignmentCount] = await Promise.all([
    prisma.user.count(),
    prisma.employee.count(),
    prisma.zone.count(),
    prisma.zoneEmployee.count(),
  ]);

  console.log('Local database connection: OK');
  console.log(`Database: ${databaseName} (localhost:${databaseUrl.port})`);
  console.log(`Users: ${userCount}`);
  console.log(`Employees: ${employeeCount}`);
  console.log(`Zones: ${zoneCount}`);
  console.log(`Zone assignments: ${assignmentCount}`);
}

main()
  .catch((error) => {
    console.error('Failed to query the local database:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
