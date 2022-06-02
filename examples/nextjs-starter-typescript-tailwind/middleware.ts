/**
 * Middleware will be going through a breaking change soon, this is how it
 * will work after.
 * https://github.com/vercel/next.js/pull/37382

import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

// Only run on /room with no id
export const config = {
  matcher: '/room',
};

export function middleware(request: NextRequest, response: NextResponse) {
  // Add room id
  const roomId = nanoid();
  return NextResponse.redirect(new URL(`/room/${roomId}`, request.url));
}

 */

export default null
