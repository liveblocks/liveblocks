import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/request-user";

// The current user as Liveblocks sees them (id = email), or null
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  return NextResponse.json(user ?? null);
}
