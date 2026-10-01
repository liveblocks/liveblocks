import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHANNELS,
  getWorkspace,
  WORKSPACES,
} from "@/lib/workspaces";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

describe("WORKSPACES", () => {
  it("has unique ids with names and theme colors", () => {
    const ids = WORKSPACES.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const workspace of WORKSPACES) {
      expect(workspace.name.length).toBeGreaterThan(0);
      expect(workspace.theme.sidebar).toMatch(HEX_COLOR);
      expect(workspace.theme.brand).toMatch(HEX_COLOR);
    }
  });
});

describe("DEFAULT_CHANNELS", () => {
  it("has five unique lowercase channel ids including general", () => {
    expect(DEFAULT_CHANNELS).toHaveLength(5);
    expect(new Set(DEFAULT_CHANNELS).size).toBe(5);
    for (const id of DEFAULT_CHANNELS) {
      expect(id).toBe(id.toLowerCase());
      expect(id).not.toMatch(/\s/);
    }
    expect(DEFAULT_CHANNELS).toContain("general");
  });
});

describe("getWorkspace", () => {
  it("returns the matching workspace", () => {
    expect(getWorkspace("initech")).toEqual(WORKSPACES[1]);
  });

  it("falls back to the first workspace for unknown ids", () => {
    expect(getWorkspace("unknown")).toBe(WORKSPACES[0]);
  });
});
