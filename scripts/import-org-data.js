const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env'), override: true, quiet: true });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function loadExport() {
  const p = path.join(root, 'org-data-export.json');
  if (!fs.existsSync(p)) throw new Error('Missing org-data-export.json. Run export-org-data.js first.');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function upsertBranches(rows) {
  for (const row of rows) {
    try {
      await prisma.branch.upsert({
        where: { id: row.id },
        update: { name: row.name, code: row.code, updatedAt: row.updatedAt },
        create: row,
      });
    } catch (e) {
      // fallback: update by name if id conflicts
      try {
        const existing = await prisma.branch.findFirst({ where: { name: row.name } });
        if (existing) {
          await prisma.branch.update({ where: { id: existing.id }, data: { code: row.code, updatedAt: row.updatedAt } });
        } else {
          throw e;
        }
      } catch (e2) {
        console.error('  Branch failed:', row.id, row.name, e2.message);
      }
    }
  }
  console.log('  Branch done (' + rows.length + ')');
}

async function upsertSimple(model, rows) {
  let ok = 0, fail = 0;
  for (const row of rows) {
    try {
      await prisma[model].upsert({
        where: { id: row.id },
        update: Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'id')),
        create: row,
      });
      ok++;
    } catch (e) {
      fail++;
      console.error('  ' + model + ' id=' + row.id + ' failed:', e.message);
    }
  }
  console.log('  ' + model + ': ' + ok + ' ok, ' + fail + ' failed (of ' + rows.length + ')');
}

async function main() {
  const data = loadExport();
  const zoneEmployeeRows = (data.ZoneEmployee || []).map((row) => ({
    id: row.id,
    zoneId: row.zoneId,
    employeeId: row.employeeId,
  }));
  const duplicateZone = new Set(zoneEmployeeRows.map((row) => row.zoneId)).size !== zoneEmployeeRows.length;
  const duplicateEmployee = new Set(zoneEmployeeRows.map((row) => row.employeeId)).size !== zoneEmployeeRows.length;
  if (duplicateZone || duplicateEmployee) {
    throw new Error('Export contains duplicate Zone owners or employees assigned to multiple Zones; resolve the assignments before importing.');
  }
  console.log('Importing org data exported at', data.exportedAt);

  console.log('Branch...');
  await upsertBranches(data.Branch || []);

  console.log('Zone...');
  for (const row of data.Zone || []) {
    try {
      await prisma.zone.upsert({
        where: { zoneId: row.zoneId },
        update: Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'id' && k !== 'zoneId')),
        create: row,
      });
    } catch (e) {
      console.error('  Zone failed:', row.zoneId, e.message);
    }
  }
  console.log('  Zone done');

  console.log('Employee...');
  const employees = [...(data.Employee || [])];
  const imported = new Set();
  let progress = true;
  while (progress && imported.size < employees.length) {
    progress = false;
    for (const row of employees) {
      if (imported.has(row.id)) continue;
      if (row.managerId != null && !imported.has(row.managerId)) continue;
      try {
        await prisma.employee.upsert({
          where: { id: row.id },
          update: Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'id')),
          create: row,
        });
        imported.add(row.id);
        progress = true;
      } catch (e) {
        console.error('  Employee failed:', row.id, e.message);
        imported.add(row.id); // skip to avoid infinite loop
        progress = true;
      }
    }
  }
  console.log('  Employee done (' + imported.size + '/' + employees.length + ')');

  console.log('ZoneEmployee...');
  await prisma.$transaction(async (transaction) => {
    for (const row of zoneEmployeeRows) {
      await transaction.zoneEmployee.upsert({
        where: { zoneId: row.zoneId },
        update: { employeeId: row.employeeId },
        create: row,
      });
    }
  });
  console.log('  ZoneEmployee done (' + zoneEmployeeRows.length + ')');

  console.log('ZoneDepartmentRoot...');
  await upsertSimple('zoneDepartmentRoot', data.ZoneDepartmentRoot || []);

  console.log('OrganizationDepartment...');
  await upsertSimple('organizationDepartment', data.OrganizationDepartment || []);

  console.log('OrganizationChangeHistory...');
  await upsertSimple('organizationChangeHistory', data.OrganizationChangeHistory || []);

  console.log('EmployeeChangeHistory...');
  await upsertSimple('employeeChangeHistory', data.EmployeeChangeHistory || []);

  console.log('ZoneImportLog...');
  await upsertSimple('zoneImportLog', data.ZoneImportLog || []);

  console.log('Fixing sequences...');
  const seqs = [
    ['"Branch"', 'id'], ['"Employee"', 'id'], ['"Zone"', 'id'], ['"ZoneEmployee"', 'id'],
    ['"ZoneDepartmentRoot"', 'id'], ['"OrganizationDepartment"', 'id'],
    ['"OrganizationChangeHistory"', 'id'], ['"EmployeeChangeHistory"', 'id'], ['"ZoneImportLog"', 'id'],
  ];
  for (const [table, col] of seqs) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('${table}', '${col}'), COALESCE((SELECT MAX(${col}) FROM ${table}), 1))`
      );
    } catch (e) {
      console.error('  seq fix failed for', table, e.message);
    }
  }
  console.log('Done.');
}

main()
  .catch((error) => { console.error('Import failed:', error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
