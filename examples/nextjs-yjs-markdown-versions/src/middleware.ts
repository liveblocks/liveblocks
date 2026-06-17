export { auth as middleware } from "@/auth/manager";

export const config = {
  matcher: [
    // Match everything except: API routes, Next.js internals, favicon, and
    // the sign-in page (the only public route).
    "/((?!api|_next/static|_next/image|favicon.ico|signin).*)",
  ],
};
