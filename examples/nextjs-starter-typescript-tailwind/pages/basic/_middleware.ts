import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export function middleware (request: NextRequest) {
  // If room visited with no ID, add random ID
  if (request.nextUrl.pathname === "/basic") {
    const roomId = nanoid();
    return NextResponse.redirect(new URL(`/basic/${roomId}`, request.url));
  }
}
