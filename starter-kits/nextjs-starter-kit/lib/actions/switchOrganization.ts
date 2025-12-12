"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";

const ORGANIZATION_COOKIE_NAME = "currentOrganizationId";

/**
 * Switch Organization
 *
 * Updates the current organization/tenant for the authenticated user
 * Stores the organization in a cookie which is then read in auth callbacks
 *
 * @param organizationId - The organization/tenant ID to switch to
 */
export async function switchOrganization(organizationId: string) {
  const session = await auth();

  if (!session) {
    return {
      error: {
        code: 401,
        message: "Not signed in",
        suggestion: "Sign in to switch organizations",
      },
    };
  }

  // Verify user has access to this organization
  // Users always have access to their personal organization (their own ID)
  const userOrganizationIds = session.user.info.organizationIds || [];
  const isPersonalOrg = organizationId === session.user.info.id;

  if (!isPersonalOrg && !userOrganizationIds.includes(organizationId)) {
    return {
      error: {
        code: 403,
        message: "Access denied",
        suggestion: "You don't have access to this organization",
      },
    };
  }

  // Store organization in cookie
  const cookieStore = await cookies();
  cookieStore.set(ORGANIZATION_COOKIE_NAME, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return { success: true };
}

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
