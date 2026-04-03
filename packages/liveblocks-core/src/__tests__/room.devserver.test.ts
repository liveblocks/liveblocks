/**
 * Room tests that run against the real dev server. Covers history (undo/redo,
 * pause/resume, batch, clear) and storage subscription behavior.
 *
 * For connection state machine, auth, reconnection, and wire protocol tests,
 * see room.mockserver.test.ts.
 */
import { describe, expect, onTestFinished, test } from "vitest";

import { LiveList } from "../crdts/LiveList";
import { LiveObject } from "../crdts/LiveObject";
import { kInternal } from "../internal";
import { nn } from "../lib/assert";
import { prepareIsolatedStorageTest } from "./_devserver";
import type { JsonStorageUpdate } from "./_updatesUtils";
import {
  listUpdate,
  listUpdateInsert,
  listUpdateSet,
  serializeUpdateToJson,
} from "./_updatesUtils";

describe("room (dev server)", () => {
  test("pausing history twice is a no-op", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      items: LiveList<LiveObject<Record<string, number>>>;
    }>({
      liveblocksType: "LiveObject",
      data: {
        items: {
          liveblocksType: "LiveList",
          data: [{ liveblocksType: "LiveObject", data: {} }],
        },
      },
    });

    const items = root.get("items");

    room.history.pause();
    nn(items.get(0)).set("a", 1);
    room.history.pause(); // Pausing again should be a no-op!
    nn(items.get(0)).set("b", 2);
    room.history.pause(); // Pausing again should be a no-op!
    room.history.resume();
    room.history.resume(); // Resuming again should also be a no-op!

    expect(items.toJSON()).toEqual([{ a: 1, b: 2 }]);
    expect(room.history.canUndo()).toBe(true);
    expect(room.history.canRedo()).toBe(false);
    room.history.undo();

    expect(items.toJSON()).toEqual([{}]);
    expect(room.history.canUndo()).toBe(false);
    expect(room.history.canRedo()).toBe(true);
    room.history.redo();

    expect(items.toJSON()).toEqual([{ a: 1, b: 2 }]);
    expect(room.history.canUndo()).toBe(true);
    expect(room.history.canRedo()).toBe(false);
  });

  test("undo redo batch", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      items: LiveList<LiveObject<Record<string, number>>>;
    }>({
      liveblocksType: "LiveObject",
      data: {
        items: {
          liveblocksType: "LiveList",
          data: [{ liveblocksType: "LiveObject", data: {} }],
        },
      },
    });

    const receivedUpdates: JsonStorageUpdate[][] = [];
    onTestFinished(
      room.subscribe(
        root,
        (updates) => receivedUpdates.push(updates.map(serializeUpdateToJson)),
        { isDeep: true }
      )
    );

    const items = root.get("items");
    room.batch(() => {
      nn(items.get(0)).set("a", 1);
      items.set(0, new LiveObject({ a: 2 }));
    });

    expect(items.toJSON()).toEqual([{ a: 2 }]);
    room.history.undo();

    expect(items.toJSON()).toEqual([{}]);
    room.history.redo();

    expect(items.toJSON()).toEqual([{ a: 2 }]);
    expect(receivedUpdates).toEqual([
      [listUpdate([{ a: 2 }], [listUpdateSet(0, { a: 2 })])],
      [listUpdate([{}], [listUpdateSet(0, {})])],
      [listUpdate([{ a: 2 }], [listUpdateSet(0, { a: 2 })])],
    ]);
  });

  test("canUndo / canRedo", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      a: number;
    }>({
      liveblocksType: "LiveObject",
      data: { a: 1 },
    });

    expect(room.history.canUndo()).toBe(false);
    expect(room.history.canRedo()).toBe(false);

    root.set("a", 2);

    expect(room.history.canUndo()).toBe(true);

    room.history.undo();

    expect(room.history.canRedo()).toBe(true);
  });

  test("clearing undo/redo stack", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      a: number;
    }>({
      liveblocksType: "LiveObject",
      data: { a: 1 },
    });

    expect(room.history.canUndo()).toBe(false);
    expect(room.history.canRedo()).toBe(false);

    root.set("a", 2);
    root.set("a", 3);
    root.set("a", 4);
    room.history.undo();

    expect(room.history.canUndo()).toBe(true);
    expect(room.history.canRedo()).toBe(true);

    room.history.clear();
    expect(room.history.canUndo()).toBe(false);
    expect(room.history.canRedo()).toBe(false);

    room.history.undo(); // won't do anything now

    expect(root.toObject()).toEqual({ a: 3 });
  });

  describe("subscription", () => {
    test("batch without operations should not add an item to the undo stack", async () => {
      const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
        a: number;
      }>({
        liveblocksType: "LiveObject",
        data: { a: 1 },
      });

      root.set("a", 2);

      // Batch without operations on storage or presence
      room.batch(() => {});

      expectStorage({ a: 2 });

      room.history.undo();

      expectStorage({ a: 1 });
    });

    test("batch storage with changes from server", async () => {
      const { room, root, expectStorage } = await prepareIsolatedStorageTest<{
        items: LiveList<string>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          items: { liveblocksType: "LiveList", data: [] },
        },
      });

      const items = root.get("items");

      room.batch(() => {
        items.push("A");
        items.push("B");
        items.push("C");
      });

      expectStorage({
        items: ["A", "B", "C"],
      });

      room.history.undo();

      expectStorage({
        items: [],
      });

      room.history.redo();

      expectStorage({
        items: ["A", "B", "C"],
      });
    });

    test("nested storage updates", async () => {
      const { room, root } = await prepareIsolatedStorageTest<{
        items: LiveList<LiveObject<{ names: LiveList<string> }>>;
      }>({
        liveblocksType: "LiveObject",
        data: {
          items: {
            liveblocksType: "LiveList",
            data: [
              {
                liveblocksType: "LiveObject",
                data: {
                  names: { liveblocksType: "LiveList", data: [] },
                },
              },
            ],
          },
        },
      });

      const jsonUpdates: JsonStorageUpdate[][] = [];

      onTestFinished(
        room.events.storageBatch.subscribe((updates) => {
          jsonUpdates.push(updates.map(serializeUpdateToJson));
        })
      );

      room.batch(() => {
        const items = root.get("items");
        items.insert(new LiveObject({ names: new LiveList(["John Doe"]) }), 0);
        items.get(1)?.get("names").push("Jane Doe");
        items.push(new LiveObject({ names: new LiveList(["James Doe"]) }));
      });

      expect(jsonUpdates).toEqual([
        [
          listUpdate(
            [
              { names: ["John Doe"] },
              { names: ["Jane Doe"] },
              { names: ["James Doe"] },
            ],
            [
              listUpdateInsert(0, { names: ["John Doe"] }),
              listUpdateInsert(2, { names: ["James Doe"] }),
            ]
          ),
          listUpdate(["Jane Doe"], [listUpdateInsert(0, "Jane Doe")]),
        ],
      ]);
    });
  });

  test("withoutHistory prevents mutations from appearing in undo stack", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      x: number;
    }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    room.history[kInternal].withoutHistory(() => {
      root.set("x", 1);
    });

    expect(root.get("x")).toBe(1);
    expect(room.history.canUndo()).toBe(false);
  });

  test("withoutHistory returns the callback's return value", async () => {
    const { room } = await prepareIsolatedStorageTest<{
      x: number;
    }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    const result = room.history[kInternal].withoutHistory(() => 42);

    expect(result).toBe(42);
  });

  test("withoutHistory restores undo stack even if callback throws", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      x: number;
    }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // First, create an undoable mutation so the stack is non-empty
    root.set("x", 1);
    expect(room.history.canUndo()).toBe(true);

    expect(() => {
      room.history[kInternal].withoutHistory(() => {
        root.set("x", 2);
        throw new Error("boom");
      });
    }).toThrow("boom");

    // The mutation inside withoutHistory should not have added to the stack,
    // but the pre-existing undo entry should still be there
    expect(room.history.canUndo()).toBe(true);
    room.history.undo();
    expect(root.get("x")).toBe(0);
    expect(room.history.canUndo()).toBe(false);
  });

  test("withoutHistory preserves the redo stack", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      x: number;
    }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Create an undoable mutation, then undo it to populate the redo stack
    root.set("x", 1);
    room.history.undo();
    expect(root.get("x")).toBe(0);
    expect(room.history.canRedo()).toBe(true);

    // Mutation inside withoutHistory should not wipe the redo stack
    room.history[kInternal].withoutHistory(() => {
      root.set("x", 99);
    });

    expect(root.get("x")).toBe(99);
    expect(room.history.canRedo()).toBe(true);
  });
});
