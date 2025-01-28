export function ensureNotServerSide(): void {
  // Error early if suspense is used in a server-side context
  if (typeof window === "undefined") {
    throw new Error(
      "You cannot use the Suspense version of Liveblocks hooks server side. Make sure to only call them client side by using a ClientSideSuspense wrapper.\nFor tips, see https://liveblocks.io/docs/api-reference/liveblocks-react#ClientSideSuspense"
    );
  }
}
