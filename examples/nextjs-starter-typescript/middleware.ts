import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

// Add id to pathname
export function middleware(request: NextRequest, response: NextResponse) {
  const roomId = nanoid();
  const url = request.nextUrl.clone();
  url.pathname = `${url.pathname}/${roomId}`;
  return NextResponse.redirect(url);
}

// Only run on "/basic" and "/canvas" pages that have no id
export const config = {
  matcher: ["/basic", "/canvas"],
};
