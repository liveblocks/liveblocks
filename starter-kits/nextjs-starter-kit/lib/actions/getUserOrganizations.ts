"use server";

import { auth } from "@/auth";
import { getUserOrganizations as getOrganizationsFromDb } from "@/lib/database/getUserOrganizations";

/**
 * Get Organizations
 *
 * Fetch organizations for the current authenticated user from your database
 */
export async function getUserOrganizations() {
  const session = await auth();

  if (!session) {
    return { data: [] };
  }

  const organizations = await getOrganizationsFromDb({
    userId: session.user.info.id,
  });

  return { data: organizations };
}
