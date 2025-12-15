"use server";

import { organizations } from "@/data/organizations";
import { getCurrentOrganization } from "@/lib/actions/getCurrentOrganization";

/**
 * Get Group IDs from Current Organization
 *
 * Gets the group IDs from the current organization/workspace from the cookie.
 *
 * @param userId - The user's ID (unused, kept for API compatibility)
 * @returns Array of group IDs from the current organization
 */
export async function getCurrentOrganizationGroupIds(
  userId?: string
): Promise<string[]> {
  // Get current organization from cookie
  const organizationId = (await getCurrentOrganization()) ?? "default";

  // Get groups from the current organization
  const organization = organizations.find((org) => org.id === organizationId);
  return organization?.groups.map((group) => group.id) ?? [];
}


