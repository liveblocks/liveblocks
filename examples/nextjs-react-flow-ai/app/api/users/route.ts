import {
  getAgentUserInfo,
  getUser,
  isAgentUserId,
} from "../database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds || !Array.isArray(userIds)) {
    return new NextResponse("Missing or invalid userIds", { status: 400 });
  }

  return NextResponse.json(
    userIds.map((userId) => {
      if (isAgentUserId(userId)) {
        return getAgentUserInfo(userId);
      }

      return getUser(userId)?.info ?? null;
    }),
    { status: 200 }
  );
}
