/**
 * Room tests that run against the real dev server. Covers history (undo/redo,
 * pause/resume, batch, clear) and storage subscription behavior.
 *
 * For connection state machine, auth, reconnection, and wire protocol tests,
 * see room.mockserver.test.ts.
 */
import { describe, expect, onTestFinished, test, vi } from "vitest";

import { LiveList } from "../crdts/LiveList";
import { LiveObject } from "../crdts/LiveObject";
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
    const { room, root } = await prepareIsolatedStorageTest<{ a: number }>({
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
    const { room, root } = await prepareIsolatedStorageTest<{ a: number }>({
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

    expect(root.toJSON()).toEqual({ a: 3 });
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

  test("history.disable() prevents mutations from appearing in undo stack", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    room.history.disable(() => {
      root.set("x", 1);
    });

    expect(root.get("x")).toBe(1);
    expect(room.history.canUndo()).toBe(false);
  });

  test("history.disable() returns the callback's return value", async () => {
    const { room } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    const result = room.history.disable(() => 42);

    expect(result).toBe(42);
  });

  test("history.disable() restores undo stack even if callback throws", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // First, create an undoable mutation so the stack is non-empty
    root.set("x", 1);
    expect(room.history.canUndo()).toBe(true);

    expect(() => {
      room.history.disable(() => {
        root.set("x", 2);
        throw new Error("boom");
      });
    }).toThrow("boom");

    // The mutation inside history.disable should not have added to the stack,
    // but the pre-existing undo entry should still be there
    expect(room.history.canUndo()).toBe(true);
    room.history.undo();
    expect(root.get("x")).toBe(0);
    expect(room.history.canUndo()).toBe(false);
  });

  test("background write via history.disable() does not interfere with user's undo history", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      userText: string;
      generatedSummary: string;
      status: string;
    }>({
      liveblocksType: "LiveObject",
      data: { userText: "", generatedSummary: "", status: "idle" },
    });

    // User types something (undoable)
    root.set("userText", "Hello world");

    // A background task writes back a generation result (not undoable),
    // using batch to group multiple mutations into a single message
    room.history.disable(() => {
      room.batch(() => {
        root.set("generatedSummary", "AI-generated summary");
        root.set("status", "done");
      });
    });

    expect(root.get("userText")).toBe("Hello world");
    expect(root.get("generatedSummary")).toBe("AI-generated summary");
    expect(root.get("status")).toBe("done");

    // Undo should only revert the user's typing, not the background write
    room.history.undo();
    expect(root.get("userText")).toBe("");
    expect(root.get("generatedSummary")).toBe("AI-generated summary");
    expect(root.get("status")).toBe("done");

    // Nothing left to undo
    expect(room.history.canUndo()).toBe(false);
  });

  test("disable() must wrap batch(), not the other way around", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      x: number;
      y: number;
    }>({
      liveblocksType: "LiveObject",
      data: { x: 0, y: 0 },
    });

    // batch(disable(...)) does NOT work — batch pushes to the undo stack
    // in its finally block, after disable has already restored the lengths
    room.batch(() => {
      room.history.disable(() => {
        root.set("x", 1);
        root.set("y", 1);
      });
    });

    // The mutations leak onto the undo stack
    expect(root.get("x")).toBe(1);
    expect(room.history.canUndo()).toBe(true);

    // disable(batch(...)) works correctly
    room.history.undo();
    room.history.disable(() => {
      room.batch(() => {
        root.set("x", 2);
        root.set("y", 2);
      });
    });

    expect(root.get("x")).toBe(2);
    expect(root.get("y")).toBe(2);
    expect(room.history.canUndo()).toBe(false);
  });

  test("nested history.disable() calls work correctly", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{
      x: number;
      y: number;
    }>({
      liveblocksType: "LiveObject",
      data: { x: 0, y: 0 },
    });

    room.history.disable(() => {
      root.set("x", 1);
      room.history.disable(() => {
        root.set("y", 2);
      });
    });

    expect(root.get("x")).toBe(1);
    expect(root.get("y")).toBe(2);
    expect(room.history.canUndo()).toBe(false);
  });

  test("history.disable() preserves the redo stack", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Create an undoable mutation, then undo it to populate the redo stack
    root.set("x", 1);
    room.history.undo();
    expect(root.get("x")).toBe(0);
    expect(room.history.canRedo()).toBe(true);

    // Mutation inside history.disable should not wipe the redo stack
    room.history.disable(() => {
      root.set("x", 99);
    });

    expect(root.get("x")).toBe(99);
    expect(room.history.canRedo()).toBe(true);
  });

  test("history.clear() inside history.disable() preserves original history", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Build up some undo/redo state
    root.set("x", 1);
    root.set("x", 2);
    room.history.undo();
    expect(root.get("x")).toBe(1);
    expect(room.history.canUndo()).toBe(true);
    expect(room.history.canRedo()).toBe(true);

    // Clear inside disable only affects the temporary stacks, not the real ones
    room.history.disable(() => {
      // Inside disable, the real stacks are swapped out — starts empty
      expect(room.history.canUndo()).toBe(false);
      expect(room.history.canRedo()).toBe(false);

      // Adding an entry makes canUndo true within the block
      root.set("x", 99);
      expect(room.history.canUndo()).toBe(true);

      // Clear wipes the temporary stacks
      room.history.clear();
      expect(room.history.canUndo()).toBe(false);
      expect(room.history.canRedo()).toBe(false);
    });

    // The mutation inside disable() still applies to storage
    expect(root.get("x")).toBe(99);
    // Original history is preserved — clear() only wiped the temporary stacks
    expect(room.history.canUndo()).toBe(true);
    expect(room.history.canRedo()).toBe(true);
  });

  test("undo() inside history.disable() does not affect original undo stack", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Build up 3 undo entries
    root.set("x", 1);
    root.set("x", 2);
    root.set("x", 3);

    // Calling undo() inside disable operates on the empty temp stack — no-ops
    room.history.disable(() => {
      room.history.undo();
      room.history.undo();
    });

    // All 3 original entries should still be intact
    expect(root.get("x")).toBe(3);
    for (let i = 3; i >= 1; i--) {
      expect(room.history.canUndo()).toBe(true);
      room.history.undo();
      expect(root.get("x")).toBe(i - 1);
    }
    expect(room.history.canUndo()).toBe(false);
  });

  test("undo() within history.disable() can revert block-local mutations", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Build up 3 undo entries
    root.set("x", 1);
    root.set("x", 2);
    root.set("x", 3);

    room.history.disable(() => {
      root.set("x", 4); // Add 4th item (on temp stack)
      room.history.undo(); // Undoes 4th item, back at 3
      root.set("x", 5); // Add new item
      root.set("x", 6); // Add another
    });

    // Mutations applied, but undo stack restored to original 3 entries
    expect(root.get("x")).toBe(6);
    room.history.undo();
    expect(root.get("x")).toBe(2);
    room.history.undo();
    expect(root.get("x")).toBe(1);
    room.history.undo();
    expect(root.get("x")).toBe(0);
    expect(room.history.canUndo()).toBe(false);
  });

  test("undo() after history.disable() undoes the last pre-disable mutation", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Build up 3 undo entries
    root.set("x", 1);
    root.set("x", 2);
    root.set("x", 3);

    room.history.disable(() => {
      root.set("x", 99); // Add another
    });

    // Mutations applied, but undo stack restored to original 3 entries
    expect(root.get("x")).toBe(99);
    room.history.undo();
    expect(root.get("x")).toBe(2);
    room.history.redo();
    expect(root.get("x")).toBe(99);
  });

  test("undo() inside history.disable() cannot go beyond the block start", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Build up 3 undo entries
    root.set("x", 1);
    root.set("x", 2);
    root.set("x", 3);

    room.history.disable(() => {
      root.set("x", 4); // Add 4th item (on temp stack)
      room.history.undo(); // Undoes 4th item, back at 3
      room.history.undo(); // No-op — temp stack is empty
    });

    // Original 3 entries intact — the second undo was a no-op
    expect(root.get("x")).toBe(3);
    room.history.undo();
    expect(root.get("x")).toBe(2);
    room.history.undo();
    expect(root.get("x")).toBe(1);
    room.history.undo();
    expect(root.get("x")).toBe(0);
    expect(room.history.canUndo()).toBe(false);
  });

  test("undo() beyond block start and back again inside history.disable()", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Build up 3 undo entries
    root.set("x", 1);
    root.set("x", 2);
    root.set("x", 3);

    room.history.disable(() => {
      root.set("x", 4); // Add 4th item (on temp stack)
      room.history.undo(); // Undoes 4th item, back at 3
      room.history.undo(); // No-op — temp stack empty
      room.history.undo(); // No-op — temp stack empty
      root.set("x", 5); // Add new item
    });

    // Mutation applied, original 3 entries intact
    expect(root.get("x")).toBe(5);
    room.history.undo();
    expect(root.get("x")).toBe(2);
    room.history.undo();
    expect(root.get("x")).toBe(1);
    room.history.undo();
    expect(root.get("x")).toBe(0);
    expect(room.history.canUndo()).toBe(false);
  });

  test("history.disable() at undo stack cap (50) does not evict oldest entry", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Fill the undo stack to the cap (50 entries)
    for (let i = 1; i <= 50; i++) {
      root.set("x", i);
    }
    expect(root.get("x")).toBe(50);

    // Mutate inside disable — should not shift the real undo stack
    room.history.disable(() => {
      root.set("x", 999);
    });

    expect(root.get("x")).toBe(999);

    // All 50 original undo entries should still be intact
    for (let i = 50; i >= 1; i--) {
      expect(room.history.canUndo()).toBe(true);
      room.history.undo();
      expect(root.get("x")).toBe(i - 1);
    }
    expect(room.history.canUndo()).toBe(false);
  });

  test("history.disable() never fires history subscription events", async () => {
    const { room, root } = await prepareIsolatedStorageTest<{ x: number }>({
      liveblocksType: "LiveObject",
      data: { x: 0 },
    });

    // Build up undo state so canUndo is true
    root.set("x", 1);

    const callback = vi.fn();
    onTestFinished(room.events.history.subscribe(callback));

    // Mutations inside disable should not produce any history notifications
    room.history.disable(() => {
      root.set("x", 2);
      root.set("x", 3);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
