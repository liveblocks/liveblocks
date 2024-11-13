import { getUsers } from "../../../database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds || !Array.isArray(userIds)) {
    return new NextResponse("Missing or invalid userIds", { status: 400 });
  }

  const users = await getUsers(userIds);
  const userInfos = users.map((user) => user?.info || null);
  return NextResponse.json(userInfos);
}
