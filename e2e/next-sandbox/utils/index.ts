/**
 * Generates a stable yet unique key to use for this test run, so it won't
 * conflict with other E2E tests running simultaneously.
 */
export function genRoomId(testTitle: string) {
  testTitle = testTitle.toLowerCase();
  if (testTitle.startsWith("e2e-")) {
    testTitle = testTitle.slice(4);
  }
  const prefix = process.env.NEXT_PUBLIC_GITHUB_SHA
    ? `${process.env.NEXT_PUBLIC_GITHUB_SHA.slice(0, 2)}`
    : "local";
  return `e2e-${prefix.toLowerCase()}-${testTitle
    .replaceAll(/[^\w_-]+/g, "-")
    .replaceAll(/--+/g, "-")}`;
}
