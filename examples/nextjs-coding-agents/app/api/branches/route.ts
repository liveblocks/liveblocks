import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getRepoName, normalizeRepoUrl } from "@/lib/repo";
import { listBranches } from "@/lib/server/github";
import type { BranchesResponse } from "@/lib/types";

/**
 * Branches of a repository, for the branch dropdown on the new chat screen.
 * Read from GitHub with the signed-in person's token, so it works for any
 * repository they can see; the dropdown falls back to a typed branch name
 * when the repository can't be read.
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
      error: "Couldn't list branches for this repository",
    } satisfies BranchesResponse);
  }

  return NextResponse.json(result satisfies BranchesResponse);
}
