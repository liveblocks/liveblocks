import type { Session } from "next-auth";

/**
 * Derives a stable per-user owner id from the NextAuth session. We prefer the
 * GitHub numeric id (which never changes), then the GitHub login, then email.
 *
 * Returns null when the user is not signed in.
 */
export function ownerIdFromSession(session: Session | null): string | null {
  if (!session?.user) return null;
  const u = session.user;
  if (u.githubId) return `gh_${u.githubId}`;
  if (u.githubLogin) return `gh_${u.githubLogin}`;
  if (u.email) return `email_${u.email}`;
  return null;
}
