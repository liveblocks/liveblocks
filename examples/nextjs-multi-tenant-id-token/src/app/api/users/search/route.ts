import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "../../../../database";
import { createExampleUserId } from "../../../../example";

/**
 * Returns a list of user IDs from a partial search input
 * For `resolveMentionSuggestions` in liveblocks.config.ts
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");
  const exampleId = searchParams.get("exampleId");

  const users = await getUsers();

  const filteredUserIds = users
    .filter((user) =>
      text ? user.info.name.toLowerCase().includes(text.toLowerCase()) : true
    )
    .map((user) => createExampleUserId(undefined, exampleId, user.id));

  return NextResponse.json(filteredUserIds);
}
