"use server";

import { auth } from "@/auth";
import { getOrganizations as getOrganizationsFromDb } from "@/lib/database/getOrganizations";
import { Organization } from "@/types";

/**
 * Get Organizations
 *
 * Fetch organizations for the current authenticated user from your database
 */
export async function getUserOrganizations(): Promise<Organization[]> {
  const session = await auth();

  if (!session) {
    return [];
  }

  const organizations = await getOrganizationsFromDb({
    userId: session.user.info.id,
  });

  return organizations;
}
