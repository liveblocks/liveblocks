import { organizations } from "@/data/organizations";
import { getCurrentOrganization } from "@/lib/actions/getCurrentOrganization";
import { Group } from "@/types";

/**
 * Get Group
 *
 * Simulates calling your database and returning a group
 *
 * @param id - The group's id
 */
export async function getGroup(groupId: string): Promise<Group | null> {
  // Special cases for `@everyone` and `@here` as they're not "real" groups
  if (groupId === "everyone") {
    return {
      id: "everyone",
      name: "Everyone",
    };
  }

  if (groupId === "here") {
    return {
      id: "here",
      name: "Here",
    };
  }

  // Get current organization from cookie
  const organizationId = await getCurrentOrganization();

  if (!organizationId) {
    return null;
  }

  // Search in the current organization
  const organization = organizations.find((org) => org.id === organizationId);

  if (!organization) {
    return null;
  }

  console.log(organization.groups, groupId);

  return organization.groups.find((group) => group.id === groupId) ?? null;
}
