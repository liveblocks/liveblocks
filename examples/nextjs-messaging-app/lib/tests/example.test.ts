import { describe, expect, it } from "vitest";
import { createExampleRoomId } from "@/lib/example";

describe("createExampleRoomId", () => {
  it("builds the liveblocks example room id", () => {
    expect(createExampleRoomId("acme")).toBe(
      "liveblocks:examples:nextjs-messaging-app:acme"
    );
  });
});
