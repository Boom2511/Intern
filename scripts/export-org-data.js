const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env.local'), override: true, quiet: true });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = {
    exportedAt: new Date().toISOString(),
    Branch: await prisma.branch.findMany(),
    Employee: await prisma.employee.findMany(),
    Zone: await prisma.zone.findMany(),
    ZoneEmployee: await prisma.zoneEmployee.findMany(),
    ZoneDepartmentRoot: await prisma.zoneDepartmentRoot.findMany(),
    OrganizationDepartment: await prisma.organizationDepartment.findMany(),
    OrganizationChangeHistory: await prisma.organizationChangeHistory.findMany(),
    EmployeeChangeHistory: await prisma.employeeChangeHistory.findMany(),
    ZoneImportLog: await prisma.zoneImportLog.findMany(),
  };

  const outPath = path.join(root, 'org-data-export.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log('Exported org data to', outPath);
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) console.log('  ' + k + ': ' + v.length + ' rows');
  }
}

main()
  .catch((error) => { console.error('Export failed:', error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
