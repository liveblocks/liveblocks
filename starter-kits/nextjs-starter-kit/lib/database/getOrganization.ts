import { organizations } from "@/data/organizations";
import { Organization } from "@/types";

/**
 * Get Organization
 *
 * Simulates calling your database and returning an organization
 *
 * @param id - The organization's id
 */
export async function getOrganization(
  id: string
): Promise<Organization | null> {
  return organizations.find((organization) => organization.id === id) ?? null;
}
