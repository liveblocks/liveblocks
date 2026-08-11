import type { YjsSyncStatus } from "@liveblocks/core";
import { describe, expect, test } from "vitest";

import { hasAnyContentSourceAnswered } from "../LiveblocksExtension";

function createProvider(status: YjsSyncStatus, synced: boolean) {
  return { getStatus: () => status, synced };
}

describe("hasAnyContentSourceAnswered", () => {
  test("is not answered while the first server response is pending", () => {
    expect(hasAnyContentSourceAnswered(createProvider("loading", false))).toBe(
      false
    );
  });

  test("is answered once the server has responded", () => {
    expect(
      hasAnyContentSourceAnswered(createProvider("synchronizing", false))
    ).toBe(true);
    expect(
      hasAnyContentSourceAnswered(createProvider("synchronized", true))
    ).toBe(true);
  });

  test("is answered by local persistence, which syncs before the status leaves loading", () => {
    expect(hasAnyContentSourceAnswered(createProvider("loading", true))).toBe(
      true
    );
  });
});
