import { describe, expect, test } from "vitest";

import { kStorageUpdateSource } from "../../internal";
import { mergeStorageUpdates } from "../liveblocks-helpers";
import { LiveObject } from "../LiveObject";
import { LiveText } from "../LiveText";
import type {
  InternalStorageUpdate,
  StorageUpdate,
  StorageUpdateSource,
} from "../StorageUpdates";

function liveObjectUpdate(
  source?: StorageUpdateSource
): InternalStorageUpdate {
  const update: StorageUpdate = {
    type: "LiveObject",
    node: new LiveObject({ a: 1 }),
    updates: { a: { type: "update" } },
  };
  if (source !== undefined) {
    (update as { [kStorageUpdateSource]?: StorageUpdateSource })[
      kStorageUpdateSource
    ] = source;
  }
  return update as InternalStorageUpdate;
}

function liveTextUpdate(source?: StorageUpdateSource): InternalStorageUpdate {
  const update: StorageUpdate = {
    type: "LiveText",
    node: new LiveText("hello"),
    version: 1,
    updates: [{ type: "insert", index: 5, text: "!" }],
  };
  if (source !== undefined) {
    (update as { [kStorageUpdateSource]?: StorageUpdateSource })[
      kStorageUpdateSource
    ] = source;
  }
  return update as InternalStorageUpdate;
}

describe("mergeStorageUpdates source propagation", () => {
  test("both local -> merged is local", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate("local"),
      liveObjectUpdate("local")
    );
    expect((merged as InternalStorageUpdate)[kStorageUpdateSource]).toBe(
      "local"
    );
  });

  test("both remote -> merged is remote", () => {
    const merged = mergeStorageUpdates(
      liveTextUpdate("remote"),
      liveTextUpdate("remote")
    );
    expect((merged as InternalStorageUpdate)[kStorageUpdateSource]).toBe(
      "remote"
    );
  });

  test("mixed local and remote -> merged is remote", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate("local"),
      liveObjectUpdate("remote")
    );
    expect((merged as InternalStorageUpdate)[kStorageUpdateSource]).toBe(
      "remote"
    );
  });

  test("untagged + local -> merged is local", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate(),
      liveObjectUpdate("local")
    );
    expect((merged as InternalStorageUpdate)[kStorageUpdateSource]).toBe(
      "local"
    );
  });

  test("untagged + untagged -> merged stays untagged", () => {
    const merged = mergeStorageUpdates(
      liveObjectUpdate(),
      liveObjectUpdate()
    );
    expect(
      (merged as InternalStorageUpdate)[kStorageUpdateSource]
    ).toBeUndefined();
  });

  test("undefined first preserves second source", () => {
    const merged = mergeStorageUpdates(undefined, liveTextUpdate("remote"));
    expect((merged as InternalStorageUpdate)[kStorageUpdateSource]).toBe(
      "remote"
    );
  });
});
