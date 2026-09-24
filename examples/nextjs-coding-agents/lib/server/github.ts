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

const userCache = new Map<
  string,
  { fetchedAt: number; user: GitHubUser | null }
>();

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

const BRANCHES_TTL_MS = 5 * 60 * 1000;
const branchesCache = new Map<
  string,
  { fetchedAt: number; result: { branches: string[]; defaultBranch?: string } }
>();

/** Whether a server token for reading private repositories is configured. */
export function hasGitHubToken() {
  return Boolean(process.env.GITHUB_TOKEN);
}

/**
 * Branches of a repository, for the branch picker on the new chat screen.
 * Public repositories are readable with the app's credentials. Private ones
 * need a token that can see them: `GITHUB_TOKEN` (a read-only fine-grained
 * token for the org) when set, otherwise the signed-in person's token,
 * which only helps if the OAuth scopes include `repo`. Returns null when
 * the repository can't be read with any of them.
 */
export async function listBranches(
  repoName: string,
  accessToken?: string
): Promise<{ branches: string[]; defaultBranch?: string } | null> {
  const cacheKey = `${accessToken ?? ""}:${repoName}`;
  const cached = branchesCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < BRANCHES_TTL_MS) {
    return cached.result;
  }

  // Most-capable credential first; each is only tried if the previous 404s
  const tokens = [
    ...(process.env.GITHUB_TOKEN ? [process.env.GITHUB_TOKEN] : []),
    ...(accessToken ? [accessToken] : []),
    undefined,
  ];
  let repoResponse: Response | null = null;
  let branchesResponse: Response | null = null;
  for (const token of tokens) {
    [repoResponse, branchesResponse] = await Promise.all([
      githubFetch(`/repos/${repoName}`, token),
      githubFetch(`/repos/${repoName}/branches?per_page=100`, token),
    ]);
    if (repoResponse.ok && branchesResponse.ok) {
      break;
    }
  }
  if (!repoResponse?.ok || !branchesResponse?.ok) {
    return null;
  }

  const { default_branch } = (await repoResponse.json()) as {
    default_branch: string;
  };
  const branches = (await branchesResponse.json()) as { name: string }[];

  // Default branch first, the rest alphabetically
  const names = branches
    .map((branch) => branch.name)
    .filter((name) => name !== default_branch)
    .sort((a, b) => a.localeCompare(b));
  const result = {
    branches: [default_branch, ...names],
    defaultBranch: default_branch,
  };
  branchesCache.set(cacheKey, { fetchedAt: Date.now(), result });
  return result;
}

export type PullRequestDetails = {
  number: number;
  title: string;
  // Markdown; empty when the PR has no description
  body: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  author: GitHubUser | null;
  url: string;
  updatedAt: string;
};

/** `https://github.com/owner/repo/pull/123` → its parts, or null */
export function parsePullRequestUrl(url: string) {
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)(?:[/?#].*)?$/
  );
  return match ? { repoName: match[1], number: Number(match[2]) } : null;
}

/**
 * Title, description, and state of a pull request, for the Description tab
 * next to a chat. Same credential order as `listBranches`: private
 * repositories need `GITHUB_TOKEN`.
 */
export async function getPullRequest(
  url: string,
  accessToken?: string
): Promise<PullRequestDetails | null> {
  const parsed = parsePullRequestUrl(url);
  if (!parsed) {
    return null;
  }

  const tokens = [
    ...(process.env.GITHUB_TOKEN ? [process.env.GITHUB_TOKEN] : []),
    ...(accessToken ? [accessToken] : []),
    undefined,
  ];
  let response: Response | null = null;
  for (const token of tokens) {
    response = await githubFetch(
      `/repos/${parsed.repoName}/pulls/${parsed.number}`,
      token
    );
    if (response.ok) {
      break;
    }
  }
  if (!response?.ok) {
    return null;
  }

  const pull = (await response.json()) as {
    number: number;
    title: string;
    body: string | null;
    state: "open" | "closed";
    merged: boolean;
    draft: boolean;
    html_url: string;
    updated_at: string;
    user: Omit<ProfileResponse, "name" | "email"> | null;
  };

  return {
    number: pull.number,
    title: pull.title,
    body: pull.body ?? "",
    state: pull.merged ? "merged" : pull.state,
    draft: pull.draft,
    author: pull.user
      ? toUser({ ...pull.user, name: null, email: null })
      : null,
    url: pull.html_url,
    updatedAt: pull.updated_at,
  };
}

/**
 * Git trailer that credits a person on a commit made by someone else (here,
 * the Cursor GitHub App). GitHub links it to their account via the email.
 */
export function coAuthorTrailer(user: GitHubUser) {
  return `Co-authored-by: ${user.name} <${user.email}>`;
}
