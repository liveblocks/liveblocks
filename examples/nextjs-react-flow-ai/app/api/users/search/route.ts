import { getAllUsers } from "../../database";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text") ?? "";

  const filteredUserIds = getAllUsers()
    .filter((user) => user.info.name.toLowerCase().includes(text.toLowerCase()))
    .map((user) => user.id);

  return NextResponse.json(filteredUserIds);
}
