import { describe, expect, it } from "vitest";
import { createInitialStorage, DEFAULT_CHANNELS } from "@/features/channels";

describe("DEFAULT_CHANNELS", () => {
  it("has five unique lowercase channel names including general", () => {
    expect(DEFAULT_CHANNELS).toHaveLength(5);
    expect(new Set(DEFAULT_CHANNELS).size).toBe(5);
    for (const name of DEFAULT_CHANNELS) {
      expect(name).toBe(name.toLowerCase());
      expect(name).not.toMatch(/\s/);
    }
    expect(DEFAULT_CHANNELS).toContain("general");
  });
});

describe("createInitialStorage", () => {
  it("creates one channel per default name with unique ids", () => {
    const storage = createInitialStorage();
    const channels = storage.channels.map((channel) => ({
      id: channel.get("id"),
      name: channel.get("name"),
    }));
    expect(channels.map((channel) => channel.name)).toEqual(DEFAULT_CHANNELS);
    expect(new Set(channels.map((channel) => channel.id)).size).toBe(
      DEFAULT_CHANNELS.length
    );
  });
});
