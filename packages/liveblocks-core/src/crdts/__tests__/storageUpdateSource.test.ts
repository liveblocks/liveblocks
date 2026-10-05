import { describe, expect, test } from "vitest";

import { mergeStorageUpdates } from "../liveblocks-helpers";
import { LiveObject } from "../LiveObject";
import { LiveText } from "../LiveText";
import type { StorageUpdate, UpdateSource } from "../StorageUpdates";
import { toUpdateSource } from "../StorageUpdates";

function liveObjectUpdate(source: UpdateSource): StorageUpdate {
  return {
    type: "LiveObject",
    node: new LiveObject({ a: 1 }),
    updates: { a: { type: "update" } },
    source,
  };
}

function liveTextUpdate(source: UpdateSource): StorageUpdate {
  return {
    type: "LiveText",
    node: new LiveText("hello"),
    version: 1,
    updates: [{ type: "insert", index: 5, text: "!" }],
    source,
  };
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

  test("mixed remote and local -> merged is remote", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate({ origin: "remote" }),
      liveObjectUpdate({ origin: "local", via: "edit" })
    );
    expect(merged.source).toEqual({ origin: "remote" });
  });

  test("mixed local edit and undo -> merged is undo", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate({ origin: "local", via: "edit" }),
      liveObjectUpdate({ origin: "local", via: "undo" })
    );
    expect(merged.source).toEqual({
      origin: "local",
      via: "undo",
    });
  });

  test("mixed undo and local edit -> merged is undo", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate({ origin: "local", via: "undo" }),
      liveObjectUpdate({ origin: "local", via: "edit" })
    );
    expect(merged.source).toEqual({
      origin: "local",
      via: "undo",
    });
  });

  test("mixed undo and redo -> merged keeps second one", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate({ origin: "local", via: "undo" }),
      liveObjectUpdate({ origin: "local", via: "redo" })
    );
    expect(merged.source).toEqual({
      origin: "local",
      via: "redo",
    });
  });

  test("undefined first preserves second source", () => {
    const merged = mergeStorageUpdates(
      undefined,
      liveTextUpdate({ origin: "remote" })
    );
    expect(merged.source).toEqual({ origin: "remote" });
  });
});

describe("toUpdateSource", () => {
  test("drops the internal optimistic flag from local sources", () => {
    for (const via of ["edit", "undo", "redo"] as const) {
      for (const optimistic of [true, false]) {
        expect(toUpdateSource({ origin: "local", via, optimistic })).toEqual({
          origin: "local",
          via,
        });
      }
    }
  });

  test("leaves remote sources alone", () => {
    expect(toUpdateSource({ origin: "remote" })).toEqual({ origin: "remote" });
  });
});
