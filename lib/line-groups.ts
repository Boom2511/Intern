/**
 * LINE Group Management
 * Helper functions for managing LINE group information in database
 */

import { prisma } from './prisma';
import { lineService } from './line';
import type { Department } from '@prisma/client';

/**
 * Get or create LINE group record in database
 * Fetches group name from LINE API if not in database
 */
export async function getOrCreateLineGroup(
  groupId: string,
  department?: Department,
  zoneId?: string
): Promise<{ groupName: string } | null> {
  try {
    // Check if group exists in database
    let lineGroup = await prisma.lineGroup.findUnique({
      where: { groupId },
    });

    if (lineGroup) {
      return { groupName: lineGroup.groupName };
    }

    // Fetch from LINE API
    const groupSummary = await lineService.getGroupSummary(groupId);

    if (!groupSummary) {
      console.warn(`⚠️ Could not fetch group summary for ${groupId}`);
      return null;
    }

    // Create new record
    lineGroup = await prisma.lineGroup.create({
      data: {
        groupId,
        groupName: groupSummary.groupName,
        department,
        zoneId,
        isActive: true,
      },
    });

    console.log(`✅ Created LINE group record: ${groupSummary.groupName}`);
    return { groupName: lineGroup.groupName };
  } catch (error) {
    console.error('❌ Error in getOrCreateLineGroup:', error);
    return null;
  }
}

/**
 * Update LINE group name from API
 * Useful for refreshing group names periodically
 */
export async function updateLineGroupName(groupId: string): Promise<boolean> {
  try {
    const groupSummary = await lineService.getGroupSummary(groupId);

    if (!groupSummary) {
      return false;
    }

    await prisma.lineGroup.update({
      where: { groupId },
      data: { groupName: groupSummary.groupName },
    });

    console.log(`✅ Updated LINE group name: ${groupSummary.groupName}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating LINE group name:', error);
    return false;
  }
}

/**
 * Get cached group name from database
 * Returns null if not found (caller should use getOrCreateLineGroup)
 */
export async function getCachedGroupName(groupId: string): Promise<string | null> {
  try {
    const lineGroup = await prisma.lineGroup.findUnique({
      where: { groupId },
      select: { groupName: true },
    });

    return lineGroup?.groupName || null;
  } catch (error) {
    console.error('❌ Error getting cached group name:', error);
    return null;
  }
}

/**
 * Associate LINE group with department and zone
 */
export async function associateGroupWithDepartment(
  groupId: string,
  department: Department,
  zoneId?: string
): Promise<boolean> {
  try {
    await prisma.lineGroup.upsert({
      where: { groupId },
      update: { department, zoneId },
      create: {
        groupId,
        groupName: `Group ${groupId.substring(0, 8)}`, // Fallback name
        department,
        zoneId,
        isActive: true,
      },
    });

    console.log(`✅ Associated group ${groupId} with ${department}${zoneId ? ` Zone ${zoneId}` : ''}`);
    return true;
  } catch (error) {
    console.error('❌ Error associating group with department:', error);
    return false;
  }
}
