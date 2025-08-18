import { LiveList } from "@liveblocks/core";
import { Liveblocks } from "@liveblocks/node";
import { config } from "dotenv";
import { describe, test, expect, onTestFinished, vi } from "vitest";

config();

const client = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  // @ts-expect-error hidden config
  baseUrl:
    process.env.LIVEBLOCKS_BASE_URL ??
    process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL ??
    "https://api.liveblocks.io",
});

async function createRandomTestRoom(): Promise<string> {
  const randomRoomId = `node-package-e2e-${Math.random().toString(36).substring(2, 15)}`;

  // Register cleanup
  onTestFinished(async () => {
    await client.deleteStorageDocument(randomRoomId);
    await client.deleteRoom(randomRoomId);
  });

  await client.createRoom(
    randomRoomId,
    { defaultAccesses: ["room:write"] },
    { idempotent: true }
  );

  return randomRoomId;
}

describe("@liveblocks/node package e2e", () => {
  test("storage mutation should work in node environment", async () => {
    const roomId = await createRandomTestRoom();

    const fn = vi.fn();

    // Delete existing data in the room
    await client.mutateStorage(roomId, ({ root }) => {
      fn();
      root.delete("z");
    });
    expect(fn).toHaveBeenCalledTimes(1);
    fn.mockReset();

    // Ensure the initial state is empty
    expect(await client.getStorageDocument(roomId, "json")).toEqual({});

    // Add data to the room
    await client.mutateStorage(roomId, ({ root }) => {
      fn();
      root.set("z", new LiveList([1, 2, 3]));
    });
    expect(fn).toHaveBeenCalledTimes(1);
    fn.mockReset();

    // The GET endpoint should now also match this expected state
    expect(await client.getStorageDocument(roomId, "json")).toEqual({
      z: [1, 2, 3],
    });
  });

  test(
    "concurrent LiveList mutations should preserve all items",
    { timeout: 30000 },
    async () => {
      const numberOfItemsToInsert = 24;
      const roomId = await createRandomTestRoom();

      // Initialize storage with empty list
      await client.mutateStorage(roomId, ({ root }) => {
        root.set("list", new LiveList<string>([]));
      });

      // Verify base state is sound
      expect(await client.getStorageDocument(roomId, "json")).toEqual({
        list: [],
      });

      const localTally = new Set<number>();

      // Perform concurrent mutations
      async function pushOne(index: number): Promise<void> {
        await client.mutateStorage(roomId, ({ root }) => {
          localTally.add(index);
          const list = root.get("list") as LiveList<number>;
          list.push(index);
        });
      }

      const mutations = Array.from({ length: numberOfItemsToInsert }, (_, i) =>
        pushOne(i)
      );

      // Wait until all mutations have run
      await Promise.allSettled(mutations);

      // Verify results
      const actualList = (await client.getStorageDocument(roomId, "json"))
        .list as number[];
      const actualUniqueItems = new Set(actualList);

      // All items should be present in the list
      expect(localTally.size).toBe(numberOfItemsToInsert);
      expect(actualList.length).toBe(numberOfItemsToInsert);
      expect(actualUniqueItems.size).toBe(numberOfItemsToInsert);
    }
  );
});
