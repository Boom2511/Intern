const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env.local');
const loadedEnv = dotenv.config({ path: envPath, override: true });

if (loadedEnv.error) {
  console.error('Missing .env.local. Copy .env.local.example to .env.local first.');
  process.exit(1);
}

const expectedDatabase = 'helpdesk_local';
const localUrls = [process.env.DATABASE_URL, process.env.DIRECT_URL];

for (const value of localUrls) {
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
    console.error(`Refusing to run Prisma: URLs must target localhost:5432/${expectedDatabase}.`);
    process.exit(1);
  }
}

const prismaCli = path.resolve(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  console.error('Failed to start Prisma CLI:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
