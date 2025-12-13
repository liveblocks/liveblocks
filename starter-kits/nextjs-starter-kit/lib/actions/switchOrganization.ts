"use server";

import { cookies } from "next/headers";
import { auth } from "@/auth";
import { getOrganizations } from "../database/getOrganizations";

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

  // Verify user has access to the organization
  const userOrganizations = await getOrganizations({
    userId: session.user.info.id,
  });

  if (!userOrganizations.some((org) => org.id === organizationId)) {
    return {
      error: {
        code: 403,
        message: "Access denied",
        suggestion: `You don't have access to this organization: ${organizationId}`,
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
