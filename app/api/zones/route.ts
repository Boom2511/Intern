/**
 * Zone Management API
 * GET /api/zones - List zones with filtering
 * POST /api/zones - Create or update zone mapping
 *
 * Handles zone management for the helpdesk system:
 * - List zones with filters (mapped/unmapped, by source)
 * - Assign employees to zones
 * - Mark zones as mapped
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ZoneSource } from "@prisma/client";

/**
 * GET /api/zones - List zones with optional filters
 * Query params:
 * - isMapped: boolean (filter by mapping status)
 * - source: TICKET | XLSX | MANUAL
 * - search: string (search by zoneId or zoneName)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const isMappedParam = searchParams.get("isMapped");
    const sourceParam = searchParams.get("source");
    const searchParam = searchParams.get("search");

    // Build filter
    const where: any = {};

    if (isMappedParam !== null) {
      where.isMapped = isMappedParam === "true";
    }

    if (
      sourceParam &&
      Object.values(ZoneSource).includes(sourceParam as ZoneSource)
    ) {
      where.source = sourceParam as ZoneSource;
    }

    if (searchParam) {
      where.OR = [
        { zoneId: { contains: searchParam, mode: "insensitive" } },
        { zoneName: { contains: searchParam, mode: "insensitive" } },
      ];
    }

    // Fetch zones with employee assignments
    const zones = await prisma.zone.findMany({
      where,
      include: {
        employees: {
          include: {
            employee: {
              include: {
                manager: {
                  include: {
                    zones: {
                      include: {
                        zone: true,
                      },
                    },
                  },
                }, // Include manager with their zones for hierarchy lookup
              },
            },
            chiefOfficer: {
                include: {
                  zones: {
                    include: {
                      zone: true,
                    },
                  },
                },
              },
          },
        },
      },
      orderBy: [{ isMapped: "asc" }, { updatedAt: "desc" }],
    });

    // If searching for a ZNE zone, also check if it's referenced as chiefOfficer
    let refinedZones = zones;
    if (searchParam && searchParam.startsWith("ZNE")) {
      console.log(`[Zone API] Searching for ZNE zone: ${searchParam}`);

      // Get zones that reference this zone ID as CHIEF
      const zoneAsChief = await prisma.zone.findMany({
        where: {
          employees: {
            some: {
              chiefOfficer: {
                zones: {
                  some: {
                    zone: { zoneId: searchParam },
                  },
                },
              },
            },
          },
        },
        include: {
          employees: {
            include: {
              employee: true,
              chiefOfficer: true,
            },
          },
        },
      });

      // Check if searchParam zone exists and might be a CHIEF reference
      const targetZone = await prisma.zone.findUnique({
        where: { zoneId: searchParam },
        include: {
          employees: {
            include: {
              employee: {
                include: {
                  manager: {
                    include: {
                      zones: {
                        include: {
                          zone: true,
                        },
                      },
                    },
                  },
                },
              },
              chiefOfficer: {
                include: {
                  zones: {
                    include: {
                      zone: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (targetZone) {
        console.log(
          `[Zone API] Found target zone ${searchParam}, employees: ${targetZone.employees.length}`
        );
        refinedZones = [
          targetZone,
          ...zones.filter((z) => z.zoneId !== searchParam),
        ];
      }
    }

    const finalZones = refinedZones;

    // Transform data for frontend
    const transformedZones = finalZones
      .map((zone) => {
        // Find CHIEF and DB_HEAD from employees in this zone
        let chiefOfficer: any = null;
        let dbHead: any = null;

        // Priority 1: Check if any zone employee has chiefOfficerId assigned (from import)
        zone.employees.forEach((ze) => {
          if (ze.chiefOfficer && !chiefOfficer) {
            chiefOfficer = {
              id: ze.chiefOfficer.id,
              employeeId: ze.chiefOfficer.employeeId,
              name: ze.chiefOfficer.name,
              department: ze.chiefOfficer.department,
            };
          }
          if (ze.employee.role === "DB_HEAD") {
            dbHead = {
              id: ze.employee.id,
              employeeId: ze.employee.employeeId,
              name: ze.employee.name,
              department: ze.employee.department,
            };
          }
        });

        // Priority 2: If no chiefOfficerId found, look for CHIEF role in zone
        if (!chiefOfficer) {
          zone.employees.forEach((ze) => {
            if (ze.employee.role === "CHIEF" && !chiefOfficer) {
              chiefOfficer = {
                id: ze.employee.id,
                employeeId: ze.employee.employeeId,
                name: ze.employee.name,
                department: ze.employee.department,
              };
            }
          });
        }

        // Priority 3: If no DB_HEAD found in employees, resolve from hierarchy
        // Try to find DB HEAD through manager chain of CHIEF or first STAFF
        if (!dbHead && zone.employees.length > 0) {
          let current: any = null;

          // Start from CHIEF if exists
          if (chiefOfficer) {
            current = zone.employees.find(
              (ze) => ze.employee.employeeId === chiefOfficer.employeeId
            )?.employee;
          } else {
            // Otherwise start from first employee
            current = zone.employees[0]?.employee;
          }

          // Walk up the manager chain to find DB_HEAD
          let depth = 0;
          while (current && depth < 10) {
            if (current.role === "DB_HEAD") {
              dbHead = {
                id: current.id,
                employeeId: current.employeeId,
                name: current.name,
                department: current.department,
              };
              break;
            }
            // Move to manager
            current = current.manager;
            depth++;
          }
        }

        // Priority 4: If ZNE zone with no employees, try to find CHIEF employee from zoneId
        if (!chiefOfficer && zone.zoneId.startsWith("ZNE")) {
          // Extract zone number from ZNE zone ID (e.g., ZNE10260EVD0501 → 0501)
          const zoneNumber = zone.zoneId.match(/EVD(\d+)/)?.[1];
          console.log(
            `[Zone API] ${zone.zoneId}: CHIEF not found (employees: ${zone.employees.length}, zoneNumber: ${zoneNumber})`
          );
        }

        console.log(
          `[Zone API] ${zone.zoneId}: chiefOfficer=${
            chiefOfficer?.name || "NOT FOUND"
          }, dbHead=${dbHead?.name || "NOT FOUND"}, employees=${
            zone.employees.length
          }`
        );

        return {
          id: zone.id,
          zoneId: zone.zoneId,
          zoneName: zone.zoneName,
          isMapped: zone.isMapped,
          source: zone.source,
          createdAt: zone.createdAt,
          updatedAt: zone.updatedAt,
          employees: zone.employees.map((ze) => {
            // For STAFF, show their manager (CHIEF) in hierarchy
            let employeeChief = null;
            
            if (ze.employee.role === "STAFF") {
              // Priority 1: Use chiefOfficer from ZoneEmployee if available
              if (ze.chiefOfficer) {
                employeeChief = {
                  id: ze.chiefOfficer.id,
                  employeeId: ze.chiefOfficer.employeeId,
                  name: ze.chiefOfficer.name,
                  zones: ze.chiefOfficer.zones.map((z) => ({
                    zoneId: z.zone.zoneId,
                    zoneName: z.zone.zoneName,
                  })),
                };
              } 
              // Priority 2: Use employee.manager if it's a CHIEF
              else if (ze.employee.manager && ze.employee.manager.role === "CHIEF") {
                // Fetch manager's zones for display
                employeeChief = {
                  id: ze.employee.manager.id,
                  employeeId: ze.employee.manager.employeeId,
                  name: ze.employee.manager.name,
                  zones: ze.employee.manager.zones?.map((z: any) => ({
                    zoneId: z.zone.zoneId,
                    zoneName: z.zone.zoneName,
                  })) || [],
                };
              }
            }
            
            return {
              id: ze.employee.id,
              employeeId: ze.employee.employeeId,
              name: ze.employee.name,
              department: ze.employee.department,
              role: ze.employee.role,
              chiefOfficer: employeeChief,
            };
          }),
          employeeCount: zone.employees.length,
          // Zone department from first employee, CHIEF, or DB_HEAD
          department:
            zone.employees[0]?.employee?.department ||
            chiefOfficer?.department ||
            dbHead?.department ||
            null,
          chiefOfficer,
          dbHead,
        };
      })
      .filter((zone) => {
        // Filter: only return zones that have employees OR have chiefOfficer/dbHead assigned
        const hasEmployees = zone.employeeCount > 0;
        const hasChief = zone.chiefOfficer !== null;
        const hasDbHead = zone.dbHead !== null;

        return hasEmployees || hasChief || hasDbHead;
      });

    return NextResponse.json({
      success: true,
      zones: transformedZones,
      total: transformedZones.length,
      debug: {
        searchParam,
        totalZonesFound: finalZones.length,
        totalZonesReturned: transformedZones.length,
      },
    });
  } catch (error: any) {
    console.error("[Zones] Failed to fetch zones:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch zones" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/zones - Assign employees to zone and mark as mapped
 * Body:
 * {
 *   zoneId: string,
 *   employeeIds: number[] (employee.id, not employeeId string)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only ADMINISTRATOR and ADMIN can manage zones
    if (user.role !== "ADMINISTRATOR" && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { zoneId, employeeIds } = body as {
      zoneId: string;
      employeeIds: number[];
    };

    if (!zoneId) {
      return NextResponse.json(
        { success: false, error: "zoneId is required" },
        { status: 400 }
      );
    }

    // Find the zone
    const zone = await prisma.zone.findUnique({
      where: { zoneId },
    });

    if (!zone) {
      return NextResponse.json(
        { success: false, error: "Zone not found" },
        { status: 404 }
      );
    }

    // Update zone mapping in a transaction
    await prisma.$transaction(async (tx) => {
      // Remove existing employee assignments
      await tx.zoneEmployee.deleteMany({
        where: { zoneId: zone.id },
      });

      // Add new employee assignments
      if (employeeIds && employeeIds.length > 0) {
        await tx.zoneEmployee.createMany({
          data: employeeIds.map((employeeId) => ({
            zoneId: zone.id,
            employeeId,
          })),
          skipDuplicates: true,
        });
      }

      // Mark zone as mapped
      await tx.zone.update({
        where: { id: zone.id },
        data: {
          isMapped: true,
          updatedAt: new Date(),
        },
      });
    });

    // Fetch updated zone
    const updatedZone = await prisma.zone.findUnique({
      where: { zoneId },
      include: {
        employees: {
          include: {
            employee: true,
          },
        },
      },
    });

    console.log(
      `[Zones] Zone ${zoneId} mapped with ${employeeIds?.length || 0} employees`
    );

    return NextResponse.json({
      success: true,
      zone: updatedZone,
    });
  } catch (error: any) {
    console.error("[Zones] Failed to update zone:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update zone" },
      { status: 500 }
    );
  }
}
