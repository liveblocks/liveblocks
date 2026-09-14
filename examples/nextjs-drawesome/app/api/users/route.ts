import { getUser } from "../../database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userIds = new URL(request.url).searchParams.getAll("userIds");

  if (!userIds.length) {
    return new NextResponse("Missing or invalid userIds", { status: 400 });
  }

  return NextResponse.json(
    userIds.map((userId) => getUser(userId)?.info ?? null),
    { status: 200 }
  );
}
