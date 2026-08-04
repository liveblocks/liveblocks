import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "../../../database";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text")?.toLowerCase() ?? "";

  return NextResponse.json(
    getUsers()
      .filter(({ info }) => info.name.toLowerCase().includes(text))
      .map(({ id }) => id),
    { status: 200 }
  );
}
