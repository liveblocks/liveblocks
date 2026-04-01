import { USERS } from "@/database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userIds = searchParams.getAll("userIds");

  if (!userIds.length) {
    return NextResponse.json(
      { error: "Missing or invalid userIds" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    userIds.map(
      (userId) => USERS.find((u) => u.id === userId)?.info ?? null
    )
  );
}
