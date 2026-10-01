import { describe, expect, it } from "vitest";
import type { Channel } from "@/lib/channels";
import type { Conversation, Selection } from "@/lib/navigation";

const general: Channel = { id: "general", name: "general" };

function resolveSelection(
  selection: Selection | null,
  channels: Channel[]
): Conversation | undefined {
  if (selection?.type === "dm") {
    return undefined;
  }
  const channel =
    channels.find((c) => c.id === selection?.channelId) ?? channels[0];
  return channel ? { type: "channel", feedId: channel.id, channel } : undefined;
}

describe("navigation types", () => {
  it("narrow by discriminant", () => {
    const selection: Selection = { type: "channel", channelId: "general" };
    const conversation = resolveSelection(selection, [general]);
    expect(conversation).toEqual({
      type: "channel",
      feedId: "general",
      channel: general,
    });
  });

  it("a channel conversation's feed id is the channel id", () => {
    const conversation = resolveSelection(null, [general]);
    expect(conversation?.type === "channel" && conversation.feedId).toBe(
      general.id
    );
  });
});
