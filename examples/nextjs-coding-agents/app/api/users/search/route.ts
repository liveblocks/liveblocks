import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ALLOWED_ORG } from "@/lib/server/access";
import {
  getGitHubUsers,
  listOrgMembers,
  searchGitHubUsers,
  type GitHubUser,
} from "@/lib/server/github";

export type MentionSuggestion = {
  id: string;
  name: string;
  avatar: string;
};

/**
 * People who can be @mentioned, from a partial search input. With
 * GITHUB_ALLOWED_ORG set this is the organization's member list; otherwise
 * it falls back to GitHub user search.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return new NextResponse("Not signed in", { status: 401 });
  }

  const query = (new URL(request.url).searchParams.get("text") ?? "")
    .trim()
    .toLowerCase();

  let users: GitHubUser[];
  if (ALLOWED_ORG) {
    const members = await listOrgMembers(ALLOWED_ORG, session.accessToken);
    users = members.filter(
      (member) => !query || member.login.toLowerCase().includes(query)
    );
  } else if (query) {
    users = await searchGitHubUsers(query, session.accessToken);
  } else {
    users = [];
  }

  // Member listings only carry logins; fill in display names for the few
  // suggestions actually shown.
  const shown = users.slice(0, 8);
  const profiles = await getGitHubUsers(shown.map((user) => user.login));

  return NextResponse.json(
    shown.map(
      (user): MentionSuggestion => ({
        id: user.login,
        name: profiles.get(user.login)?.name ?? user.login,
        avatar: user.avatar,
      })
    )
  );
}
