"use server";

import { cookies } from "next/headers";

const ORGANIZATION_COOKIE_NAME = "currentOrganizationId";

/**
 * Get Organization ID from Cookie
 *
 * Gets the current organization/tenant ID from the cookie.
 * Used in server-side auth callbacks.
 *
 * @returns The organization/tenant ID or null if not set
 */
export async function getOrganizationIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ORGANIZATION_COOKIE_NAME)?.value || null;
}

/**
 * Set Organization ID in Cookie
 *
 * Sets the current organization/tenant ID in a cookie.
 * Used when switching organizations.
 *
 * @param organizationId - The organization/tenant ID to set
 */
export async function setOrganizationIdInCookie(
  organizationId: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ORGANIZATION_COOKIE_NAME, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}
