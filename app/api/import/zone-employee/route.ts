/**
 * POST /api/import/zone-employee
 * FINAL – Production Ready
 *
 * - normalize
 * - preview (soft warning)
 * - validate (hard + soft)
 * - import (zone / employee / mapping)
 * - hierarchy backfill (memory + bulk transaction)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role, ZoneSource } from "@prisma/client";
import { resolveManagerId } from "@/lib/employee-hierarchy";
import * as XLSX from 'xlsx';

/* =======================
   Types
======================= */

interface ImportRow {
  zoneId: string;
  zoneName: string;
  department?: string;

  employeeId: string;
  employeeName: string;
  role?: Role;

  chiefOfficerId?: string;
  dbHeadId?: string;
}

/* =======================
   GET (download latest template)
======================= */

export async function GET() {
  try {
    // Query latest zones and their zone-employee mapping
    const zones = await prisma.zone.findMany({
      include: {
        employees: {
          include: {
            employee: {
              include: {
                manager: {
                  include: { manager: { include: { manager: true } } },
                },
              },
            },
            chiefOfficer: {
              include: {
                manager: {
                  include: { manager: { include: { manager: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { zoneId: 'asc' },
      take: 5000,
    });

    const aoa: any[] = [];
    aoa.push(['ZONE_ID', 'แผนก', 'ZONE_TH', 'NAME', 'EMPLOYEE_ID', 'CHIEF OFFICER', 'DB HEAD']);

    const findDbHeadViaManagers = (start: any): any | null => {
      let current = start?.manager || null;
      const visited = new Set<number>();
      while (current && !visited.has(current.id)) {
        visited.add(current.id);
        if (current.role === 'DB_HEAD') return current;
        current = current.manager || null;
      }
      return null;
    };

    for (const z of zones) {
      for (const ze of z.employees) {
        const e = ze.employee;
        const chiefEmployeeId = ze.chiefOfficer?.employeeId || '';
        let dbHeadEmployeeId = '';
        // Resolve DB Head: direct if employee is DB_HEAD, else via manager chain, else from chiefOfficer chain
        if (e.role === 'DB_HEAD') {
          dbHeadEmployeeId = e.employeeId || '';
        } else {
          const directHead = findDbHeadViaManagers(e as any);
          if (directHead) {
            dbHeadEmployeeId = directHead.employeeId || '';
          } else if (ze.chiefOfficer) {
            const headFromChief = findDbHeadViaManagers(ze.chiefOfficer as any);
            if (headFromChief) dbHeadEmployeeId = headFromChief.employeeId || '';
          }
        }

        aoa.push([
          z.zoneId,
          e.department || '',
          z.zoneName || '',
          e.name || '',
          e.employeeId || '',
          chiefEmployeeId,
          dbHeadEmployeeId,
        ]);
      }

      // If a zone has no employees yet, still output one blank row for guidance
      if (z.employees.length === 0) {
        aoa.push([z.zoneId, '', z.zoneName || '', '', '', '', '']);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    // Generate ArrayBuffer and wrap as Uint8Array for Response body
    const arrayBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const uint8 = new Uint8Array(arrayBuf);

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="zone_employee_template_current.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Failed to generate template:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

/* =======================
   POST
======================= */

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "ADMINISTRATOR"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.rows || !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const {
    rows,
    mode = "preview",
    filename = "import.xlsx",
  }: {
    rows: ImportRow[];
    mode?: "preview" | "import";
    filename?: string;
  } = body;

  if (rows.length === 0) {
    return NextResponse.json({ error: "No data" }, { status: 400 });
  }

  /* =======================
     PHASE 0: Build name→employeeId lookup map
  ======================= */

  const nameToEmployeeIdMap = new Map<string, string>();
  
  // First pass: collect all employee names and IDs
  for (const r of rows) {
    if (r.employeeName && r.employeeId) {
      const normalizedName = r.employeeName.trim().toLowerCase();
      nameToEmployeeIdMap.set(normalizedName, r.employeeId);
      console.log(`📋 [Name Lookup] "${r.employeeName}" → ${r.employeeId}`);
    }
  }
  
  console.log(`✅ [Name Lookup] Built map with ${nameToEmployeeIdMap.size} entries`);

  /* =======================
     PHASE 1: Normalize + Auto-detect Role
  ======================= */

  const normalized: ImportRow[] = rows.map((r) => {
    // Convert NAME to EMPLOYEE_ID if needed
    let chiefOfficerId = r.chiefOfficerId || '';
    let dbHeadId = r.dbHeadId || '';
    
    // Helper: Check if string looks like EMPLOYEE_ID (has dot or all caps with numbers)
    const looksLikeEmployeeId = (str: string) => {
      if (!str) return false;
      // Pattern: contains dot (e.g., "priwan.wi") or all caps (e.g., "WICHIAN.SL")
      return /\.[a-z]{2}$/i.test(str) || /^[A-Z]{2,}\.[A-Z]{2}$/.test(str);
    };
    
    // Try to convert Chief Officer NAME → EMPLOYEE_ID
    if (chiefOfficerId && !looksLikeEmployeeId(chiefOfficerId)) {
      const normalizedName = chiefOfficerId.trim().toLowerCase();
      const mappedId = nameToEmployeeIdMap.get(normalizedName);
      if (mappedId) {
        console.log(`🔄 [Name→ID] Chief Officer: "${chiefOfficerId}" → ${mappedId}`);
        chiefOfficerId = mappedId;
      } else {
        console.warn(`⚠️ [Name→ID] Chief Officer "${chiefOfficerId}" not found in lookup map`);
      }
    }
    
    // Try to convert DB Head NAME → EMPLOYEE_ID
    if (dbHeadId && !looksLikeEmployeeId(dbHeadId)) {
      const normalizedName = dbHeadId.trim().toLowerCase();
      const mappedId = nameToEmployeeIdMap.get(normalizedName);
      if (mappedId) {
        console.log(`🔄 [Name→ID] DB Head: "${dbHeadId}" → ${mappedId}`);
        dbHeadId = mappedId;
      } else {
        console.warn(`⚠️ [Name→ID] DB Head "${dbHeadId}" not found in lookup map`);
      }
    }
    
    // Auto-detect role based on hierarchy structure
    let detectedRole: Role = Role.STAFF; // default
    
    const isSelfChief = chiefOfficerId && chiefOfficerId.trim() === r.employeeId.trim();
    const isSelfDbHead = dbHeadId && dbHeadId.trim() === r.employeeId.trim();
    
    if (isSelfDbHead) {
      // If employee is their own DB_HEAD → DB_HEAD role
      detectedRole = Role.DB_HEAD;
    } else if (isSelfChief) {
      // If employee is their own CHIEF → CHIEF role
      detectedRole = Role.CHIEF;
    } else {
      // Otherwise → STAFF role
      detectedRole = Role.STAFF;
    }
    
    console.log(`🔍 [Auto-detect Role] ${r.employeeId}: chiefOfficerId=${chiefOfficerId}, dbHeadId=${dbHeadId} → role=${detectedRole}`);
    
    return {
      ...r,
      chiefOfficerId, // Use converted ID
      dbHeadId,       // Use converted ID
      role: (r.role ?? detectedRole) as Role, // Use provided role or detected role
    };
  });

  /* =======================
     PHASE 2: Validate (soft + hard)
  ======================= */

  const warnings: string[] = [];
  const errors: string[] = [];
  const invalidRowIds = new Set<string>(); // Track which rows have errors

  console.log('📊 [Backend Validation] Processing', normalized.length, 'rows');
  console.log('🔍 [Backend Validation] Sample row:', normalized[0]);

  for (const r of normalized) {
    let hasError = false;
    
    if (!r.zoneId || !r.zoneName) {
      errors.push(`ZONE missing (${r.employeeId})`);
      hasError = true;
    }
    if (!r.employeeId || !r.employeeName) {
      errors.push(`EMPLOYEE missing (${r.zoneId})`);
      hasError = true;
    }

    // DB_HEAD can be their own manager (top of hierarchy)
    // CHIEF can be their own manager if they also have themselves as DB_HEAD
    // STAFF cannot be their own manager
    
    const hasSelfRefChief = r.chiefOfficerId && r.chiefOfficerId.trim() !== '' && r.employeeId === r.chiefOfficerId;
    const hasSelfRefHead = r.dbHeadId && r.dbHeadId.trim() !== '' && r.employeeId === r.dbHeadId;

    console.log(`🔗 [Row Validation] ${r.employeeId}: role=${r.role}, chiefOfficerId=${r.chiefOfficerId}, dbHeadId=${r.dbHeadId}, hasSelfRefChief=${hasSelfRefChief}, hasSelfRefHead=${hasSelfRefHead}`);
    
    // Only flag as error if STAFF is trying to manage themselves
    if (r.role === Role.STAFF && (hasSelfRefChief || hasSelfRefHead)) {
      errors.push(`❌ STAFF ${r.employeeId} cannot be their own manager`);
      hasError = true;
    }
    
    // Track invalid rows
    if (hasError) {
      invalidRowIds.add(r.employeeId);
    }
    
    // For CHIEF and DB_HEAD, self-reference is OK (they're at top of their chain)
    // Just warn if missing hierarchy info
    if (r.role === Role.CHIEF && !r.dbHeadId) {
      warnings.push(`⚠️ CHIEF ${r.employeeId} has no DB_HEAD reference`);
    }

    if (r.role === Role.STAFF && !r.chiefOfficerId) {
      warnings.push(`⚠️ STAFF ${r.employeeId} has no CHIEF reference`);
    }
  }

  /* =======================
     PREVIEW MODE
  ======================= */

 if (mode === "preview") {
    const invalidRowCount = invalidRowIds.size;
    const validRowCount = normalized.length - invalidRowCount;
    
    return NextResponse.json({
      success: true,
      results: { errors, warnings },
      summary: {
        totalRows: normalized.length,
        validRows: validRowCount,
        invalidRows: invalidRowCount,
        errors: errors.length,
        warnings: warnings.length
      },
      canImport: invalidRowCount === 0,
    });
  }

  /* =======================
     PHASE 3: Import Base Data
  ======================= */

  // ---- Zones (dedupe) ----
  const zoneMap = new Map<string, ImportRow>();
  for (const r of normalized) {
    if (!zoneMap.has(r.zoneId)) {
      zoneMap.set(r.zoneId, r);
    }
  }

  for (const z of Array.from(zoneMap.values())) {
    await prisma.zone.upsert({
      where: { zoneId: z.zoneId },
      update: {},
      create: {
        zoneId: z.zoneId,
        zoneName: z.zoneName,
        source: ZoneSource.XLSX,
      },
    });
  }

  // ---- Employees ----
  for (const r of normalized) {
    await prisma.employee.upsert({
      where: { employeeId: r.employeeId },
      update: {
        name: r.employeeName,
        role: r.role,
        department: r.department,
      },
      create: {
        employeeId: r.employeeId,
        name: r.employeeName,
        role: r.role,
        department: r.department,
      },
    });
  }

  // ---- ZoneEmployee Mapping ----
  const zones = await prisma.zone.findMany({
    select: { id: true, zoneId: true },
  });
  const employees = await prisma.employee.findMany({
    select: { id: true, employeeId: true, managerId: true },
  });

  const zoneIdMap = new Map(zones.map((z) => [z.zoneId, z.id]));
  const employeeMap = new Map(employees.map((e) => [e.employeeId, e.id]));
  const employeeState = new Map(
    employees.map((e) => [e.employeeId, e])
  );

  for (const r of normalized) {
    const zoneDbId = zoneIdMap.get(r.zoneId);
    const empDbId = employeeMap.get(r.employeeId);
    if (!zoneDbId || !empDbId) continue;

    // Resolve CHIEF OFFICER ID
    let chiefOfficerDbId: number | undefined = undefined;
    if (r.chiefOfficerId) {
      chiefOfficerDbId = employeeMap.get(r.chiefOfficerId);
      console.log(`[ZoneEmployee] ${r.employeeId} chiefOfficer: ${r.chiefOfficerId} → DB ID: ${chiefOfficerDbId}`);
    }

    // @ts-ignore - chiefOfficerId is new field in updated schema
    await prisma.zoneEmployee.upsert({
      where: {
        zoneId_employeeId: {
          zoneId: zoneDbId,
          employeeId: empDbId,
        },
      },
      update: {
        chiefOfficerId: chiefOfficerDbId,
      },
      create: {
        zoneId: zoneDbId,
        employeeId: empDbId,
        chiefOfficerId: chiefOfficerDbId,
      },
    });
  }

  /* =======================
     PHASE 4: Hierarchy Backfill (Memory)
  ======================= */

  const updates: any[] = [];

  for (const r of normalized) {
    const self = employeeState.get(r.employeeId);
    if (!self) continue;

    const managerId = resolveManagerId({
      role: r.role!,
      employeeId: r.employeeId,
      chiefOfficerId: r.chiefOfficerId,
      dbHeadId: r.dbHeadId,
      employeeMap,
    });

    if (
      managerId &&
      managerId !== self.id &&
      managerId !== self.managerId
    ) {
      updates.push(
        prisma.employee.update({
          where: { id: self.id },
          data: { managerId },
        })
      );
    }
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }

  /* =======================
     PHASE 5: Log
  ======================= */

  await prisma.zoneImportLog.create({
    data: {
      filename,
      importedBy: user.id,
      rowCount: normalized.length,
      status: "SUCCESS",
    },
  });

  return NextResponse.json({
    success: true,
    rows: normalized.length,
    warnings,
    hierarchyUpdated: updates.length,
  });
}
