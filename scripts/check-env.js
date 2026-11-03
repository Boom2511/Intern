/**
 * Check Environment Variables before build
 * Prevents build failures due to missing env vars
 */

const requiredEnvVars = [
  'DATABASE_URL',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️  Warning: Missing environment variables:');
  missingVars.forEach(varName => {
    console.warn(`   - ${varName}`);
  });
  console.warn('\n💡 Tip: Make sure to set these in Vercel Dashboard → Settings → Environment Variables\n');

  // Don't fail the build, just warn
  // Prisma will use a dummy connection string during build
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/dummy';
    console.log('🔧 Using dummy DATABASE_URL for build time');
  }
}

console.log('✅ Environment check completed\n');
