import { tool } from "ai";
import { z } from "zod";
import { DEFAULT_REF, DIFF_ARTIFACT_PATH, getRepoName } from "@/lib/repo";
import { downloadArtifact } from "@/lib/server/cursor";
import { githubGet } from "@/lib/server/github";
import type { ChatFeedMetadata } from "@/lib/types";

/**
 * Read-only tools that let the quick-answer model look at the chat's
 * repository over the GitHub API: browse and read files, search code, list
 * commits, and see what the coding agent changed. Everything is scoped to
 * the chat's repository; the default ref is the agent's branch when it has
 * one, else the base branch. Private repositories need `GITHUB_TOKEN`.
 */

const MAX_FILE_CHARS = 40_000;
const MAX_DIFF_CHARS = 40_000;
const MAX_ENTRIES = 200;

export type RepoContext = {
  repoUrl: string;
  repoName: string;
  baseRef: string;
  // The coding agent's branch, once it has pushed
  branch?: string;
  prUrl?: string;
  cursorAgentId?: string;
};

export function getRepoContext(metadata: ChatFeedMetadata): RepoContext | null {
  if (!metadata.repoUrl) {
    return null;
  }
  return {
    repoUrl: metadata.repoUrl,
    repoName: getRepoName(metadata.repoUrl),
    baseRef: metadata.repoRef ?? DEFAULT_REF,
    branch: metadata.branch,
    prUrl: metadata.prUrl,
    cursorAgentId: metadata.cursorAgentId,
  };
}

export function createRepoTools(repo: RepoContext) {
  const defaultRef = repo.branch ?? repo.baseRef;
  const refField = z
    .string()
    .optional()
    .describe(
      `Branch, tag, or commit to read from. Defaults to ${JSON.stringify(defaultRef)}${
        repo.branch ? " (the coding agent's branch)" : ""
      }.`
    );

  return {
    listDirectory: tool({
      description:
        "List the files and folders at a path in the repository. Use an empty path for the root.",
      inputSchema: z.object({
        path: z.string().default("").describe("Directory path, e.g. src/lib"),
        ref: refField,
      }),
      execute: async ({ path, ref }) => {
        const response = await githubGet(
          `/repos/${repo.repoName}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref ?? defaultRef)}`
        );
        if (!response.ok) {
          return { error: await describeFailure(response, "directory") };
        }
        const entries = (await response.json()) as
          | { name: string; path: string; type: string; size: number }[]
          | { type: string };
        if (!Array.isArray(entries)) {
          return { error: `${path || "/"} is a file, not a directory` };
        }
        return {
          entries: entries
            .slice(0, MAX_ENTRIES)
            .map(({ name, path, type, size }) => ({ name, path, type, size })),
          ...(entries.length > MAX_ENTRIES
            ? { truncated: entries.length - MAX_ENTRIES }
            : {}),
        };
      },
    }),

    readFile: tool({
      description:
        "Read a file from the repository. Long files are cut off; ask for a line range to see more.",
      inputSchema: z.object({
        path: z.string().describe("File path, e.g. src/index.ts"),
        ref: refField,
        startLine: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("First line to return (1-based)"),
        endLine: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Last line to return (inclusive)"),
      }),
      execute: async ({ path, ref, startLine, endLine }) => {
        const response = await githubGet(
          `/repos/${repo.repoName}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref ?? defaultRef)}`,
          undefined,
          "application/vnd.github.raw+json"
        );
        if (!response.ok) {
          return { error: await describeFailure(response, "file") };
        }
        const content = await response.text();
        const lines = content.split("\n");
        const from = Math.max(1, startLine ?? 1);
        const to = Math.min(lines.length, endLine ?? lines.length);
        const slice = lines.slice(from - 1, to).join("\n");
        const truncated = slice.length > MAX_FILE_CHARS;
        return {
          path,
          ref: ref ?? defaultRef,
          totalLines: lines.length,
          fromLine: from,
          toLine: to,
          content: truncated ? slice.slice(0, MAX_FILE_CHARS) : slice,
          ...(truncated ? { truncated: true } : {}),
        };
      },
    }),

    searchCode: tool({
      description:
        "Search the repository's code for a term (GitHub code search; matches on the default branch only). Returns matching file paths and snippets.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "Search terms; GitHub qualifiers like `path:src` or `language:ts` are allowed"
          ),
      }),
      execute: async ({ query }) => {
        const response = await githubGet(
          `/search/code?q=${encodeURIComponent(`${query} repo:${repo.repoName}`)}&per_page=20`,
          undefined,
          "application/vnd.github.text-match+json"
        );
        if (!response.ok) {
          return { error: await describeFailure(response, "search") };
        }
        const result = (await response.json()) as {
          total_count: number;
          items: {
            path: string;
            text_matches?: { fragment: string }[];
          }[];
        };
        return {
          totalCount: result.total_count,
          matches: result.items.map((item) => ({
            path: item.path,
            snippets: (item.text_matches ?? [])
              .slice(0, 3)
              .map((match) => match.fragment),
          })),
        };
      },
    }),

    listCommits: tool({
      description:
        "List the most recent commits on a branch, newest first, with author and message.",
      inputSchema: z.object({
        ref: refField,
        count: z.number().int().min(1).max(50).default(15),
      }),
      execute: async ({ ref, count }) => {
        const response = await githubGet(
          `/repos/${repo.repoName}/commits?sha=${encodeURIComponent(ref ?? defaultRef)}&per_page=${count}`
        );
        if (!response.ok) {
          return { error: await describeFailure(response, "commits") };
        }
        const commits = (await response.json()) as {
          sha: string;
          commit: {
            message: string;
            author: { name: string; date: string } | null;
          };
        }[];
        return {
          ref: ref ?? defaultRef,
          commits: commits.map((commit) => ({
            sha: commit.sha.slice(0, 7),
            message: commit.commit.message.split("\n")[0],
            author: commit.commit.author?.name,
            date: commit.commit.author?.date,
          })),
        };
      },
    }),

    getAgentChanges: tool({
      description: `The unified diff of everything the coding agent has changed in this chat so far, compared to ${repo.baseRef}. Use this for questions about what was changed, added, or removed.`,
      inputSchema: z.object({}),
      execute: async () => {
        if (!repo.branch && !repo.cursorAgentId) {
          return { error: "The coding agent hasn't made any changes yet" };
        }
        const diff = await loadAgentDiff(repo);
        if (diff instanceof Error) {
          return { error: diff.message };
        }
        return {
          base: repo.baseRef,
          branch: repo.branch,
          pullRequest: repo.prUrl,
          diff:
            diff.length > MAX_DIFF_CHARS
              ? `${diff.slice(0, MAX_DIFF_CHARS)}\n… (diff truncated)`
              : diff,
        };
      },
    }),
  };
}

/**
 * The agent's diff: the artifact it saves at the end of each run, else the
 * branch compared to its base on GitHub.
 */
async function loadAgentDiff(repo: RepoContext): Promise<string | Error> {
  if (repo.cursorAgentId) {
    const artifact = await downloadArtifact(
      repo.cursorAgentId,
      DIFF_ARTIFACT_PATH
    )
      .then((buffer) => buffer.toString("utf8"))
      .catch(() => null);
    if (artifact !== null) {
      return artifact;
    }
  }
  if (!repo.branch) {
    return new Error("The coding agent hasn't saved a diff yet");
  }
  const response = await githubGet(
    `/repos/${repo.repoName}/compare/${encodeURIComponent(repo.baseRef)}...${encodeURIComponent(repo.branch)}`,
    undefined,
    "application/vnd.github.diff"
  );
  if (!response.ok) {
    return new Error(await describeFailure(response, "diff"));
  }
  return response.text();
}

function encodePath(path: string) {
  return path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");
}

async function describeFailure(response: Response, what: string) {
  if (response.status === 404) {
    return `Not found (${what}). Check the path and ref; if the repository is private, the server needs GITHUB_TOKEN to read it.`;
  }
  if (response.status === 403 || response.status === 401) {
    return `GitHub refused to read the ${what} (HTTP ${response.status}); the server likely needs GITHUB_TOKEN for this repository.`;
  }
  return `GitHub returned HTTP ${response.status} for the ${what}`;
}
