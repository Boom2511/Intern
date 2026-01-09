/**
 * GET /api/zone-employee/query
 *
 * Query imported zone and employee data
 * Supports various query modes:
 * - mode=zone-info&zoneId=... : Get complete zone information with hierarchy
 * - mode=zone-employees&zoneId=... : Get all employees assigned to a zone
 * - mode=zone-chief&zoneId=... : Get the zone chief/head
 * - mode=employee-zones&employeeId=... : Get all zones for an employee
 * - mode=employee-hierarchy&employeeId=... : Get employee's manager chain
 * - mode=search-zones&zoneId=... : Search zones by criteria
 * - mode=department-structure&department=... : Get complete department structure
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getZoneInfo,
  getZoneEmployees,
  getZoneChief,
  getZoneDBHead,
  getEmployeeZones,
  getEmployeeHierarchyUp,
  getEmployeeSubordinates,
  searchZones,
  getDepartmentStructure,
} from "@/lib/zone-employee-query";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("mode");

    // If no mode, return all zones with tree structure (for tree view page)
    if (!mode) {
      try {
        console.log('🌳 [Zone Tree] Fetching zones...');
        
        // Get all zones with their employees
        const zones = await prisma.zone.findMany({
          include: {
            employees: {
              include: {
                employee: {
                  include: {
                    manager: true,
                    subordinates: true,
                  },
                },
              },
            },
          },
          orderBy: {
            zoneId: 'asc',
          },
        });

      // Group zones by department, collect all zones for each department
      const departmentMap = new Map();
      const departmentZonesMap = new Map();
      
      zones.forEach(zone => {
        zone.employees.forEach(ze => {
          const dept = ze.employee.department || 'ไม่ระบุแผนก';
          if (!departmentMap.has(dept)) {
            departmentMap.set(dept, new Map());
            departmentZonesMap.set(dept, []);
          }
          departmentMap.get(dept).set(ze.employee.id, ze.employee);
          
          // Store zone info for each employee
          if (!departmentZonesMap.get(dept).find((z: any) => z.zoneId === zone.zoneId)) {
            departmentZonesMap.get(dept).push({
              zoneId: zone.zoneId,
              zoneName: zone.zoneName,
              employeeId: ze.employee.employeeId,
            });
          }
        });
      });

      // Build hierarchy tree for each department
      const zonesWithTree = Array.from(departmentMap.entries()).map(([dept, employeesMap]) => {
        const employeeMap = new Map<number, any>();
        const rootEmployees: any[] = [];

        // First pass: create all employee nodes with zone info
        const deptZones = departmentZonesMap.get(dept) || [];
        Array.from(employeesMap.values()).forEach((emp: any) => {
          const zoneInfo = deptZones.find((z: any) => z.employeeId === emp.employeeId);
          const node = {
            id: emp.id,
            name: emp.name,
            employeeId: emp.employeeId,
            role: emp.role,
            department: emp.department,
            zoneName: zoneInfo?.zoneName || null,
            zoneId: zoneInfo?.zoneId || null,
            subordinates: [],
          };
          employeeMap.set(emp.id, node);
        });

        // Second pass: build hierarchy
        Array.from(employeesMap.values()).forEach((emp: any) => {
          const node = employeeMap.get(emp.id);
          
          if (node) {
            if (emp.managerId) {
              const manager = employeeMap.get(emp.managerId);
              if (manager) {
                manager.subordinates.push(node);
              } else {
                // Manager not in this zone, treat as root
                rootEmployees.push(node);
              }
            } else {
              // No manager, this is a root employee (likely DB_HEAD)
              rootEmployees.push(node);
            }
          }
        });

        // Sort subordinates by role (DB_HEAD > CHIEF > STAFF)
        const sortByRole = (a: any, b: any) => {
          const roleOrder: { [key: string]: number } = { DB_HEAD: 0, CHIEF: 1, STAFF: 2 };
          return roleOrder[a.role] - roleOrder[b.role];
        };

        const sortTree = (node: any) => {
          node.subordinates.sort(sortByRole);
          node.subordinates.forEach(sortTree);
        };

        rootEmployees.sort(sortByRole);
        rootEmployees.forEach(sortTree);

        return {
          zoneId: dept,
          zoneName: dept,
          department: dept,
          employees: rootEmployees,
        };
      });

        console.log('✅ [Zone Tree] Successfully built', zonesWithTree.length, 'zones');
        
        return NextResponse.json({
          success: true,
          zones: zonesWithTree,
        });
      } catch (error) {
        console.error('❌ [Zone Tree] Error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to build zone tree: ' + (error as Error).message },
          { status: 500 }
        );
      }
    }

    // Get zone information (complete with hierarchy)
    if (mode === "zone-info") {
      const zoneId = searchParams.get("zoneId");
      if (!zoneId) {
        return NextResponse.json(
          { error: "Missing 'zoneId' parameter" },
          { status: 400 }
        );
      }

      const result = await getZoneInfo(zoneId);
      if (!result) {
        return NextResponse.json(
          { error: "Zone not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    }

    // Get all employees assigned to a zone
    if (mode === "zone-employees") {
      const zoneId = searchParams.get("zoneId");
      if (!zoneId) {
        return NextResponse.json(
          { error: "Missing 'zoneId' parameter" },
          { status: 400 }
        );
      }

      const result = await getZoneEmployees(zoneId);
      if (!result) {
        return NextResponse.json(
          { error: "Zone not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    }

    // Get zone chief
    if (mode === "zone-chief") {
      const zoneId = searchParams.get("zoneId");
      if (!zoneId) {
        return NextResponse.json(
          { error: "Missing 'zoneId' parameter" },
          { status: 400 }
        );
      }

      const result = await getZoneChief(zoneId);
      if (!result) {
        return NextResponse.json(
          { error: "Zone chief not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    }

    // Get zone DB head
    if (mode === "zone-dbhead") {
      const zoneId = searchParams.get("zoneId");
      if (!zoneId) {
        return NextResponse.json(
          { error: "Missing 'zoneId' parameter" },
          { status: 400 }
        );
      }

      const result = await getZoneDBHead(zoneId);
      if (!result) {
        return NextResponse.json(
          { error: "Zone DB head not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    }

    // Get employee zones
    if (mode === "employee-zones") {
      const employeeId = searchParams.get("employeeId");
      if (!employeeId) {
        return NextResponse.json(
          { error: "Missing 'employeeId' parameter" },
          { status: 400 }
        );
      }

      const result = await getEmployeeZones(employeeId);
      if (!result) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    }

    // Get employee hierarchy (manager chain)
    if (mode === "employee-hierarchy") {
      const employeeId = searchParams.get("employeeId");
      if (!employeeId) {
        return NextResponse.json(
          { error: "Missing 'employeeId' parameter" },
          { status: 400 }
        );
      }

      const result = await getEmployeeHierarchyUp(employeeId);
      if (!result) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ hierarchy: result });
    }

    // Get employee subordinates
    if (mode === "employee-subordinates") {
      const employeeId = searchParams.get("employeeId");
      if (!employeeId) {
        return NextResponse.json(
          { error: "Missing 'employeeId' parameter" },
          { status: 400 }
        );
      }

      const result = await getEmployeeSubordinates(employeeId);
      if (!result) {
        return NextResponse.json(
          { error: "Employee not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    }

    // Search zones
    if (mode === "search-zones") {
      const zoneId = searchParams.get("zoneId") || undefined;
      const zoneName = searchParams.get("zoneName") || undefined;
      const department = searchParams.get("department") || undefined;
      const limit = searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20;

      const result = await searchZones({
        zoneId,
        zoneName,
        department,
        limit,
      });

      return NextResponse.json({ zones: result });
    }

    // Get department structure
    if (mode === "department-structure") {
      const department = searchParams.get("department");
      if (!department) {
        return NextResponse.json(
          { error: "Missing 'department' parameter" },
          { status: 400 }
        );
      }

      const result = await getDepartmentStructure(department);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: `Unknown mode: ${mode}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[zone-employee-query] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
