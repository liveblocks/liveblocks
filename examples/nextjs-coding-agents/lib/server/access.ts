import { isOrgMember } from "@/lib/server/github";
import type { AccessRole } from "@/lib/types";

export const ALLOWED_ORG = process.env.GITHUB_ALLOWED_ORG?.trim() || null;

const ALLOWED_USERS = new Set(
  (process.env.GITHUB_ALLOWED_USERS ?? "")
    .split(",")
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean)
);

/**
 * Decides what a GitHub user may do. Members of `GITHUB_ALLOWED_ORG` and
 * logins in `GITHUB_ALLOWED_USERS` get write access. When neither is set,
 * everyone who can sign in is a member, which is only sensible for local
 * development or a private deployment behind your own access control.
 */
export async function getAccessRole(
  login: string,
  accessToken: string | undefined
): Promise<AccessRole> {
  if (ALLOWED_USERS.has(login.toLowerCase())) {
    return "member";
  }

  if (ALLOWED_ORG) {
    if (accessToken && (await isOrgMember(ALLOWED_ORG, accessToken))) {
      return "member";
    }
    return "viewer";
  }

  return ALLOWED_USERS.size > 0 ? "viewer" : "member";
}
