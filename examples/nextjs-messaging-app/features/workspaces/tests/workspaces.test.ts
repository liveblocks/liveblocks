import { describe, expect, it } from "vitest";
import { getWorkspace, WORKSPACES } from "@/features/workspaces";

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

describe("getWorkspace", () => {
  it("returns the matching workspace", () => {
    expect(getWorkspace("initech")).toEqual(WORKSPACES[1]);
  });

  it("falls back to the first workspace for unknown ids", () => {
    expect(getWorkspace("unknown")).toBe(WORKSPACES[0]);
  });
});
