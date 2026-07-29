import { describe, expect, test } from "vitest";

import { mergeStorageUpdates } from "../liveblocks-helpers";
import { LiveObject } from "../LiveObject";
import { LiveText } from "../LiveText";
import type { StorageUpdate, StorageUpdateSource } from "../StorageUpdates";

function liveObjectUpdate(source?: StorageUpdateSource): StorageUpdate {
  const update: StorageUpdate = {
    type: "LiveObject",
    node: new LiveObject({ a: 1 }),
    updates: { a: { type: "update" } },
  };
  if (source !== undefined) {
    update.source = source;
  }
  return update;
}

function liveTextUpdate(source?: StorageUpdateSource): StorageUpdate {
  const update: StorageUpdate = {
    type: "LiveText",
    node: new LiveText("hello"),
    version: 1,
    updates: [{ type: "insert", index: 5, text: "!" }],
  };
  if (source !== undefined) {
    update.source = source;
  }
  return update;
}

describe("mergeStorageUpdates source propagation", () => {
  test("both local mutation -> merged is local mutation", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate({ origin: "local", via: "edit" }),
      liveObjectUpdate({ origin: "local", via: "edit" })
    );
    expect(merged.source).toEqual({
      origin: "local",
      via: "edit",
    });
  });

  test("both remote -> merged is remote", () => {
    const merged = mergeStorageUpdates(
      liveTextUpdate({ origin: "remote" }),
      liveTextUpdate({ origin: "remote" })
    );
    expect(merged.source).toEqual({ origin: "remote" });
  });

  test("mixed local and remote -> merged is remote", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate({ origin: "local", via: "edit" }),
      liveObjectUpdate({ origin: "remote" })
    );
    expect(merged.source).toEqual({ origin: "remote" });
  });

  test("mixed local mutation and history -> merged is history", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate({ origin: "local", via: "edit" }),
      liveObjectUpdate({ origin: "local", via: "history", action: "undo" })
    );
    expect(merged.source).toEqual({
      origin: "local",
      via: "history",
      action: "undo",
    });
  });

  test("mixed history undo and redo -> merged keeps second action", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate({ origin: "local", via: "history", action: "undo" }),
      liveObjectUpdate({ origin: "local", via: "history", action: "redo" })
    );
    expect(merged.source).toEqual({
      origin: "local",
      via: "history",
      action: "redo",
    });
  });

  test("untagged + local mutation -> merged is local mutation", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate(),
      liveObjectUpdate({ origin: "local", via: "edit" })
    );
    expect(merged.source).toEqual({
      origin: "local",
      via: "edit",
    });
  });

  test("untagged + untagged -> merged stays untagged", () => {
    const merged = mergeStorageUpdates(liveObjectUpdate(), liveObjectUpdate());
    expect(merged.source).toBeUndefined();
  });

  test("undefined first preserves second source", () => {
    const merged = mergeStorageUpdates(
      undefined,
      liveTextUpdate({ origin: "remote" })
    );
    expect(merged.source).toEqual({ origin: "remote" });
  });
});
