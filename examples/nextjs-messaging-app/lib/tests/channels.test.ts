import { LiveList, LiveObject } from "@liveblocks/client";
import { describe, expect, it } from "vitest";
import type { Channel } from "@/lib/channels";

describe("Channel", () => {
  it("is the element type of the channels list in Storage", () => {
    const channel: Channel = { id: "general", name: "general" };
    const channels: Liveblocks["Storage"]["channels"] = new LiveList([
      new LiveObject<Channel>(channel),
    ]);
    expect(channels.get(0)?.get("name")).toBe("general");
  });
});
