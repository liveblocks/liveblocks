export type Repo = {
  url: string;
  ref: string;
};

// The repository every new chat works on. Each chat stores its own repo in
// feed metadata, so you can let people pick any GitHub repository by
// setting `REPO_LOCKED` to false. It's locked for the hosted demo.
export const DEFAULT_REPO: Repo = {
  url: "https://github.com/liveblocks/demo-comments-hover-boostr",
  ref: "main",
};

export const REPO_LOCKED = true;

const GITHUB_REPO_PATTERN =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;

export function isValidRepoUrl(url: string) {
  return GITHUB_REPO_PATTERN.test(url.trim());
}

export function normalizeRepoUrl(url: string) {
  const match = url.trim().match(GITHUB_REPO_PATTERN);
  if (!match) {
    return null;
  }
  return `https://github.com/${match[1]}/${match[2]}`;
}

/** "https://github.com/owner/repo" -> "owner/repo" */
export function getRepoName(url: string) {
  const match = url.match(GITHUB_REPO_PATTERN);
  return match ? `${match[1]}/${match[2]}` : url;
}

/**
 * Resolves the repo a new chat should use. When the repo is locked, the
 * client's choice is ignored on the server as well as hidden in the UI.
 */
export function resolveRepo(requested: Partial<Repo> | undefined): Repo | null {
  if (REPO_LOCKED) {
    return DEFAULT_REPO;
  }

  const url = requested?.url ? normalizeRepoUrl(requested.url) : null;
  if (!url) {
    return null;
  }

  const ref = requested?.ref?.trim() || DEFAULT_REPO.ref;
  return { url, ref };
}
