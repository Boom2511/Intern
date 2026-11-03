const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
const loadedEnv = dotenv.config({ path: path.join(root, '.env.local'), override: true, quiet: true });

if (loadedEnv.error) {
  console.error('Missing .env.local. Copy .env.local.example to .env.local first.');
  process.exit(1);
}

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
    databaseName !== 'helpdesk_local'
  ) {
    console.error('Refusing to push schema: URLs must target localhost:5432/helpdesk_local.');
    process.exit(1);
  }
}

const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
function runPrisma(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const inspectDatabase = `
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  (async () => {
    const [tables, columns] = await Promise.all([
      prisma.$queryRawUnsafe(\`SELECT to_regclass('public."User"') IS NOT NULL AS has_user_table\`),
      prisma.$queryRawUnsafe(\`
        SELECT COUNT(*)::int AS count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'Branch' AND column_name = 'code')
            OR (table_name = 'User' AND column_name IN ('branchId', 'isSuperAdmin'))
            OR (table_name = 'Ticket' AND column_name IN ('branchId', 'clientAccessTokenHash', 'clientAccessTokenExpiresAt'))
          )
      \`),
    ]);
    const hasUserTable = tables[0].has_user_table;
    const [{ count: userCount }] = hasUserTable
      ? await prisma.$queryRawUnsafe(\`SELECT COUNT(*)::int AS count FROM "User"\`)
      : [{ count: 0 }];
    console.log(JSON.stringify({ hasUserTable, branchColumns: columns[0].count, userCount }));
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  }).finally(async () => prisma.$disconnect());
`;

function inspectLocalDatabase() {
  const result = spawnSync(process.execPath, ['-e', inspectDatabase], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || 'Could not inspect the local database');
  }
  return JSON.parse(result.stdout.trim());
}

function main() {
  const { hasUserTable, branchColumns, userCount } = inspectLocalDatabase();

  if (hasUserTable && branchColumns > 0 && branchColumns < 6) {
    throw new Error('Local database has a partial branch schema; inspect it before pushing further changes.');
  }

  if (hasUserTable && branchColumns === 0 && userCount > 0) {
    const migrationFile = path.join(
      root,
      'prisma',
      'migrations',
      '20261022100000_add_branch_ticket_isolation',
      'migration.sql',
    );
    runPrisma(['db', 'execute', '--file', migrationFile]);
  }

  runPrisma(['db', 'push']);
  const backfill = spawnSync(process.execPath, [path.join(root, 'scripts', 'backfill-local-branch-data.js')], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
  if (backfill.error) throw backfill.error;
  if (backfill.status !== 0) process.exit(backfill.status || 1);
}

try {
  main();
} catch (error) {
  console.error('Local schema push failed:', error.message);
  process.exitCode = 1;
}
