"use server";

import { getOrganization } from "@/lib/database";
import { Organization } from "@/types";

type Props = {
  organizationIds: Organization["id"][];
};

/**
 * Get Organizations
 *
 * Fetch organizations from your database API
 * Uses custom API endpoint
 *
 * @param organizationIds - The organizations' ids
 */
export async function getOrganizations({ organizationIds }: Props) {
  // Get all organizations
  const organizations = await Promise.all(
    organizationIds.map((organizationId) => getOrganization(organizationId))
  );

  // Filter out any that didn't return
  const filtered = organizations.filter(
    (organization) => organization
  ) as Organization[];

  return { data: filtered };
}
