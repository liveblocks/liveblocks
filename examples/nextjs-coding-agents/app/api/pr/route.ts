import { NextResponse } from "next/server";
import type { PullRequestInfo } from "@/lib/types";

const PR_URL_PATTERN =
  /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/;

function githubHeaders(accept: string) {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "liveblocks-coding-agents-example",
  };
  // Optional: raises the GitHub rate limit and allows private repositories
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * Returns the pull request's details and unified diff so the client can
 * render it. The agent only stores the PR URL in feed metadata; everything
 * else is fetched live from GitHub, so the panel reflects later pushes.
 */
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const match = url.match(PR_URL_PATTERN);
  if (!match) {
    return NextResponse.json(
      { error: "Expected a GitHub pull request URL" },
      { status: 400 }
    );
  }

  const [, owner, repo, number] = match;
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;

  const [detailsResponse, diffResponse] = await Promise.all([
    fetch(endpoint, {
      headers: githubHeaders("application/vnd.github+json"),
      next: { revalidate: 30 },
    }),
    fetch(endpoint, {
      headers: githubHeaders("application/vnd.github.diff"),
      next: { revalidate: 30 },
    }),
  ]);

  if (!detailsResponse.ok || !diffResponse.ok) {
    const status = detailsResponse.ok
      ? diffResponse.status
      : detailsResponse.status;
    return NextResponse.json(
      {
        error:
          status === 404
            ? "Pull request not found"
            : status === 403 || status === 429
              ? "GitHub rate limit reached. Set GITHUB_TOKEN to raise it."
              : `GitHub responded with ${status}`,
      },
      { status: status === 404 ? 404 : 502 }
    );
  }

  const details = (await detailsResponse.json()) as {
    number: number;
    title: string;
    state: "open" | "closed";
    merged: boolean;
    html_url: string;
    additions: number;
    deletions: number;
    changed_files: number;
    head: { ref: string };
  };

  const info: PullRequestInfo = {
    url: details.html_url,
    number: details.number,
    title: details.title,
    state: details.merged ? "merged" : details.state,
    branch: details.head.ref,
    additions: details.additions,
    deletions: details.deletions,
    changedFiles: details.changed_files,
    diff: await diffResponse.text(),
  };

  return NextResponse.json(info);
}
