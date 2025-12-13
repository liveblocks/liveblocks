"use server";

import { cookies } from "next/headers";

const ORGANIZATION_COOKIE_NAME = "currentOrganizationId";

/**
 * Get Current Organization
 *
 * Gets the current organization/tenant ID from the cookie.
 * Used in server-side auth callbacks.
 *
 * @returns The organization/tenant ID or null if not set
 */
export async function getCurrentOrganization(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ORGANIZATION_COOKIE_NAME)?.value || null;
}
