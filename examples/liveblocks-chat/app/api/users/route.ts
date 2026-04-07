import { NextRequest, NextResponse } from "next/server";
import { botUserInfo, getBotUserId } from "@/app/lib/users";

function syntheticUserInfo(userId: string) {
  return {
    name: `Guest ${userId.replace(/^user-/, "").slice(0, 7)}`,
    color: "#94a3b8",
    avatar: undefined as string | undefined,
  };
}

export async function GET(request: NextRequest) {
  const userIds = new URL(request.url).searchParams.getAll("userIds");
  if (!userIds.length) {
    return new NextResponse("Missing userIds", { status: 400 });
  }

  const botId = getBotUserId();
  const bot = botUserInfo();

  const users = userIds.map((id) =>
    id === botId ? bot : syntheticUserInfo(id)
  );

  return NextResponse.json(users);
}
