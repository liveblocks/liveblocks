import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/database";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds || !Array.isArray(userIds)) {
    return new NextResponse("Missing or invalid userIds", { status: 400 });
  }

  return NextResponse.json(userIds.map((userId) => getUser(userId)));
}
