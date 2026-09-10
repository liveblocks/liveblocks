/**
 * Thin GitHub REST client for user lookups. Profiles are public, so they're
 * fetched with the OAuth app's client credentials (5,000 requests/hour)
 * rather than any person's token, and cached per server process.
 */

export type GitHubUser = {
  id: number;
  login: string;
  name: string;
  avatar: string;
  /** Public email if set, otherwise GitHub's noreply address for the account */
  email: string;
};

const API = "https://api.github.com";
const USER_TTL_MS = 60 * 60 * 1000;
const MEMBERS_TTL_MS = 10 * 60 * 1000;

const userCache = new Map<
  string,
  { fetchedAt: number; user: GitHubUser | null }
>();
let membersCache: { fetchedAt: number; members: GitHubUser[] } | null = null;

function appAuthorization() {
  const id = process.env.AUTH_GITHUB_ID;
  const secret = process.env.AUTH_GITHUB_SECRET;
  if (!id || !secret) {
    return null;
  }
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function githubFetch(path: string, accessToken?: string) {
  const authorization = accessToken
    ? `Bearer ${accessToken}`
    : appAuthorization();

  return fetch(`${API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "liveblocks-coding-agents",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    cache: "no-store",
  });
}

type ProfileResponse = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
};

function toUser(profile: ProfileResponse): GitHubUser {
  return {
    id: profile.id,
    login: profile.login,
    name: profile.name?.trim() || profile.login,
    avatar: profile.avatar_url,
    email:
      profile.email ??
      `${profile.id}+${profile.login}@users.noreply.github.com`,
  };
}

export async function getGitHubUser(login: string): Promise<GitHubUser | null> {
  const key = login.toLowerCase();
  const cached = userCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < USER_TTL_MS) {
    return cached.user;
  }

  const response = await githubFetch(`/users/${encodeURIComponent(login)}`);
  if (!response.ok) {
    // Don't cache rate-limit failures; do cache genuine 404s.
    if (response.status === 404) {
      userCache.set(key, { fetchedAt: Date.now(), user: null });
    }
    return cached?.user ?? null;
  }

  const user = toUser((await response.json()) as ProfileResponse);
  userCache.set(key, { fetchedAt: Date.now(), user });
  return user;
}

export async function getGitHubUsers(logins: string[]) {
  const unique = [...new Set(logins)];
  const users = await Promise.all(unique.map((login) => getGitHubUser(login)));
  const byLogin = new Map<string, GitHubUser>();
  users.forEach((user, index) => {
    if (user) {
      byLogin.set(unique[index], user);
    }
  });
  return byLogin;
}

/** Whether the token's owner is an active member of the organization. */
export async function isOrgMember(org: string, accessToken: string) {
  const response = await githubFetch(
    `/user/memberships/orgs/${encodeURIComponent(org)}`,
    accessToken
  );
  if (!response.ok) {
    return false;
  }
  const membership = (await response.json()) as { state?: string };
  return membership.state === "active";
}

/**
 * Members of the organization, for @mention suggestions. Listed with a
 * member's token (the org may hide its member list from outsiders).
 */
export async function listOrgMembers(
  org: string,
  accessToken: string
): Promise<GitHubUser[]> {
  if (membersCache && Date.now() - membersCache.fetchedAt < MEMBERS_TTL_MS) {
    return membersCache.members;
  }

  const members: GitHubUser[] = [];
  for (let page = 1; page <= 5; page++) {
    const response = await githubFetch(
      `/orgs/${encodeURIComponent(org)}/members?per_page=100&page=${page}`,
      accessToken
    );
    if (!response.ok) {
      break;
    }
    const items = (await response.json()) as Omit<
      ProfileResponse,
      "name" | "email"
    >[];
    members.push(
      ...items.map((item) => toUser({ ...item, name: null, email: null }))
    );
    if (items.length < 100) {
      break;
    }
  }

  membersCache = { fetchedAt: Date.now(), members };
  return members;
}

/** Searches all of GitHub, used when no organization is configured. */
export async function searchGitHubUsers(
  query: string,
  accessToken: string
): Promise<GitHubUser[]> {
  const response = await githubFetch(
    `/search/users?q=${encodeURIComponent(query)}&per_page=8`,
    accessToken
  );
  if (!response.ok) {
    return [];
  }
  const { items } = (await response.json()) as {
    items: Omit<ProfileResponse, "name" | "email">[];
  };
  return items.map((item) => toUser({ ...item, name: null, email: null }));
}

/**
 * Git trailer that credits a person on a commit made by someone else (here,
 * the Cursor GitHub App). GitHub links it to their account via the email.
 */
export function coAuthorTrailer(user: GitHubUser) {
  return `Co-authored-by: ${user.name} <${user.email}>`;
}
