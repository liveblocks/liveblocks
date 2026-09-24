import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getRepoName, normalizeRepoUrl } from "@/lib/repo";
import { hasGitHubToken, listBranches } from "@/lib/server/github";
import type { BranchesResponse } from "@/lib/types";

/**
 * Branches of a repository, for the branch dropdown on the new chat screen.
 * Public repositories always resolve; private ones need `GITHUB_TOKEN`. The
 * dropdown falls back to a typed branch name when the list can't be read.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  const repoUrl = normalizeRepoUrl(
    request.nextUrl.searchParams.get("repo") ?? ""
  );
  if (!repoUrl) {
    return NextResponse.json(
      { branches: [], error: "Invalid repository" } satisfies BranchesResponse,
      { status: 400 }
    );
  }

  const result = await listBranches(
    getRepoName(repoUrl),
    session.accessToken
  ).catch(() => null);

  if (!result) {
    return NextResponse.json({
      branches: [],
      error: hasGitHubToken()
        ? "Couldn't list branches: GITHUB_TOKEN can't read this repository. Type a branch name instead."
        : "Couldn't list branches. If the repository is private, set GITHUB_TOKEN on the server (see README). You can still type a branch name.",
    } satisfies BranchesResponse);
  }

  return NextResponse.json(result satisfies BranchesResponse);
}
