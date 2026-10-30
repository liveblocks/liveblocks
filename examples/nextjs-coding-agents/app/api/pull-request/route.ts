import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getPullRequest,
  hasGitHubToken,
  parsePullRequestUrl,
} from "@/lib/server/github";
import type { PullRequestResponse } from "@/lib/types";

/**
 * Title and description of the pull request a chat opened, for the
 * Description tab in the side panel. Public repositories always resolve;
 * private ones need `GITHUB_TOKEN`.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url") ?? "";
  if (!parsePullRequestUrl(url)) {
    return NextResponse.json(
      {
        pullRequest: null,
        error: "Invalid pull request URL",
      } satisfies PullRequestResponse,
      { status: 400 }
    );
  }

  const pullRequest = await getPullRequest(url, session.accessToken).catch(
    () => null
  );

  if (!pullRequest) {
    return NextResponse.json({
      pullRequest: null,
      error: hasGitHubToken()
        ? "Couldn't load the pull request: GITHUB_TOKEN can't read this repository."
        : "Couldn't load the pull request. If the repository is private, set GITHUB_TOKEN on the server (see README).",
    } satisfies PullRequestResponse);
  }

  return NextResponse.json({
    pullRequest: {
      number: pullRequest.number,
      title: pullRequest.title,
      body: pullRequest.body,
      state: pullRequest.state,
      draft: pullRequest.draft,
      author: pullRequest.author
        ? {
            login: pullRequest.author.login,
            name: pullRequest.author.name,
            avatar: pullRequest.author.avatar,
          }
        : null,
      url: pullRequest.url,
      updatedAt: pullRequest.updatedAt,
    },
  } satisfies PullRequestResponse);
}
