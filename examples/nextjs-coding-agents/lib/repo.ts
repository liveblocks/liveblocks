export type Repo = {
  url: string;
  ref: string;
};

const GITHUB_REPO_PATTERN =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;

export const DEFAULT_REF = "main";

/**
 * Where the agent is asked to save the diff of its work at the end of every
 * run. Cloud agents upload anything written to `/opt/cursor/artifacts/` on
 * their machine, and the API addresses the upload as `artifacts/<name>`.
 */
export const DIFF_ARTIFACT_DIR = "/opt/cursor/artifacts";
export const DIFF_ARTIFACT_FILE = `${DIFF_ARTIFACT_DIR}/changes.diff`;
export const DIFF_ARTIFACT_PATH = "artifacts/changes.diff";

/**
 * GitHub serves the diff between two refs of a public repository without
 * credentials. Used as a fallback when the agent didn't save its artifact.
 */
export function getCompareDiffUrl(repoUrl: string, base: string, head: string) {
  const name = getRepoName(repoUrl);
  return `https://github.com/${name}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}.diff`;
}

/**
 * Each chat stores its own repository in feed metadata, and people pick one
 * from the repositories connected to Cursor when starting a chat. Setting
 * NEXT_PUBLIC_LOCKED_REPO pins every chat to one repository instead, which
 * is how the hosted demo runs.
 */
export const LOCKED_REPO: Repo | null = (() => {
  const url = normalizeRepoUrl(process.env.NEXT_PUBLIC_LOCKED_REPO ?? "");
  return url
    ? {
        url,
        ref: process.env.NEXT_PUBLIC_LOCKED_REPO_REF?.trim() || DEFAULT_REF,
      }
    : null;
})();

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
 * Resolves the repo a new chat should use. When a repo is locked, the
 * client's choice is ignored on the server as well as hidden in the UI.
 */
export function resolveRepo(requested: Partial<Repo> | undefined): Repo | null {
  if (LOCKED_REPO) {
    return LOCKED_REPO;
  }

  const url = requested?.url ? normalizeRepoUrl(requested.url) : null;
  if (!url) {
    return null;
  }

  return { url, ref: requested?.ref?.trim() || DEFAULT_REF };
}
