import { NextRequest, NextResponse } from "next/server";
import { users } from "@/data/users";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");

  const filteredUserIds = users
    .filter((user) =>
      text ? user.name.toLowerCase().includes(text.toLowerCase()) : true
    )
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
