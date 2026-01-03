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

    if (!mode) {
      return NextResponse.json(
        { error: "Missing 'mode' parameter" },
        { status: 400 }
      );
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
