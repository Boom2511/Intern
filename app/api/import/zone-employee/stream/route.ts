/**
 * POST /api/import/zone-employee/stream
 * Server-Sent Events (SSE) endpoint for real-time import progress
 * Supports cancellation via AbortController
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role, ZoneSource } from "@prisma/client";
import { resolveManagerId } from "@/lib/employee-hierarchy";

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

// Helper to send SSE message
function sendSSE(controller: ReadableStreamDefaultController, event: string, data: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "ADMINISTRATOR"].includes(user.role)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const body = await req.json().catch(() => null);
  if (!body?.rows || !Array.isArray(body.rows)) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const { rows, filename = "import.xlsx" }: { rows: ImportRow[]; filename?: string } = body;

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "No data" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Check for abort signal
        const signal = req.signal;
        
        signal.addEventListener('abort', () => {
          sendSSE(controller, 'cancelled', { message: 'Import cancelled by user' });
          controller.close();
        });

        // PHASE 0: Build name→employeeId lookup map (5%)
        sendSSE(controller, 'progress', { percentage: 0, phase: 'preparing', message: 'กำลังเตรียมข้อมูล...' });
        
        const nameToEmployeeIdMap = new Map<string, string>();
        for (const r of rows) {
          if (signal.aborted) return;
          if (r.employeeName && r.employeeId) {
            const normalizedName = r.employeeName.trim().toLowerCase();
            nameToEmployeeIdMap.set(normalizedName, r.employeeId);
          }
        }
        
        sendSSE(controller, 'progress', { percentage: 5, phase: 'preparing', message: `สร้างดัชนีชื่อเรียบร้อย (${nameToEmployeeIdMap.size} รายการ)` });

        // PHASE 1: Normalize + Auto-detect Role (15%)
        sendSSE(controller, 'progress', { percentage: 10, phase: 'normalizing', message: 'กำลังตรวจสอบและปรับข้อมูล...' });
        
        const normalized: ImportRow[] = rows.map((r) => {
          let chiefOfficerId = r.chiefOfficerId || '';
          let dbHeadId = r.dbHeadId || '';
          
          const looksLikeEmployeeId = (str: string) => {
            if (!str) return false;
            return /\.[a-z]{2}$/i.test(str) || /^[A-Z]{2,}\.[A-Z]{2}$/.test(str);
          };
          
          if (chiefOfficerId && !looksLikeEmployeeId(chiefOfficerId)) {
            const normalizedName = chiefOfficerId.trim().toLowerCase();
            const mappedId = nameToEmployeeIdMap.get(normalizedName);
            if (mappedId) chiefOfficerId = mappedId;
          }
          
          if (dbHeadId && !looksLikeEmployeeId(dbHeadId)) {
            const normalizedName = dbHeadId.trim().toLowerCase();
            const mappedId = nameToEmployeeIdMap.get(normalizedName);
            if (mappedId) dbHeadId = mappedId;
          }
          
          let detectedRole: Role = Role.STAFF;
          const isSelfChief = chiefOfficerId && chiefOfficerId.trim() === r.employeeId.trim();
          const isSelfDbHead = dbHeadId && dbHeadId.trim() === r.employeeId.trim();
          
          if (isSelfDbHead) {
            detectedRole = Role.DB_HEAD;
          } else if (isSelfChief) {
            detectedRole = Role.CHIEF;
          }
          
          return {
            ...r,
            chiefOfficerId,
            dbHeadId,
            role: (r.role ?? detectedRole) as Role,
          };
        });

        sendSSE(controller, 'progress', { percentage: 15, phase: 'normalizing', message: `ปรับข้อมูลเรียบร้อย (${normalized.length} รายการ)` });

        // PHASE 2: Validate (20%)
        if (signal.aborted) return;
        sendSSE(controller, 'progress', { percentage: 20, phase: 'validating', message: 'กำลังตรวจสอบความถูกต้อง...' });
        
        const warnings: string[] = [];
        const errors: string[] = [];
        const invalidRowIds = new Set<string>();

        for (const r of normalized) {
          if (signal.aborted) return;
          let hasError = false;
          
          if (!r.zoneId || !r.zoneName) {
            errors.push(`ZONE missing (${r.employeeId})`);
            hasError = true;
          }
          if (!r.employeeId || !r.employeeName) {
            errors.push(`EMPLOYEE missing (${r.zoneId})`);
            hasError = true;
          }

          const hasSelfRefChief = r.chiefOfficerId && r.chiefOfficerId.trim() !== '' && r.employeeId === r.chiefOfficerId;
          const hasSelfRefHead = r.dbHeadId && r.dbHeadId.trim() !== '' && r.employeeId === r.dbHeadId;
          
          if (r.role === Role.STAFF && (hasSelfRefChief || hasSelfRefHead)) {
            errors.push(`❌ STAFF ${r.employeeId} cannot be their own manager`);
            hasError = true;
          }
          
          if (hasError) {
            invalidRowIds.add(r.employeeId);
          }
          
          if (r.role === Role.CHIEF && !r.dbHeadId) {
            warnings.push(`⚠️ CHIEF ${r.employeeId} has no DB_HEAD reference`);
          }
          if (r.role === Role.STAFF && !r.chiefOfficerId) {
            warnings.push(`⚠️ STAFF ${r.employeeId} has no CHIEF reference`);
          }
        }

        if (invalidRowIds.size > 0) {
          sendSSE(controller, 'error', { 
            message: `พบข้อผิดพลาด ${invalidRowIds.size} รายการ`,
            errors,
            warnings
          });
          controller.close();
          return;
        }

        sendSSE(controller, 'progress', { percentage: 25, phase: 'validating', message: 'ตรวจสอบเรียบร้อย' });

        // PHASE 3: Import Zones (45%)
        if (signal.aborted) return;
        sendSSE(controller, 'progress', { percentage: 30, phase: 'importing', message: 'กำลังบันทึก Zones...' });
        
        const zoneMap = new Map<string, ImportRow>();
        for (const r of normalized) {
          if (!zoneMap.has(r.zoneId)) {
            zoneMap.set(r.zoneId, r);
          }
        }

        const zoneArray = Array.from(zoneMap.values());
        for (let i = 0; i < zoneArray.length; i++) {
          if (signal.aborted) return;
          const z = zoneArray[i];
          await prisma.zone.upsert({
            where: { zoneId: z.zoneId },
            update: {},
            create: {
              zoneId: z.zoneId,
              zoneName: z.zoneName,
              source: ZoneSource.XLSX,
            },
          });
          
          // Update progress every 10 zones or at the end
          if (i % 10 === 0 || i === zoneArray.length - 1) {
            const zoneProgress = 30 + Math.floor((i / zoneArray.length) * 15);
            sendSSE(controller, 'progress', { 
              percentage: zoneProgress, 
              phase: 'importing', 
              message: `บันทึก Zone ${i + 1}/${zoneArray.length}` 
            });
          }
        }

        // PHASE 4: Import Employees (70%)
        if (signal.aborted) return;
        sendSSE(controller, 'progress', { percentage: 45, phase: 'importing', message: 'กำลังบันทึก Employees...' });
        
        for (let i = 0; i < normalized.length; i++) {
          if (signal.aborted) return;
          const r = normalized[i];
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
          
          // Update progress every 50 employees or at the end
          if (i % 50 === 0 || i === normalized.length - 1) {
            const empProgress = 45 + Math.floor((i / normalized.length) * 25);
            sendSSE(controller, 'progress', { 
              percentage: empProgress, 
              phase: 'importing', 
              message: `บันทึก Employee ${i + 1}/${normalized.length}` 
            });
          }
        }

        // PHASE 5: ZoneEmployee Mapping (85%)
        if (signal.aborted) return;
        sendSSE(controller, 'progress', { percentage: 70, phase: 'mapping', message: 'กำลังเชื่อมโยง Zone-Employee...' });
        
        const zones = await prisma.zone.findMany({
          select: { id: true, zoneId: true },
        });
        const employees = await prisma.employee.findMany({
          select: { id: true, employeeId: true, managerId: true },
        });

        const zoneIdMap = new Map(zones.map((z) => [z.zoneId, z.id]));
        const employeeMap = new Map(employees.map((e) => [e.employeeId, e.id]));
        const employeeState = new Map(employees.map((e) => [e.employeeId, e]));

        for (let i = 0; i < normalized.length; i++) {
          if (signal.aborted) return;
          const r = normalized[i];
          const zoneDbId = zoneIdMap.get(r.zoneId);
          const empDbId = employeeMap.get(r.employeeId);
          if (!zoneDbId || !empDbId) continue;

          let chiefOfficerDbId: number | undefined = undefined;
          if (r.chiefOfficerId) {
            chiefOfficerDbId = employeeMap.get(r.chiefOfficerId);
          }

          // @ts-ignore
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
          
          if (i % 50 === 0 || i === normalized.length - 1) {
            const mappingProgress = 70 + Math.floor((i / normalized.length) * 15);
            sendSSE(controller, 'progress', { 
              percentage: mappingProgress, 
              phase: 'mapping', 
              message: `เชื่อมโยง ${i + 1}/${normalized.length}` 
            });
          }
        }

        // PHASE 6: Hierarchy Backfill (95%)
        if (signal.aborted) return;
        sendSSE(controller, 'progress', { percentage: 85, phase: 'hierarchy', message: 'กำลังอัพเดตลำดับชั้น...' });
        
        const updates: any[] = [];

        for (const r of normalized) {
          if (signal.aborted) return;
          const self = employeeState.get(r.employeeId);
          if (!self) continue;

          const managerId = resolveManagerId({
            role: r.role!,
            employeeId: r.employeeId,
            chiefOfficerId: r.chiefOfficerId,
            dbHeadId: r.dbHeadId,
            employeeMap,
          });

          if (managerId && managerId !== self.id && managerId !== self.managerId) {
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

        sendSSE(controller, 'progress', { percentage: 95, phase: 'hierarchy', message: `อัพเดตลำดับชั้น ${updates.length} รายการ` });

        // PHASE 7: Log (100%)
        if (signal.aborted) return;
        await prisma.zoneImportLog.create({
          data: {
            filename,
            importedBy: user.id,
            rowCount: normalized.length,
            status: "SUCCESS",
          },
        });

        sendSSE(controller, 'progress', { percentage: 100, phase: 'complete', message: 'Import เสร็จสมบูรณ์!' });
        sendSSE(controller, 'complete', { 
          success: true,
          rows: normalized.length,
          warnings,
          hierarchyUpdated: updates.length,
        });

        controller.close();
      } catch (error: any) {
        console.error('Import error:', error);
        sendSSE(controller, 'error', { 
          message: error.message || 'เกิดข้อผิดพลาดในการ Import',
          error: error.toString()
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
